import { Factory } from "fishery"
import { faker } from "@faker-js/faker"

import Application from "@/models/application"

const applicationFactory = Factory.define<Application>(({ sequence }) => {
  return {
    id: sequence,
    studentId: faker.number.int(), // TODO: replace with association id
    academicYearId: faker.number.int(), // TODO: replace with association id
    isSpouseStudyCsl: faker.datatype.boolean(),
    isSpouseStudyBus: faker.datatype.boolean(),
    isCorrespondence: faker.datatype.boolean(),
    isCoopPaid: faker.datatype.boolean(),
    isDisabled: faker.datatype.boolean(),
    isMinority: faker.datatype.boolean(),
    isTwoResidence: faker.datatype.boolean(),
    isMoving: faker.datatype.boolean(),
    prestudyOwnHome: faker.datatype.boolean(),
    prestudyBus: faker.datatype.boolean(),
    studyOwnHome: faker.datatype.boolean(),
    studyBus: faker.datatype.boolean(),
    isPartOfFt: faker.datatype.boolean(),
    studyLivingWSpouse: faker.datatype.boolean(),
    prestudyLivingWSpouse: faker.datatype.boolean(),
    isPreviousCslft: faker.datatype.boolean(),
    isPreviousCslpt: faker.datatype.boolean(),
    excludeFromCount: faker.datatype.boolean(),
    isPermDisabled: faker.datatype.boolean(),
    creditChkPassed: faker.datatype.boolean(),
    creditChkAppComp: faker.datatype.boolean(),
    taxes1NotFiled: faker.datatype.boolean(),
    taxes2NotFiled: faker.datatype.boolean(),
    taxes1Verified: faker.datatype.boolean(),
    taxes2Verified: faker.datatype.boolean(),
    appliedOtherFunding: faker.datatype.boolean(),
    hasConsentToShareData: faker.datatype.boolean(),
    permanentDisability: faker.datatype.boolean(),
    persOrProlongDisability: faker.datatype.boolean(),
    requiresCreditCheck: faker.datatype.boolean(),
    seen: faker.datatype.boolean(),
    isPersistDisabled: faker.datatype.boolean(),
    isChequesToInstitution: faker.datatype.boolean(),
  }
})

export default applicationFactory
