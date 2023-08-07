import knex, { Knex } from "knex"
import camelcaseKeys from "camelcase-keys"
import { snakeCase } from "lodash"

import { DB_CONFIG } from "@/config"

const db = knex({
  client: DB_CONFIG.client,
  connection: DB_CONFIG.connection,
  postProcessResponse: (result, queryContext) => {
    if (Array.isArray(result)) {
      // For SELECT queries
      return result.map((row) => camelcaseKeys(row, { deep: true }))
    } else {
      // for INSERT/UPDATE/DELETE queries
      return camelcaseKeys(result, { deep: true })
    }
  },
  wrapIdentifier: (value, origImpl, queryContext) => origImpl(snakeCase(value)),
})

const dbWithSchema: Knex = new Proxy(db, {
  apply: (target, thisArg, argumentsList) => {
    return target(...argumentsList).withSchema(DB_CONFIG.defaultSchema)
  },
  get: (target, prop: keyof Knex) => {
    if (typeof target[prop] === "function") {
      return (...args: any[]) => target[prop](...args).withSchema(DB_CONFIG.defaultSchema)
    }
    return target[prop]
  },
})

export default dbWithSchema
