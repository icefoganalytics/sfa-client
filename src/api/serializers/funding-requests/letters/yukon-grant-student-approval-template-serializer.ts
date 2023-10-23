import { isArray, isEmpty, isNil, sortBy } from "lodash"

import Application from "@/models/application"
import FundingRequest from "@/models/funding-request"
import Person from "@/models/person"
import PersonAddress from "@/models/person-address"
import User from "@/models/user"
import AddressType from "@/models/address-type"

export default class YukonGrantStudentApprovalTemplateSerializer {
  #fundingRequest: FundingRequest
  #signingOfficer: User

  constructor({
    fundingRequest,
    signingOfficer,
  }: {
    fundingRequest: FundingRequest
    signingOfficer: User
  }) {
    this.#fundingRequest = fundingRequest
    this.#signingOfficer = signingOfficer
  }

  static prepare({
    fundingRequest,
    signingOfficer,
  }: {
    fundingRequest: FundingRequest
    signingOfficer: User
  }) {
    const serializer = new YukonGrantStudentApprovalTemplateSerializer({
      fundingRequest,
      signingOfficer,
    })
    return serializer.prepare()
  }

  prepare() {
    const application = this.#fundingRequest.application
    if (application === undefined)
      throw new Error(
        "Could not prepare template data as application is missing from funding request."
      )

    const person = application?.student?.person
    if (person === undefined)
      throw new Error("Could not prepare template data as person is missing from student.")
    if (isNil(person.firstName))
      throw new Error("Could not prepare template data as firstName is missing from person.")
    if (isNil(person.lastName))
      throw new Error("Could not prepare template data as lastName is missing from person.")

    const primaryAddress = this.#preparePrimaryAddress(application, person)
    if (isNil(primaryAddress.address1))
      throw new Error("Could not prepare template data as address1 is missing from primaryAddress.")
    if (isNil(primaryAddress.postalCode))
      throw new Error(
        "Could not prepare template data as postalCode is missing from primaryAddress."
      )

    const city = primaryAddress.city
    if (city === undefined)
      throw new Error("Could not prepare template data as city is missing from primary address.")

    const province = primaryAddress.province
    if (province === undefined)
      throw new Error(
        "Could not prepare template data as province is missing from primary address."
      )

    const country = primaryAddress.country
    if (country === undefined)
      throw new Error("Could not prepare template data as country is missing from primary address.")

    const studyArea = application.studyArea
    if (studyArea === undefined)
      throw new Error("Could not prepare template data as study area is missing from application.")

    if (isNil(application.classesStartDate))
      throw new Error(
        "Could not prepare template data as classesStartDate is missing from application."
      )
    if (isNil(application.classesEndDate))
      throw new Error(
        "Could not prepare template data as classesEndDate is missing from application."
      )

    const serializedAssessments = this.#prepareAssessments(this.#fundingRequest)
    const institutionName = this.#prepareInstitutionName(application)
    const serializedDisbursements = this.#prepareDisbursements(this.#fundingRequest)

    return {
      currentDate: new Date(),
      recipient: {
        firstName: person.firstName,
        initials: person.initials,
        lastName: person.lastName,
        address1: primaryAddress.address1,
        address2: primaryAddress.address2,
        city: city.description,
        province: province.description,
        country: country.description,
        postalCode: primaryAddress.postalCode,
      },
      program: {
        name: studyArea.description,
        startDate: application.classesStartDate,
        endDate: application.classesEndDate,
        institutionName,
      },
      assessments: serializedAssessments,
      disbursements: serializedDisbursements,
      studentFinancialAssistanceOfficer: this.#signingOfficer,
    }
  }

