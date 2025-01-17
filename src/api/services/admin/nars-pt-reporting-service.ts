import { DB_CONFIG } from "@/config";
import { calculateFamilySize } from "./nars-v17-2-reporting-service";
import knex from "knex";
import { isEmpty } from "lodash";
import moment from "moment";

const db = knex(DB_CONFIG);

const CSLFT_REQUEST_TYPE_ID = 4;

const CSGTU_REQUEST_TYPE_ID = 28;
const CSGD_REQUEST_TYPE_ID = 29;
const CSGDSE_REQUEST_TYPE_ID = 30;
const CSFTDEP_REQUEST_TYPE_ID = 32;
const CSGFT_REQUEST_TYPE_ID = 35;

export class NarsPTReportingService {
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
    //this.allApplications = await db("narsv17base_pt").where({ academic_year_id: 2022 }); //.where({ id: 31665 });

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
     application.courses_per_week, application.spouse_ln150_income,
    application.is_spouse_study_csl, application.spouse_study_emp_status_id, application.is_minority, application.is_disabled,
    application.program_year_total, application.program_year,  application.prestudy_city_id, application.study_city_id, application.is_perm_disabled, 
    application.permanent_disability, application.pers_or_prolong_disability, application.is_persist_disabled, 
    application.tuition_estimate_amount, application.percent_of_full_time,
    assessment.*, d.disbursed, parent_address.postal_code as parent_postal_code,
    funding_request.is_csg_only, funding_request.is_csl_full_amount    
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
      funding_request.request_type_id = 5
      and application.academic_year_id = ${this.year}`);

    for (let student of this.allApplications) {
      let rows = await this.makeRows(student);
      this.reportData.push(...rows);
    }

    return this.reportData;
  }

  async makeRows(app: any): Promise<Row[]> {
    let result = new Array<Row>();

    //console.log("APPP", app);

    let family_size = 0;
    let depchild_to_11_and_dis_12over = 0;
    let depchild_12over_ndis_andothdep = 0;
    let hasDependents = "N";

    let cat_code = app.csl_classification == 3 ? "1" : app.csl_classification == 4 ? "2" : 3;

    let res_postal = app.primary_postal_code ? app.primary_postal_code.replace(" ", "").replace("-", "") : "XXXXXX";

    let program_type =
      app.program_id == 6 ? 5 : app.program_id == 5 ? 4 : app.program_id == 4 ? 3 : app.program_id == 3 ? 2 : 1;

    let app_status = [7, 40].includes(app.funding_request_status_id)
      ? "A"
      : app.funding_request_status_id == 4
      ? "R"
      : "P";

    let appId = await db("sfa.funding_request").where({ id: app.funding_request_id }).select("application_id").first();
    let csl_pt = 0;
    let csg_pt = 0;
    let csg_ptdep = 0;
    let csg_d = 0;
    let csg_dse = 0;

    let provGrants = 0;

    let stud_sp_cost_computers = 0;
    let stud_sp_cost_other = 10 * app.courses_per_week * (Math.min(52, app.study_weeks) ?? 1);

    let family = await calculateFamilySize(
      app.csl_classification,
      appId?.application_id ?? 0,
      !isEmpty(app.parent1_sin),
      !isEmpty(app.parent2_sin)
    );

    family_size = family.family_size;

    if (appId) {
      let applicationId = appId.application_id;
      let deps = await db("sfa.dependent")
        .innerJoin("sfa.dependent_eligibility", "dependent.id", "dependent_eligibility.dependent_id")
        .where({ application_id: applicationId, is_csl_eligible: true });

      //let parentDeps = await db("sfa.parent_dependent").where({ application_id: applicationId, is_eligible: true });
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

      // Married or single parent
      if (cat_code == 1 || cat_code == 2) {
        depchild_12over_ndis_andothdep = deps.length - depCounts;
      }
      // Dependent or no dependents
      else {
        family_size = 1;
        depchild_to_11_and_dis_12over = 0;
        depchild_12over_ndis_andothdep = 0;
      }

      let otherFunds = await db("sfa.funding_request")
        .where({ application_id: applicationId })
        .join("sfa.disbursement", "disbursement.funding_request_id", "funding_request.id")
        .select("request_type_id")
        .groupBy("request_type_id")
        .sum("disbursed_amount as disbursed_amount");

      let ptLoan = otherFunds.find((f) => f.request_type_id == 5);
      let ptGrant = otherFunds.find((f) => f.request_type_id == 31);
      let ptDepGrant = otherFunds.find((f) => f.request_type_id == 33);
      let disGrant = otherFunds.find((f) => f.request_type_id == 29);
      let disSEGrant = otherFunds.find((f) => f.request_type_id == 30);

      if (ptLoan) csl_pt = Math.ceil(ptLoan.disbursed_amount);
      if (ptGrant) csg_pt = Math.ceil(ptGrant.disbursed_amount);
      if (ptDepGrant) csg_ptdep = Math.ceil(ptDepGrant.disbursed_amount);
      if (disGrant) csg_d = Math.ceil(disGrant.disbursed_amount);
      if (disSEGrant) csg_dse = Math.ceil(disSEGrant.disbursed_amount);

      let provGr = otherFunds.filter((f) => [1, 2, 3].includes(f.request_type_id));

      provGrants = provGr.map((f) => f.disbursed_amount).reduce((a, f) => a + f, 0);

      let expenses = await db("sfa.expense").where({ application_id: applicationId });

      let compExp = expenses.find((e) => e.category_id == 14);

      if (compExp) stud_sp_cost_computers = Math.ceil(compExp.amount);
    } else {
      console.log("NO APP");
    }

    let row = new Row();
    row.push(new Column("loanyear", `${this.year}${this.year + 1}`, " ", 8));
    row.push(new Column("prov_issue", "YT", " ", 2));
    row.push(new Column("app_number", `${app.id}`, "0", 8));
    row.push(new Column("version_num", `1`, "0", 2));
    row.push(new Column("app_status", app_status, " ", 1));

    row.push(new Column("assess_date", moment.utc(app.assessed_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("reasess_indicator", app.assessment_type_id == 1 ? "0" : "4", " ", 1));
    row.push(new Column("csl_pt_auth_date", moment.utc(app.assessed_date).format("YYYYMMDD"), " ", 8));

    row.push(new Column("sin", app.sin, " ", 9));
    row.push(new Column("dob", moment.utc(app.birth_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("sex_code", app.sex_id == 1 ? "M" : app.sex_id == 2 ? "F" : "U", " ", 1));
    row.push(new Column("cat_code", cat_code, " ", 1));
    row.push(new Column("disab_flag", app.is_perm_disabled ? "1" : app.is_disabled ? "2" : "0", " ", 1));
    row.push(new Column("disab_sr_status", app.is_disabled && !app.is_perm_disabled ? "Y" : "N", " ", 1));

    row.push(new Column("family_size", family_size, " ", 2));
    row.push(new Column("dep_under12_or_disabled", depchild_to_11_and_dis_12over, " ", 1));
    row.push(new Column("depchild_12over_ndis_andOthDep", depchild_12over_ndis_andothdep, " ", 1));

    row.push(new Column("res_postal", res_postal, " ", 6));

    row.push(new Column("ei_code", app.institution_code, " ", 4));
    row.push(new Column("pos", app.field_program_code, " ", 2));
    row.push(new Column("pos2", "", " ", 25)); // send blank
    row.push(new Column("program_type", program_type, " ", 1));
    row.push(new Column("pscd", moment.utc(app.classes_start_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("psed", moment.utc(app.classes_end_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("perc_full_course_load", app.percent_of_full_time ?? 60, "0", 2));
    row.push(new Column("nr_of_courses", app.courses_per_week, "0", 1));
    row.push(new Column("early_withdrawal_ind", `0`, " ", 1)); //always send 0

    row.push(new Column("stud_gross_annual_inc", parseInt(app.student_ln150_income ?? 0), "0", 6));
    row.push(new Column("stud_gross_annual_inc_reassess", "", "0", 6)); // always blank
    row.push(
      new Column(
        "spouse_gross_annual_inc",
        app.spouse_ln150_income ? parseInt(app.spouse_ln150_income ?? 0) : "",
        "0",
        6
      )
    );
    row.push(new Column("spouse_gross_annual_inc_reassess", "", "0", 6)); // always blank
    row.push(
      new Column(
        "family_income",
        parseInt(app.student_ln150_income ?? 0) + parseInt(app.spouse_ln150_income ?? 0),
        "0",
        6
      )
    ); // always blank

    row.push(new Column("stud_sp_cost_tuition", app.tuition_estimate, "0", 5));
    row.push(new Column("stud_sp_cost_allow_book", Math.min(2700, Math.ceil(app.books_supplies_cost)), "0", 5));
    row.push(new Column("stud_sp_cost_allow_child", Math.ceil(app.day_care_actual * app.study_months), "0", 5));
    row.push(new Column("local_transport_allow", app.p_trans_month * app.study_months, "0", 5)); // not sure
    row.push(new Column("miscellaneous_allow", stud_sp_cost_other, "0", 5)); // catch-all bucket

    row.push(new Column("csl_pt_amt", csl_pt || 0, "0", 5)); // sum of loan disbursements for this assessment
    row.push(new Column("psl_pt_amt", "", "0", 5)); // always 0
    row.push(new Column("principal_outstanding", app.outstanding_cslpt_amount ?? "", "0", 5));

    row.push(new Column("csg_pt_studies", csg_pt, "0", 5));
    row.push(new Column("csg_ptdep", csg_ptdep, "0", 5));
    row.push(new Column("csg_d", csg_d, "0", 5));
    row.push(new Column("csg_dse", csg_dse, "0", 5));

    row.push(new Column("psg_pt_amt", provGrants, "0", 6));

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
