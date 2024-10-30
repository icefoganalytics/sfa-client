import { DB_CONFIG } from "@/config";
import { weeksBetween } from "@/utils/date-utils";
import { application } from "express";
import knex from "knex";
import { isArray, isEmpty, isNumber, isUndefined } from "lodash";
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

    this.allApplications = await db.raw(`select person.sex_id, person.sin, person.birth_date, 
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
    assessment.*, d.disbursed, parent_address.postal_code as parent_postal_code,
    funding_request.is_csg_only, funding_request.is_csl_full_amount, funding_request.csl_request_amount    
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

    for (let student of this.allApplications) {
      let rows = await this.makeRows(student);
      this.reportData.push(...rows);
    }

    return this.reportData;
  }

  async makeRows(app: any): Promise<Row[]> {
    let result = new Array<Row>();

    let appId = await db("sfa.funding_request").where({ id: app.funding_request_id }).select("application_id").first();

    let family = await calculateFamilySize(
      app.csl_classification,
      appId?.application_id ?? 0,
      !isEmpty(app.parent1_sin),
      !isEmpty(app.parent2_sin)
    );

    let cat_code = family.narsCatCode;

    let single_ind_stat_reas = app.csl_classification == 2 ? "1" : app.csl_classification == 5 ? "2" : ".";
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
        : ".";

    let res_postal = "";

    if (app.primary_address_id && app.primary_postal_code) {
      res_postal = app.primary_postal_code.replace(" ", "").replace("-", "");

      if (app.primary_country_id && app.primary_country_id != 1) res_postal = "XXXXXX";
    } else {
      let homeAddress = await db("sfa.v_current_person_address")
        .where({
          person_id: app.person_id,
          address_type_id: 1,
        })
        .first();

      if (homeAddress) {
        res_postal = homeAddress.postal_code.replace(" ", "").replace("-", "");
        if (homeAddress.country != "Canada") res_postal = "XXXXXX";
      }
    }

    let parent_postal = app.parent_postal_code ? app.parent_postal_code.replace(" ", "").replace("-", "") : "";

    if (parent_postal && parent_postal.length > 0 && isNumber(parent_postal)) parent_postal = "XXXXXX";

    let program_type =
      app.program_id == 6 ? 5 : app.program_id == 5 ? 4 : app.program_id == 4 ? 3 : app.program_id == 3 ? 2 : 1;

    let date_left_high_school = moment(
      `${app.high_school_left_year}-${`${app.high_school_left_month ?? 6}`.padStart(2, "0")}-01`
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

    let spouse_student = cat_code == "1" && isNumber(spouse_num_sp_weeks) ? "Y" : "N";

    let stud_sp_cost_ret_transp = app.study_weeks <= 16 ? app.r_trans_16wk : app.r_trans_16wk * 2;

    let csl_ft = 0;
    let csg_ft = 0;
    let csg_ftdep = 0;
    let csg_d = 0;
    let csg_dse = 0;
    let topup_fund = 0;

    let provGrants = 0;

    let stud_sp_cost_living_allow = 0;
    let stud_sp_cost_computers = 0;
    let stud_sp_cost_other = 0;
    let stud_sp_inc_mbsa_tot = 0;
    let stud_cont_targfund = 0;

    if (appId) {
      let applicationId = appId.application_id;

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

      let provGr = otherFunds.filter((f) => [1, 2, 3].includes(f.request_type_id));
      provGrants = provGr.map((f) => f.disbursed_amount).reduce((a, f) => a + f, 0);

      let expenses = await db("sfa.expense").where({ application_id: applicationId });
      let compExp = expenses.find((e) => e.category_id == 14);
      if (compExp) stud_sp_cost_computers = Math.ceil(compExp.amount);

      let incomes = await db("sfa.income").where({ application_id: applicationId });
      let scholarshipIncome = incomes.filter((e) => e.income_type_id == 16); // Scholarships - Merit Based

      if (isArray(scholarshipIncome) && scholarshipIncome.length > 0)
        stud_sp_inc_mbsa_tot = scholarshipIncome
          .map((f: any) => f.amount ?? 0)
          .reduce((a: number, f: number) => a + f, 0);

      let targetedResourcesIncome = incomes.filter((e) => e.income_type_id == 3 || e.income_type_id == 10); // EI and HRDC
      if (isArray(targetedResourcesIncome) && targetedResourcesIncome.length > 0)
        stud_cont_targfund = targetedResourcesIncome
          .map((f: any) => f.amount ?? 0)
          .reduce((a: number, f: number) => a + f, 0);
    } else {
      console.log("NO APP");
    }

    // costs
    let totalCosts = 0;
    totalCosts += app.tuition_estimate;
    totalCosts += Math.min(2700, Math.ceil(app.books_supplies_cost));
    totalCosts += app.shelter_month * app.study_months;
    totalCosts += app.p_trans_month * app.study_months;
    totalCosts += Math.ceil(app.day_care_actual * app.study_months);
    totalCosts += stud_sp_cost_ret_transp;
    totalCosts += app.x_trans_total;
    totalCosts += app.relocation_total;

    stud_sp_cost_living_allow = app.shelter_month * app.study_months + app.p_trans_month * app.study_months;

    stud_sp_cost_other =
      (app.depend_food_allowable + app.depend_tran_allowable) * app.study_months + app.discretionary_cost_actual;

    totalCosts += stud_sp_cost_other;
    stud_sp_cost_other -= stud_sp_cost_computers;

    let req_need = app.csl_request_amount;
    let tot_ass_res = app.student_expected_contribution;

    if (app.is_csg_only) req_need = 0;
    else if (app.is_csl_full_amount) req_need = app.study_weeks * 210;

    let row = new Row();
    row.push(new Column("loanyear", `${this.year}${this.year + 1}`, " ", 8));
    row.push(new Column("prov_issue", "YT", " ", 2));
    row.push(new Column("app_number", `${app.id}`, "0", 8));
    row.push(new Column("version_num", app.assessment_type_id == 1 ? "1" : "2", "0", 2));
    row.push(new Column("app_status", app_status, " ", 1));

    row.push(new Column("assess_date", moment.utc(app.assessed_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("reasess_indicator", app.assessment_type_id == 1 ? "0" : "4", " ", 1));
    row.push(new Column("csl_auth_date", moment.utc(app.assessed_date).format("YYYYMMDD"), " ", 8));

    row.push(new Column("sin", app.sin, " ", 9));
    row.push(new Column("dob", moment.utc(app.birth_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("sex_code", app.sex_id == 1 ? "M" : app.sex_id == 2 ? "F" : "U", " ", 1));
    row.push(new Column("cat_code", family.narsCatCode, " ", 1));
    row.push(new Column("single_ind_stat_reas", single_ind_stat_reas, " ", 1)); // 1-6
    row.push(new Column("social_assist_flag", "N", " ", 1)); // always N
    row.push(new Column("disab_flag", app.is_perm_disabled ? "1" : app.is_persist_disabled ? "2" : "0", " ", 1));
    row.push(new Column("disab_sr_status", app.is_persist_disabled ? "Y" : "", " ", 1));
    row.push(new Column("indigenous_flag", indigenous_flag, " ", 1));
    row.push(new Column("indigenous_cat", indigenous_cat, " ", 1));
    row.push(new Column("visible_ind", ["True", true, 1].includes(app.is_minority) ? "Y" : "N", " ", 1));

    row.push(new Column("parent1_postal", (parent_postal ?? "").length > 5 ? parent_postal : "", " ", 6));

    row.push(new Column("parent2_postal", "", " ", 6)); // always 6 X

    row.push(new Column("spouse_sin", app.spouse_sin ?? ".", " ", 9));
    row.push(new Column("spouse_student", spouse_student, " ", 1));
    row.push(new Column("spouse_num_sp_weeks", spouse_num_sp_weeks, " ", 2));

    row.push(new Column("family_size", family.family_size, "0", 2));
    row.push(new Column("num_dep_child_pse", family.post_secondary, " ", 1));
    row.push(new Column("depchild_to_11_and_dis_12over", family.under12_or_disabled, " ", 1));
    row.push(new Column("depchild_12over_ndis_andothdep", family.over11, " ", 1));

    row.push(new Column("res_postal", res_postal, " ", 6));
    row.push(new Column("sp_away_home", app.study_accom_code == 1 ? "H" : "A", " ", 1));

    row.push(new Column("ei_code", app.institution_code, " ", 4));
    row.push(new Column("pos", app.field_program_code, " ", 2));
    row.push(new Column("pos2", "", " ", 25)); // send blank
    row.push(new Column("program_type", program_type, " ", 1));
    row.push(new Column("year_study", Math.min(app.program_year, 4), " ", 1));
    row.push(new Column("year_in_program", app.program_year, "1", 1));
    row.push(new Column("program_duration", app.program_year_total, "0", 1));
    row.push(new Column("pscd", moment.utc(app.classes_start_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("psed", moment.utc(app.classes_end_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("num_sp_assess_weeks", app.study_weeks ?? 1, "0", 2));
    row.push(new Column("perc_full_course_load", app.percent_of_full_time ?? 60, "0", 3));
    row.push(new Column("early_withdrawal_ind", `0`, " ", 1)); //always send 0

    row.push(new Column("date_left_high_school", date_left_high_school, " ", 8));

    row.push(new Column("stud_sp_inc_targ_fund_total", "0", "0", 6)); // always 0
    row.push(new Column("stud_sp_inc_mbsa_tot", stud_sp_inc_mbsa_tot, "0", 6)); // dont know we have this info
    row.push(new Column("stud_gross_annual_inc", app.student_ln150_income ?? 0, "0", 6));
    row.push(new Column("stud_gross_annual_inc_reassess", "", "0", 6)); // always blank

    row.push(new Column("parent1_gross_ann_inc", cat_code == "4" ? app.parent1_income ?? "" : "", "0", 6));
    row.push(new Column("parent1_net_ann_inc", cat_code == "4" ? app.parent1_income ?? "" : "", "0", 6));
    row.push(new Column("parent1_cpp_cont", "", "0", 6)); // always blank
    row.push(new Column("parent1_ei_prem", "", "0", 6)); // always blank
    row.push(new Column("parent1_inc_tax_paid", cat_code == "4" ? app.parent1_tax_paid ?? "" : "", "0", 6));
    row.push(new Column("parent1_tot_tax_inc", cat_code == "4" ? app.parent1_net_income ?? "" : "", "0", 6)); // always blank
    row.push(new Column("parent1_gross_ann_inc_reassess", "", "0", 6)); // always blank
    row.push(new Column("parent1_net_ann_inc_reassess", "", "0", 6)); // always blank

    row.push(new Column("parent2_gross_ann_inc", cat_code == "4" ? app.parent2_income ?? "" : "", "0", 6));
    row.push(new Column("parent2_net_ann_inc", cat_code == "4" ? app.parent2_income ?? "" : "", "0", 6));
    row.push(new Column("parent2_cpp_cont", "", "0", 6)); // always blank
    row.push(new Column("parent2_ei_prem", "", "0", 6)); // always blank
    row.push(new Column("parent2_inc_tax_paid", cat_code == "4" ? app.parent2_tax_paid ?? "" : "", "0", 6));
    row.push(new Column("parent2_tot_tax_inc", cat_code == "4" ? app.parent2_net_income ?? "" : "", "0", 6)); // always blank
    row.push(new Column("parent2_gross_ann_inc_reassess", "", "0", 6)); // always blank
    row.push(new Column("parent2_net_ann_inc_reassess", "", "0", 6)); // always blank

    row.push(new Column("spouse_gross_annual_inc", cat_code == "1" ? app.spouse_ln150_income ?? "" : "", "0", 6));
    row.push(new Column("spouse_gross_annual_inc_reassess", "", "0", 6)); // always blank

    row.push(new Column("stud_cont_targfund", stud_cont_targfund, "0", 6));
    row.push(new Column("stud_cont_bsa", Math.max(0, stud_sp_inc_mbsa_tot - 1800), "0", 6));
    row.push(new Column("fs_cont_amt", app.student_contribution ?? "0", "0", 6));
    row.push(new Column("parent_cont", app.parent_contribution_override ?? "0", "0", 6));
    row.push(new Column("frspousal_cont_amt", app.spouse_contribution ?? "0", "0", 6));
    row.push(new Column("other_resources", "0", "0", 6)); // always 0
    row.push(new Column("tot_ass_res", tot_ass_res, "0", 6)); // total, but we only use 1 field

    row.push(new Column("fs_cont_exempt_indig", indigenous_flag, " ", 1));
    row.push(new Column("fs_cont_exempt_pd", app.is_disabled ? "Y" : "N", " ", 1));
    row.push(new Column("fs_cont_exempt_dependant", family.total_dependants > 0 ? "Y" : "N", " ", 1));
    row.push(new Column("fs_cont_exempt_crown", app.student_contrib_exempt && app.is_crown_ward ? "Y" : "N", " ", 1));
    row.push(new Column("frspouse_cont_exempt_stud", spouse_num_sp_weeks ? "Y" : "N", " ", 1));
    row.push(new Column("frspouse_cont_exempt_ei", `N`, " ", 1)); // always N
    row.push(new Column("frspouse_cont_exempt_sa", `N`, " ", 1)); // always N
    row.push(new Column("frspouse_cont_exempt_db", `N`, " ", 1)); // always N

    row.push(new Column("fs_cont_review_flag", `N`, " ", 1)); // always N
    row.push(new Column("parental_cont_review_flag", `N`, " ", 1)); // always N
    row.push(new Column("frspouse_cont_review_flag", `N`, " ", 1)); // always N

    row.push(new Column("stud_sp_cost_living_allow", stud_sp_cost_living_allow, "0", 6));
    row.push(new Column("stud_sp_cost_tuition", app.tuition_estimate, "0", 6));
    row.push(new Column("stud_sp_cost_comp_fee", "0", "0", 6)); // always 0
    row.push(new Column("stud_sp_cost_computers", stud_sp_cost_computers, "0", 6));
    row.push(new Column("stud_sp_cost_allow_book", Math.min(2700, Math.ceil(app.books_supplies_cost)), "0", 6));
    row.push(new Column("stud_sp_cost_allow_child", Math.ceil(app.day_care_actual * app.study_months), "0", 6));
    row.push(new Column("stud_sp_cost_ret_transp", stud_sp_cost_ret_transp, "0", 6));
    row.push(new Column("stud_sp_cost_other_trans", app.x_trans_total + app.relocation_total, "0", 6));
    row.push(new Column("stud_sp_cost_other", stud_sp_cost_other, "0", 6)); // catch-all bucket
    row.push(new Column("tot_ass_cost", totalCosts, "0", 6));

    row.push(new Column("req_need", req_need, "0", 6)); // if maximum, costs minus resources, or 0 if grants only (multilples of 210/week)
    row.push(new Column("tot_calc_need", totalCosts - tot_ass_res, "+", 7)); // calculated need in award tab
    row.push(new Column("ass_csl_bef_overa", csl_ft || 0, "0", 6)); // sum of loan disbursements for this assessment
    row.push(new Column("ass_psl_bef_overa", "0", "0", 6)); // always 0
    row.push(new Column("csl_over_award_recovered", "0", "0", 6)); // this is complicated by the over award change reason, 0 for now
    row.push(new Column("psl_over_award_recovered", "0", "0", 6)); // always 0
    row.push(new Column("auth_csl_amt", csl_ft || 0, "0", 6));
    row.push(new Column("auth_psl_amt", "0", "0", 6)); // always 0

    row.push(new Column("csg_ft", csg_ft, "0", 6));
    row.push(new Column("csg_ftdep", csg_ftdep, "0", 6));
    row.push(new Column("csg_d", csg_d, "0", 6));
    row.push(new Column("csg_dse", csg_dse, "0", 6));
    row.push(new Column("topup_fund", topup_fund, "0", 6));

    row.push(new Column("prov_grant_burs_schol_amt", provGrants, "0", 6));
    row.push(new Column("prov_unmet_need_grant_auth_amt", "0", "0", 6)); // likely not relevant
    row.push(new Column("other_prov_assist", "0", "0", 6)); // always 0

    row.push(new Column("tot_assist", csl_ft + csg_ft + csg_ftdep + csg_d + csg_dse + topup_fund + provGrants, "0", 6));
    row.push(
      new Column(
        "unmet_need",
        totalCosts - tot_ass_res - (csl_ft + csg_ft + csg_ftdep + csg_d + csg_dse + topup_fund + provGrants) + csg_dse,
        "0",
        7
      )
    );

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

    if (fill == "+") this.output = "+" + this.rawValue.padStart(length - 1, "0").substring(0, length);
    else if (fill == "0")
      this.output =
        this.rawValue.length == 0
          ? ".".padEnd(length, " ").substring(0, length)
          : this.rawValue.padEnd(length, " ").substring(0, length);
    else if (fill == ".")
      this.output =
        this.rawValue.length == 0
          ? ".".padEnd(length, " ").substring(0, length)
          : this.rawValue.padEnd(length, " ").substring(0, length);
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

async function calculateFamilySize(
  classification: number,
  applicationId: number,
  hasParent1: boolean,
  hasParent2: boolean
): Promise<{
  family_size: number;
  total_dependants: number;
  csl_dependants: number;
  csg_dependants: number;
  sta_dependants: number;
  post_secondary: number;
  narsCatCode: string;
  under12_or_disabled: number;
  over11: number;
}> {
  let family = {
    family_size: 0,
    total_dependants: 0,
    csl_dependants: 0,
    csg_dependants: 0,
    sta_dependants: 0,
    post_secondary: 1,
    narsCatCode: "1",
    under12_or_disabled: 0,
    over11: 0,
  };

  // Single Dependent
  if (classification == 1) {
    family.narsCatCode = "4";
  }
  // Single Independent - 2 year workforce
  else if (classification == 2) {
    family.narsCatCode = "3";
  }
  // Married / Common Law
  else if (classification == 3) {
    family.narsCatCode = "1";
  } // Single Parent
  else if (classification == 4) {
    family.narsCatCode = "2";
  }
  // Single Independent - 4 year high school
  else if (classification == 5) {
    family.narsCatCode = "3";
  }

  // Married / Common Law or Single Parent
  if ([3, 4].includes(classification)) {
    let deps = await db("sfa.dependent")
      .innerJoin("sfa.dependent_eligibility", "dependent.id", "dependent_eligibility.dependent_id")
      .innerJoin("sfa.application", "application.id", "dependent_eligibility.application_id")
      .select("dependent.*", "dependent_eligibility.*")
      .select(
        db.raw(
          "(0 + FORMAT(COALESCE(application.classes_start_date, GETDATE()),'yyyyMMdd') - FORMAT(birth_date,'yyyyMMdd') ) / 10000 age"
        )
      )
      .where({ "dependent_eligibility.application_id": applicationId });

    family.csl_dependants = deps.filter((f: any) => f.is_csl_eligible).length;
    family.csg_dependants = deps.filter((f: any) => f.is_csg_eligible).length;
    family.sta_dependants = deps.filter((f: any) => f.is_sta_eligible).length;

    family.under12_or_disabled = deps.filter((f: any) => f.is_csl_eligible && (f.age < 11 || f.is_disability)).length;
    family.over11 = deps.filter((f: any) => f.is_csl_eligible && f.age >= 12).length;
    family.post_secondary = deps.filter((f: any) => f.is_post_secondary).length;

    family.family_size = classification == 3 ? 2 + family.csl_dependants : 1 + family.csl_dependants;
  }
  // Single Dependent
  else if (classification == 1) {
    let parentDeps = await db("sfa.parent_dependent")
      .innerJoin("sfa.application", "application.id", "parent_dependent.application_id")
      .select("parent_dependent.*")
      .select(
        db.raw(
          "(0 + FORMAT(COALESCE(application.classes_start_date, GETDATE()),'yyyyMMdd') - FORMAT(birth_date,'yyyyMMdd') ) / 10000 age"
        )
      )
      .where({ application_id: applicationId, is_eligible: true });

    family.total_dependants = 1 + parentDeps.length;
    family.csl_dependants = 1;

    family.post_secondary = parentDeps.filter((f: any) => f.is_attend_post_secondary).length + 1;
    family.family_size = 1 + parentDeps.length + (hasParent1 ? 1 : 0) + (hasParent2 ? 1 : 0);

    family.under12_or_disabled = parentDeps.filter(
      (f: any) => f.is_csl_eligible && (f.age < 11 || f.is_disabled)
    ).length;
    family.over11 = parentDeps.filter((f: any) => f.is_csl_eligible && f.age >= 12).length;
  } else {
    family.family_size = 1;
  }

  return family;
}
