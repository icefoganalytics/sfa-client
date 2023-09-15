export enum RequestTypes {
  STUDENT_TRAINING_ALLOWANCE = "Student Training Allowance",
  YUKON_GRANT = "Yukon Grant",
  YUKON_EXCELLENCE_AWARDS = "Yukon Excellence Awards",
  CANADA_STUDENT_LOAN_FULL_TIME = "Canada Student Financial Assistance Full-Time",
  CANADA_STUDENT_LOAN_PART_TIME = "Canada Student Financial Assistance Part-Time",
  CANADA_STUDY_GRANT_HIGH_NEED_DISABILITY = "Canada Study Grant High Need Disability",
  CANADIAN_ARMY_SCHOLARSHIP = "Canadian Army Scholarship",
  VANCOUVER_YUKONERS_ASSOCIATION_MEMORIAL_SCHOLARSHIP = "Vancouver Yukoners' Association Memorial Scholarship",
  NICHOLAS_JOHN_HARACH_SCHOLARSHIP = "Nicholas John Harach Scholarship",
  YUKON_ART_SOCIETY_SCHOLARSHIP = "Yukon Art Society Scholarship",
  YUKON_HUSKYS_CB_RADIO_CLUB_SCHOLARSHIP = "Yukon Huskys CB Radio Club Scholarship",
  CANADA_STUDY_GRANT_DISABILITY = "Canada Study Grant  Disability",
  CANADA_STUDY_GRANT_DOCTORAL = "Canada Study Grant  Doctoral",
  CANADA_STUDY_GRANT_DEPENDENTS = "Canada Study Grant  Dependents",
  CANADA_STUDY_GRANT_HIGH_NEED_PART_TIME = "Canada Study Grant  High Need Part Time",
  CANADA_MILLENNIUM_BURSARY = "Canada Millennium Bursary",
  LULU_FAIRBANKS_MEMORIAL_SCHOLARSHIP = "Lulu Fairbanks Memorial Scholarship",
  SFA_GENERAL = "SFA General",
  CANADA_ACCESS_GRANT_FOR_STUDENTS_WITH_PERMANENT_DISABILITIES = "Canada Access Grant for Students with Permanent Disabilities",
  CANADA_ACCESS_GRANT_FOR_STUDENTS_FROM_LOW_INCOME_FAMILIES = "Canada Access Grant for Students from Low Income Families",
  CANADA_MILLENNIUM_ACCESS_BURSARY = "Canada Millennium Access Bursary",
  CANADA_BASKETBALL_SCHOLARSHIP = "Canada Basketball Scholarship",
  TRANSITION_GRANT = "Transition Grant",
  GRANT_FOR_STUDENTS_FROM_LOW_INCOME_FAMILIES = "Grant for Students from Low-Income Families",
  GRANT_FOR_MATURE_LEARNERS_TOP_UP = "Grant for Mature Learners Top-Up",
  GRANT_FOR_STUDENTS_WITH_PERMANENT_DISABILITIES = "Grant for Students with Permanent Disabilities",
  GRANT_FOR_SERVICES_EQUIPMENT_FOR_PD_STUDENTS = "Grant for Services & Equipment for PD Students",
  GRANT_FOR_PART_TIME_STUDIES = "Grant for Part-time Studies",
  GRANT_FOR_STUDENTS_WITH_DEPENDENTS_FT = "Grant for Students with Dependents FT",
  GRANT_FOR_STUDENTS_WITH_DEPENDENTS_PT = "Grant for Students with Dependents PT",
  GRANT_FOR_STUDENTS_WITH_PERMANENT_DISABILITIES_PT = "Grant for Students with Permanent Disabilities PT",
  GRANT_FOR_FULL_TIME_STUDENTS = "Grant for Full-time Students",
  MATURE = "Mature",
}

interface RequestTypeRecord {
  id: number
  applicationTypeId?: number
  fundingGroupId?: number
  batchGroupId?: number
  description?: string
  scholarshipFlag: number
  applicationDeadline?: string
  regulation?: string
  programType?: string
  staticDescriptionFlag?: number
  financialCoding?: string
  t4aRequired: boolean
  csgOtherFlag?: number
  glBudget?: number
  autoAppear?: string
  showOnline: boolean
  shortName?: string
  helpUrl?: string
  helpText?: string
  isActive: boolean
}

interface RequestType extends RequestTypeRecord {}

class RequestType {
  constructor(params: RequestTypeRecord) {
    this.id = params.id
    this.applicationTypeId = params.applicationTypeId
    this.fundingGroupId = params.fundingGroupId
    this.batchGroupId = params.batchGroupId
    this.description = params.description
    this.scholarshipFlag = params.scholarshipFlag
    this.applicationDeadline = params.applicationDeadline
    this.regulation = params.regulation
    this.programType = params.programType
    this.staticDescriptionFlag = params.staticDescriptionFlag
    this.financialCoding = params.financialCoding
    this.t4aRequired = params.t4aRequired
    this.csgOtherFlag = params.csgOtherFlag
    this.glBudget = params.glBudget
    this.autoAppear = params.autoAppear
    this.showOnline = params.showOnline
    this.shortName = params.shortName
    this.helpUrl = params.helpUrl
    this.helpText = params.helpText
    this.isActive = params.isActive
  }

  // not in database
  static readonly Types = RequestTypes

  static isValidRequestType(requestType: any): requestType is RequestTypes {
    return Object.values(RequestTypes).includes(requestType)
  }
}

export default RequestType
