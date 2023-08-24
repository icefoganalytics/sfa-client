import { Factory } from "fishery"
import { faker } from "@faker-js/faker"

import FundingRequest from "@/models/funding-request"

import applicationFactory from "@/tests/factories/application-factory"

const fundingRequestFactory = Factory.define<FundingRequest>(({ sequence, associations }) => {
  const application = associations.application || applicationFactory.build()

  return {
    id: sequence,
    applicationId: application.id,
    application,
    isCsgOnly: faker.datatype.boolean(),
  }
})

export default fundingRequestFactory