  #prepareAssessments(
    fundingRequest: FundingRequest
  ): {
    assessedDate: Date
    startDate: Date
    endDate: Date
    approvalWeeks: number
    ratePerWeekInCents: number
    travelAndAirFairCostInCents: number
  }[] {
    const assessments = this.#fundingRequest.assessments
    if (isNil(assessments) || isEmpty(assessments)) return []

    const sortedAssessments = sortBy(assessments, ["assessedDate"]).reverse()

    const serializedAssessments = sortedAssessments.map((assessment) => {
      if (isNil(assessment.assessedDate))
        throw new Error(
          "Could not prepare template data as assessedDate is missing from assessment."
        )
      if (isNil(assessment.classesStartDate))
        throw new Error(
          "Could not prepare template data as classesStartDate is missing from assessement."
        )
      if (isNil(assessment.classesEndDate))
        throw new Error(
          "Could not prepare template data as classesEndDate is missing from assessement."
        )
      if (isNil(assessment.weeksAllowed))
        throw new Error(
          "Could not prepare template data as weeksAllowed is missing from assessment."
        )

      if (isNil(assessment.weeklyAmount))
        throw new Error(
          "Could not prepare template data as assessement weekly amount is missing from assessment."
        )
      const ratePerWeekInCents = assessment.weeklyAmount * 100

      if (isNil(assessment.airfareAmount))
        throw new Error(
          "Could not prepare template data as assessement airfaire amount is missing."
        )
      if (isNil(assessment.travelAllowance))
        throw new Error(
          "Could not prepare template data as assessement travel allowance is missing."
        )
      const travelAndAirFairCostInCents =
        (assessment.airfareAmount + assessment.travelAllowance) * 100

      return {
        assessedDate: assessment.assessedDate,
        startDate: assessment.classesStartDate,
        endDate: assessment.classesEndDate,
        approvalWeeks: assessment.weeksAllowed,
        ratePerWeekInCents,
        travelAndAirFairCostInCents,
      }
    })

    return serializedAssessments
  }

  // CONSIDER: Generalizing this function, as it used in several serializers.
  // It might even work as model method?
  #preparePrimaryAddress(application: Application, person: Person): PersonAddress {
    let primaryAddress = application?.primaryAddress

    if (primaryAddress === undefined) {
      const personAddresses = person.personAddresses
      if (
        personAddresses === undefined ||
        (isArray(personAddresses) && personAddresses.length === 0)
      ) {
        throw new Error(
          "Could not prepare template data as application primaryAddress is missing and person has no addresses."
        )
      }

      const firstChoice = personAddresses?.find(
        (address) => address.addressTypeId === AddressType.Types.MAILING
      )
      const secondChoice = personAddresses?.find(
        (address) => address.addressTypeId === AddressType.Types.HOME
      )
      const thirdChoice = personAddresses?.find(
        (address) => address.addressTypeId === AddressType.Types.SCHOOL
      )
      const fourthChoice = personAddresses?.find(
        (address) => address.addressTypeId === AddressType.Types.PARENT
      )
      const fifthChoice = personAddresses[0]

      primaryAddress = firstChoice || secondChoice || thirdChoice || fourthChoice || fifthChoice
    }

    return primaryAddress
  }

  #prepareDisbursements(fundingRequest: FundingRequest) {
    const disbursements = fundingRequest.disbursements
    if (isNil(disbursements) || isEmpty(disbursements)) return []

    return disbursements.map((disbursement) => {
      if (disbursement.disbursedAmount === undefined)
        throw new Error(
          "Could not prepare template data as disbursement disbursed amount is missing."
        )

      return {
        amountInCents: disbursement.disbursedAmount * 100,
        releaseDate: disbursement.dueDate,
      }
    })
  }

  #prepareInstitutionName(application: Application) {
    const institutionCampus = application.institutionCampus
    if (institutionCampus === undefined)
      throw new Error(
        "Could not prepare template data as institution campus is missing from application."
      )

    const institution = institutionCampus.institution
    if (institution === undefined)
      throw new Error(
        "Could not prepare template data as institution is missing from institution campus."
      )

    return (
      institution.name + (institutionCampus.name == "Primary" ? "" : ` - ${institutionCampus.name}`)
    )
  }
}
