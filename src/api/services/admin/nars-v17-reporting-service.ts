import { DB_CONFIG } from "@/config";
import { weeksBetween } from "@/utils/date-utils";
import knex from "knex";
import { isEmpty, isUndefined, sortBy } from "lodash";
import moment from "moment";

const db = knex(DB_CONFIG);

const CSLFT_REQUEST_TYPE_ID = 4;

const CSGTU_REQUEST_TYPE_ID = 28;
const CSGD_REQUEST_TYPE_ID = 29;
const CSGDSE_REQUEST_TYPE_ID = 30;
const CSFTDEP_REQUEST_TYPE_ID = 32;
const CSGFT_REQUEST_TYPE_ID = 35;

export class NarsV17ReportingService {
  startDate: Date;
  endDate: Date;
  year: number;

  reportData = new Array<Row>();

  allApplications: any;
  allFundingRequests: any;
  allAssessments: any;
  allDisbursements: any;

  constructor({ startDate, endDate, year }: NarsV17ReportingServiceParams) {
    this.startDate = startDate;
    (this.endDate = endDate), (this.year = year);
  }

  async runReport() {
    //this.allApplications = await db("narsv17base").where({ academic_year_id: 2022 }); //.where({ id: 31665 });

    this.allApplications = await db.raw(`
    select 
    person.sex_id, person.sin, person.birth_date, 
    spouse_person.sin as spouse_sin, 
    parent1_person.sin as parent1_sin,
    parent2_person.sin as parent2_sin,
    person_address.postal_code as primary_postal_code,
    field_program.field_program_code,
    funding_request.status_id AS funding_request_status_id,
    
    student.indigenous_learner_id, student.high_school_left_year, student.high_school_left_month, student.is_crown_ward,
    application.academic_year_id, COALESCE(institution.federal_institution_code, institution_campus.federal_institution_code ) institution_code , application.aboriginal_status_id,  
    application.category_id, application.primary_address_id, application.parent1_net_income,
     application.parent2_net_income,  application.spouse_study_school_from, application.spouse_study_school_to,
    application.is_spouse_study_csl, application.spouse_study_emp_status_id, application.is_minority, application.is_disabled,
    application.program_year_total, application.program_year,  application.prestudy_city_id, application.study_city_id, application.is_perm_disabled, 
    application.permanent_disability, application.pers_or_prolong_disability, application.is_persist_disabled, 
    application.tuition_estimate_amount, application.percent_of_full_time,
    assessment.*, d.disbursed, parent_address.postal_code as parent_postal_code
    
    from sfa.student
      INNER JOIN sfa.person ON (student.person_id = person.id)
      INNER JOIN sfa.application ON (student.id = application.student_id)
      INNER JOIN sfa.funding_request ON (application.id = funding_request.application_id)
      INNER JOIN sfa.assessment ON (funding_request.id = assessment.funding_request_id)
      INNER JOIN sfa.institution_campus ON (application.institution_campus_id = institution_campus.id)
      INNER JOIN sfa.institution ON (institution.id = institution_campus.institution_id)
      LEFT JOIN sfa.person spouse_person ON (application.spouse_id = spouse_person.id)
      LEFT JOIN sfa.person parent1_person ON (application.parent1_id = parent1_person.id)
      LEFT JOIN sfa.person parent2_person ON (application.parent2_id = parent2_person.id)
      LEFT JOIN sfa.person_address ON (application.primary_address_id = person_address.id)
      LEFT JOIN (select person_id, MAX(postal_code) postal_code from sfa.person_address where address_type_id = 4 AND postal_code IS NOT NULL GROUP BY person_id) parent_address ON (person.id = parent_address.person_id )
      INNER JOIN sfa.study_area ON (application.study_area_id = study_area.id)
      INNER JOIN sfa.study_field ON (study_area.study_field_id = study_field.id)
      INNER JOIN sfa.field_program ON (application.program_id = field_program.program_id AND study_field.id = field_program.study_field_id)
      LEFT JOIN (SELECT SUM(COALESCE(paid_amount, 0)) disbursed, max(issue_date) issue_date, funding_request_id, assessment_id 
        FROM sfa.disbursement WHERE financial_batch_serial_no IS NOT NULL GROUP BY assessment_id, funding_request_id) d ON (funding_request.id = d.funding_request_id and assessment.id = d.assessment_id)
    where
      funding_request.request_type_id = 4`);

    /* let studentIds = this.allApplications.map((a: any) => a.studentId);
    let appIds = this.allApplications.map((a: any) => a.id);

    this.allFundingRequests = await db("fundingRequest").whereIn("applicationId", appIds);

    let fundingIds = this.allFundingRequests.map((f: any) => f.id);

    this.allAssessments = await db("assessment").whereIn("fundingRequestId", fundingIds);
    this.allDisbursements = await db("disbursement").whereIn("fundingRequestId", fundingIds);

    let students = await db("student")
      .innerJoin("person", "person.id", "student.personId")
      .whereIn("student.id", studentIds)
      .select("student.*", "person.firstName", "person.lastName", "person.sin", "person.sexId", "person.birthDate");
 */
    for (let student of this.allApplications) {
      let rows = await this.makeRows(student);
      this.reportData.push(...rows);
      break;
    }

    return this.reportData;
  }

