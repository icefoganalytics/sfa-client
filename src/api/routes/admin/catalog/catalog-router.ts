import knex from "knex";
import express, { Request, Response } from "express";

import { DB_CONFIG } from "@/config";
import { RequireAdmin } from "@/routes/auth";
import { CatalogPolicy } from "./catalog-policy";

const db = knex(DB_CONFIG);
const policies = new CatalogPolicy();

export const catalogRouter = express.Router();
catalogRouter.use(RequireAdmin);

catalogRouter.get("/:table", async (req: Request, res: Response) => {
  const { table } = req.params;
  const policy = policies.get(table);

  if (!policy) return res.status(400).send("Catalog not available");

  let items = await db(policy.tableName).withSchema(policy.schema).orderBy(policy.idColumn);

  res.json({ data: items });
});

catalogRouter.post("/:table", async (req: Request, res: Response) => {
  const { table } = req.params;
  const policy = policies.get(table);

  if (!policy) return res.status(400).json({ data: "Catalog not available" });
  if (policy.readonly) return res.status(400).json({ data: "Catalog readonly" });

  try {
    await db(policy.tableName).withSchema(policy.schema).insert(req.body);
  } catch (e) {
    return res.status(400).json({ data: "Save failed: " + e });
  }

  res.json({ success: true });
});

catalogRouter.put("/:table/:id", async (req: Request, res: Response) => {
  const { table, id } = req.params;
  const policy = policies.get(table);

  if (!policy) return res.status(400).json({ data: "Catalog not available" });
  if (policy.readonly) return res.status(400).json({ data: "Catalog readonly" });

  try {
    await db(policy.tableName).withSchema(policy.schema).where({ id }).update(req.body);
  } catch (e) {
    return res.status(400).json({ data: "Save failed: " + e });
  }

  res.json({ success: true });
});

catalogRouter.delete("/:table/:id", async (req: Request, res: Response) => {});