  async makeRows(app: any): Promise<Row[]> {
    //let studentApps = this.allApplications.filter((a: any) => a.studentId == student.id);
    let result = new Array<Row>();

    // console.log("Making rows for", app);

    //for (let app of studentApps) {
    /* let appFundingRequests = this.allFundingRequests.filter((f: any) => (f.applicationId = app.id));

      for (let fr of appFundingRequests) {
        fr.assessments = this.allAssessments.filter((a: any) => a.fundingRequestId == fr.id);
        fr.disbursements = this.allDisbursements.filter((a: any) => a.fundingRequestId == fr.id);
      }

      let cslftRequest = appFundingRequests.find((f: any) => f.requestTypeId == CSLFT_REQUEST_TYPE_ID);
      let csgftRequest = appFundingRequests.find((f: any) => f.requestTypeId == CSGFT_REQUEST_TYPE_ID);
      let csgdRequest = appFundingRequests.find((f: any) => f.requestTypeId == CSGD_REQUEST_TYPE_ID);
      let csgdseRequest = appFundingRequests.find((f: any) => f.requestTypeId == CSGDSE_REQUEST_TYPE_ID);
      let csgtuRequest = appFundingRequests.find((f: any) => f.requestTypeId == CSGTU_REQUEST_TYPE_ID); */

    //console.log("cslftRequest", cslftRequest);
    //console.log("csgftRequest", csgftRequest);
    //console.log("csgdRequest", csgdRequest);
    //console.log("csgdseRequest", csgdseRequest);
    //console.log("csgtuRequest", csgtuRequest);

    //if (!cslftRequest) continue; // if the application doesn't have a CLSFT, it's not applicable

    //console.log(cslftRequest.assessments);

    //let cslftAssess = sortBy(cslftRequest.assessments, "assessedDate");
    //let latestAssess = cslftAssess;

    //let assessDate = cslftAssess;

    console.log("APPP", app);

    let num_dep_child_pse = 0;
    let depchild_to_11_and_dis_12over = 0;
    let depchild_12over_ndis_andothdep = 0;
    let hasDependents = "N";

    let allForFundingRequest = this.allApplications.filter((a: any) => a.funding_request_id == app.funding_request_id);

    //console.log("FU", allForFundingRequest);

    let cat_code =
      app.csl_classification == 3
        ? "1"
        : app.csl_classification == 4
        ? "2"
        : [2, 5].includes(app.csl_classification)
        ? 3
        : 4;

    let single_ind_stat_reas = app.csl_classification == 2 ? "1" : app.csl_classification == 5 ? "2" : "";
    let indigenous_flag = [2, 3, 5, 6, 7, 8, 9, 10].includes(app.aboriginal_status_id) ? "Y" : "N";
    let indigenous_cat =
      app.aboriginal_status_id == 6
        ? "5"
        : app.aboriginal_status_id == 7
        ? "4"
        : [9, 10].includes(app.aboriginal_status_id)
        ? "2"
        : [5, 8].includes(app.aboriginal_status_id)
        ? "1"
        : "0";

    let res_postal = app.primary_postal_code ? app.primary_postal_code.replace(" ", "").replace("-", "") : "XXXXXX";
    let parent_postal = app.parent_postal_code ? app.parent_postal_code.replace(" ", "").replace("-", "") : "XXXXXX";

    let program_type =
      app.program_id == 6 ? 5 : app.program_id == 5 ? 4 : app.program_id == 4 ? 3 : app.program_id == 3 ? 2 : 1;

    let date_left_high_school = moment(
      `${app.high_school_left_year}-${`${app.high_school_left_month}`.padStart(2, "0")}-01`
    ).format("YYYYMMDD");
    let app_status = [7, 40].includes(app.funding_request_status_id)
      ? "A"
      : app.funding_request_status_id == 4
      ? "R"
      : "P";

    let spouse_num_sp_weeks =
      app.spouse_study_school_from && app.spouse_study_school_to
        ? weeksBetween(app.spouse_study_school_from, app.spouse_study_school_to)
        : "";

    let stud_sp_cost_ret_transp = app.study_weeks <= 16 ? app.r_trans_16wk : app.r_trans_16wk * 2;

    let appId = await db("sfa.funding_request").where({ id: app.funding_request_id }).select("application_id").first();
    let csl_ft = 0;
    let csg_ft = 0;
    let csg_ftdep = 0;
    let csg_d = 0;
    let csg_dse = 0;
    let topup_fund = 0;

    let stud_sp_cost_computers = 0;

    if (appId) {
      let applicationId = appId.application_id;
      let deps = await db("sfa.dependent")
        .innerJoin("sfa.dependent_eligibility", "dependent.id", "dependent_eligibility.dependent_id")
        .where({ application_id: applicationId, is_csl_eligible: true });

      let parentDeps = await db("sfa.parent_dependent").where({ application_id: applicationId, is_eligible: true });
      let depCounts = 0;

      for (let dep of deps) {
        hasDependents = "Y";
        if (dep.is_disability) {
          depchild_to_11_and_dis_12over++;
          depCounts++;
        } else if (dep.birth_date) {
          let age = moment().diff(dep.birth_date, "years");
          if (age < 12) {
            depchild_to_11_and_dis_12over++;
            depCounts++;
          }
        }
      }

      // Dependent
      if (cat_code == 4) {
        num_dep_child_pse = 1 + parentDeps.filter((d) => d.is_attend_post_secondary).length;
        depchild_12over_ndis_andothdep = 1 + parentDeps.length - depCounts;
      } // Married or single parent
      else if (cat_code == 1 || cat_code == 2) {
        num_dep_child_pse = 1 + deps.filter((d) => d.is_post_secondary).length;
        depchild_12over_ndis_andothdep = deps.length - depCounts;
      }

      let otherFunds = await db("sfa.funding_request")
        .where({ application_id: applicationId })
        .join("sfa.disbursement", "disbursement.funding_request_id", "funding_request.id")
        .select("request_type_id")
        .groupBy("request_type_id")
        .sum("disbursed_amount as disbursed_amount");

      let ftLoan = otherFunds.find((f) => f.request_type_id == 4);
      let ftGrant = otherFunds.find((f) => f.request_type_id == 35);
      let ftDepGrant = otherFunds.find((f) => f.request_type_id == 32);
      let disGrant = otherFunds.find((f) => f.request_type_id == 29);
      let disSEGrant = otherFunds.find((f) => f.request_type_id == 30);
      let topup = otherFunds.find((f) => f.request_type_id == 28);

      if (ftLoan) csl_ft = Math.ceil(ftLoan.disbursed_amount);
      if (ftGrant) csg_ft = Math.ceil(ftGrant.disbursed_amount);
      if (ftDepGrant) csg_ftdep = Math.ceil(ftDepGrant.disbursed_amount);
      if (disGrant) csg_d = Math.ceil(disGrant.disbursed_amount);
      if (disSEGrant) csg_dse = Math.ceil(disSEGrant.disbursed_amount);
      if (topup) topup_fund = Math.ceil(topup.disbursed_amount);

      let expenses = await db("sfa.expense").where({ application_id: applicationId });

      let compExp = expenses.find((e) => e.category_id == 14);

      if (compExp) stud_sp_cost_computers = Math.ceil(compExp.amount);
    } else {
      console.log("NO APP");
    }

    // costs
    let totalCosts = 0;
    totalCosts += app.tuition_estimate;
    totalCosts += Math.min(2700, Math.ceil(app.books_supplies_cost));
    totalCosts += app.shelter_month * app.study_months;
    totalCosts += app.p_trans_month * app.study_months;
    totalCosts += stud_sp_cost_computers;
    totalCosts += app.x_trans_total;

    let row = new Row();
    row.push(new Column("loanyear", `${this.year}${this.year + 1}`, " ", 8));
    row.push(new Column("prov_issue", "YT", " ", 2));
    row.push(new Column("app_number", `${app.id}`, "0", 8));
    row.push(new Column("version_num", `1`, "0", 2));
    row.push(new Column("app_status", app_status, " ", 1));

    row.push(new Column("assess_date", moment.utc(app.assessed_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("reasess_indicator", app.assessment_type_id == 1 ? "0" : "4", " ", 1));
    row.push(new Column("csl_auth_date", moment.utc(app.assessed_date).format("YYYYMMDD"), " ", 8));

    row.push(new Column("sin", app.sin, " ", 9));
    row.push(new Column("dob", moment.utc(app.birth_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("sex_code", app.sex_id == 1 ? "M" : app.sex_id == 2 ? "F" : "U", " ", 1));
    row.push(new Column("cat_code", cat_code, " ", 1));
    row.push(new Column("single_ind_stat_reas", single_ind_stat_reas, " ", 1)); // 1-6
    row.push(new Column("social_assist_flag", "N", " ", 1)); // always N
    row.push(new Column("disab_flag", app.is_perm_disabled ? "1" : app.is_disabled ? "2" : "0", " ", 1));
    row.push(new Column("disab_sr_status", app.is_disabled && !app.is_perm_disabled ? "Y" : "N", " ", 1));
    row.push(new Column("indigenous_flag", indigenous_flag, " ", 1));
    row.push(new Column("indigenous_cat", indigenous_cat, " ", 1));
    row.push(new Column("visible_ind", ["True", true, 1].includes(app.is_minority) ? "Y" : "N", " ", 1));

    row.push(new Column("parent1_postal", parent_postal, "X", 6));

    row.push(new Column("parent2_postal", `XXXXXX`, "X", 6)); // always 6 X

    row.push(new Column("spouse_sin", app.spouse_sin ?? "", " ", 9));
    row.push(new Column("spouse_student", isUndefined(app.spouse_study_school_from) ? "N" : "Y", " ", 1));
    row.push(new Column("spouse_num_sp_weeks", spouse_num_sp_weeks, " ", 2));

    row.push(new Column("family_size", app.family_size, " ", 2));
    row.push(new Column("num_dep_child_pse", num_dep_child_pse, " ", 1));
    row.push(new Column("depchild_to_11_and_dis_12over", depchild_to_11_and_dis_12over, " ", 1));
    row.push(new Column("depchild_12over_ndis_andothdep", depchild_12over_ndis_andothdep, " ", 1));

    row.push(new Column("res_postal", res_postal, " ", 6));
    row.push(new Column("sp_away_home", app.study_accom_code == 1 ? "H" : "A", " ", 1));

    row.push(new Column("ei_code", app.institution_code, " ", 4));
    row.push(new Column("pos", app.field_program_code, "0", 2));
    row.push(new Column("pos2", "", " ", 25)); // send blank
    row.push(new Column("program_type", program_type, " ", 1));
    row.push(new Column("year_study", Math.min(app.program_year, 4), "0", 1));
    row.push(new Column("year_in_program", app.program_year, "0", 1));
    row.push(new Column("program_duration", app.program_year_total, "0", 1));
    row.push(new Column("pscd", moment.utc(app.classes_start_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("psed", moment.utc(app.classes_end_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("num_sp_assess_weeks", app.study_weeks, "0", 2));
    row.push(new Column("perc_full_course_load", app.percent_of_full_time ?? 60, "0", 3));
    row.push(new Column("early_withdrawal_ind", `0`, " ", 1)); //always send 0

    row.push(new Column("date_left_high_school", date_left_high_school, " ", 8));

    row.push(new Column("stud_sp_inc_targ_fund_total", `0`, "0", 6)); // always 0
    row.push(new Column("stud_sp_inc_mbsa_tot", `0`, " ", 6)); // dont know we have this info
    row.push(new Column("stud_gross_annual_inc", app.student_ln150_income, " ", 6));
    row.push(new Column("stud_gross_annual_inc_reassess", ``, " ", 6)); // always blank

    row.push(new Column("parent1_gross_ann_inc", app.parent1_income ?? "", " ", 6));
    row.push(new Column("parent1_net_ann_inc", app.parent1_income ?? "", " ", 6));
    row.push(new Column("parent1_cpp_cont", ` `, " ", 6)); // always blank
    row.push(new Column("parent1_ei_prem", ` `, " ", 6)); // always blank
    row.push(new Column("parent1_inc_tax_paid", app.parent1_tax_paid ?? "", "", 6));
    row.push(new Column("parent1_tot_tax_inc", ` `, " ", 6)); // always blank
    row.push(new Column("parent1_gross_ann_inc_reassess", ` `, " ", 6)); // always blank
    row.push(new Column("parent1_net_ann_inc_reassess", ` `, " ", 6)); // always blank

    row.push(new Column("parent2_gross_ann_inc", app.parent2_income ?? "", " ", 6));
    row.push(new Column("parent2_net_ann_inc", app.parent2_income ?? "", " ", 6));
    row.push(new Column("parent2_cpp_cont", ` `, " ", 6)); // always blank
    row.push(new Column("parent2_ei_prem", ` `, " ", 6)); // always blank
    row.push(new Column("parent2_inc_tax_paid", app.parent2_tax_paid ?? "", "", 6));
    row.push(new Column("parent2_tot_tax_inc", ` `, " ", 6)); // always blank
    row.push(new Column("parent2_gross_ann_inc_reassess", ` `, " ", 6)); // always blank
    row.push(new Column("parent2_net_ann_inc_reassess", ` `, " ", 6)); // always blank

    row.push(new Column("spouse_gross_annual_inc", app.spouse_gross_income ?? "", "0", 6));
    row.push(new Column("spouse_gross_annual_inc_reassess", ` `, " ", 6)); // always blank

    row.push(new Column("stud_cont_targfund", `0`, "0", 6)); // always 0
    row.push(new Column("stud_cont_bsa", `0`, "0", 6)); // don't know we have this
    row.push(new Column("fs_cont_amt", app.student_expected_contribution, "0", 6));
    row.push(new Column("parent_cont", `0`, "0", 6)); // always 0
    row.push(new Column("frspousal_cont_amt", `0`, "0", 6)); // always 0
    row.push(new Column("other_resources", `0`, "0", 6)); // always 0
    row.push(new Column("tot_ass_res", app.student_expected_contribution, "0", 6)); // total, but we only use 1 field

    row.push(new Column("fs_cont_exempt_indig", indigenous_flag, " ", 1));
    row.push(new Column("fs_cont_exempt_pd", app.is_disabled ? "Y" : "N", " ", 1));
    row.push(new Column("fs_cont_exempt_dependant", hasDependents, " ", 1));
    row.push(new Column("fs_cont_exempt_crown", app.student_contrib_exempt && app.is_crown_ward ? "Y" : "N", " ", 1));
    row.push(new Column("frspouse_cont_exempt_stud", spouse_num_sp_weeks ? "Y" : "N", " ", 1));
    row.push(new Column("frspouse_cont_exempt_ei", `N`, " ", 1)); // always N
    row.push(new Column("frspouse_cont_exempt_sa", `N`, " ", 1)); // always N
    row.push(new Column("frspouse_cont_exempt_db", `N`, " ", 1)); // always N

    row.push(new Column("fs_cont_review_flag", `N`, " ", 1)); // always N
    row.push(new Column("parental_cont_review_flag", `N`, " ", 1)); // always N
    row.push(new Column("frspouse_cont_review_flag", `N`, " ", 1)); // always N

    row.push(new Column("stud_sp_cost_living_allow", app.shelter_month * app.study_months, "0", 6));
    row.push(new Column("stud_sp_cost_tuition", app.tuition_estimate, "0", 6));
    row.push(new Column("stud_sp_cost_comp_fee", `0`, "0", 6)); // always 0
    row.push(new Column("stud_sp_cost_computers", stud_sp_cost_computers, "0", 6));
    row.push(new Column("stud_sp_cost_allow_book", Math.min(2700, Math.ceil(app.books_supplies_cost)), "0", 6));
    row.push(new Column("stud_sp_cost_allow_child", app.day_care_allowable, "0", 6));
    row.push(new Column("stud_sp_cost_ret_transp", stud_sp_cost_ret_transp, "0", 6));
    row.push(new Column("stud_sp_cost_other_trans", `0`, "0", 6)); // not sure
    row.push(new Column("stud_sp_cost_other", `999`, "0", 6)); // catch-all bucket
    row.push(new Column("tot_ass_cost", totalCosts, "0", 6));

    row.push(new Column("req_need", `999`, "0", 6));
    row.push(new Column("tot_calc_need", `999`, "0", 7));
    row.push(new Column("ass_csl_bef_overa", `999`, "0", 6));
    row.push(new Column("ass_psl_bef_overa", `0`, "0", 6)); // always 0
    row.push(new Column("csl_over_award_recovered", `999`, "0", 6));
    row.push(new Column("psl_over_award_recovered", `0`, "0", 6)); // always 0
    row.push(new Column("auth_csl_amt", csl_ft || 0, "0", 6));
    row.push(new Column("auth_psl_amt", `0`, "0", 6)); // always 0

    row.push(new Column("csg_ft", csg_ft, "0", 6));
    row.push(new Column("csg_ftdep", csg_ftdep, "0", 6));
    row.push(new Column("csg_d", csg_d, "0", 6));
    row.push(new Column("csg_dse", csg_dse, "0", 6));
    row.push(new Column("topup_fund", topup_fund, "0", 6));

    row.push(new Column("prov_grant_burs_schol_amt", `0`, "0", 6)); // not sure
    row.push(new Column("prov_unmet_need_grant_auth_amt", `0`, "0", 6)); // maybe Yukon Grant?
    row.push(new Column("other_prov_assist", `0`, "0", 6)); // always 0

    row.push(new Column("tot_assist", csl_ft + csg_ft + csg_ftdep + csg_d + csg_dse + topup_fund, "0", 6));
    row.push(new Column("unmet_need", `999`, "0", 7));

    //console.log(row.columns.length);
    //console.log(row.columns.reduce((a, r) => a + r.length, 0));

    result.push(row);
    //}

    return result;
  }
}

export interface NarsV17ReportingServiceParams {
  startDate: Date;
  endDate: Date;
  year: number;
}

export class Row {
  columns = new Array<Column>();

  push(column: Column) {
    this.columns.push(column);
  }

  toJson() {
    let output = {} as any;
    for (let col of this.columns) {
      output[col.field] = col.output;
    }
    return output;
  }

  toString() {
    let output = "";
    for (let col of this.columns) {
      output += col.toString();
    }
    return output;
  }

  toCsv() {
    let output = "";
    for (let col of this.columns) {
      output += col.toCsv();
    }
    return output;
  }
}

export class Column {
  readonly field: string;
  readonly rawValue: string;
  readonly length: number;
  output: string;

  constructor(field: string, value: string | number, fill: string, length: number) {
    this.field = field;
    this.rawValue = `${value}`.trim();
    this.length = length;
    //this.output = `${value}`;

    if (fill == "0") this.output = this.rawValue.padStart(length, fill).substring(0, length);
    else this.output = this.rawValue.padEnd(length, fill).substring(0, length);
  }

  toString() {
    return this.output;
  }
  toJson() {
    return { field: this.field, rawValue: this.rawValue };
  }
  toCsv() {
    return `${this.output},`;
  }
}
