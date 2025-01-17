import { DB_CONFIG } from "@/config";
import { weeksBetween } from "@/utils/date-utils";
import knex from "knex";
import { isUndefined } from "lodash";
import moment from "moment";

const db = knex(DB_CONFIG);

const CSLFT_REQUEST_TYPE_ID = 4;

const CSGTU_REQUEST_TYPE_ID = 28;
const CSGD_REQUEST_TYPE_ID = 29;
const CSGDSE_REQUEST_TYPE_ID = 30;
const CSFTDEP_REQUEST_TYPE_ID = 32;
const CSGFT_REQUEST_TYPE_ID = 35;

export class NarsDisabilityRCLReportingService {
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
      person.sex_id, person.sin, person.birth_date, field_program.field_program_code, funding_request.status_id AS funding_request_status_id,
      application.academic_year_id,
      application.category_id, application.is_disabled,
      application.program_year_total, application.program_year, application.is_perm_disabled, 
      application.permanent_disability, application.pers_or_prolong_disability, application.is_persist_disabled, 
      application.percent_of_full_time, COALESCE(institution.federal_institution_code, institution_campus.federal_institution_code ) institution_code, 
      assessment.*, d.disbursed    
    from sfa.student
      INNER JOIN sfa.person ON (student.person_id = person.id)
      INNER JOIN sfa.application ON (student.id = application.student_id)
      INNER JOIN sfa.funding_request ON (application.id = funding_request.application_id)
      INNER JOIN sfa.assessment ON (funding_request.id = assessment.funding_request_id)
      INNER JOIN sfa.study_area ON (application.study_area_id = study_area.id)
      INNER JOIN sfa.institution_campus ON (application.institution_campus_id = institution_campus.id)
      INNER JOIN sfa.institution ON (institution.id = institution_campus.institution_id)
      INNER JOIN sfa.study_field ON (study_area.study_field_id = study_field.id)
      INNER JOIN sfa.field_program ON (application.program_id = field_program.program_id AND study_field.id = field_program.study_field_id)
      LEFT OUTER JOIN (SELECT SUM(COALESCE(disbursed_amount, 0)) disbursed, max(issue_date) issue_date, funding_request_id, assessment_id 
        FROM sfa.disbursement GROUP BY assessment_id, funding_request_id) d ON (funding_request.id = d.funding_request_id and assessment.id = d.assessment_id)
      INNER JOIN (SELECT funding_request_id, MAX(id) last_id FROM sfa.assessment GROUP BY funding_request_id) maxid ON assessment.id = maxid.last_id
      WHERE
      funding_request.request_type_id IN (4) AND application.academic_year_id = ${this.year} AND
      (application.is_perm_disabled = 1 OR application.permanent_disability = 1 OR application.pers_or_prolong_disability = 1 OR application.is_persist_disabled = 1) AND
      application.student_id IN (select student_id from sfa.funding_request INNER JOIN sfa.application on funding_request.application_id = application.id 
        where request_type_id = 30 and academic_year_id = ${this.year} and status_id = 7)
    ORDER BY sin`);

    for (let student of this.allApplications) {
      let rows = await this.makeRows(student);
      this.reportData.push(...rows);
    }

    return this.reportData;
  }

  async makeRows(app: any): Promise<Row[]> {
    //let studentApps = this.allApplications.filter((a: any) => a.studentId == student.id);
    let result = new Array<Row>();

    // console.log("Making rows for", app);

    let cat_code = app.csl_classification == 3 ? "M" : "S";

    let appId = await db("sfa.funding_request").where({ id: app.funding_request_id }).select("application_id").first();
    let csl_ft = 0;
    let csl_ft_date = null;
    let csg_ft = 0;
    let csg_ft_date = null;
    let csg_ftdep = 0;
    let csgp_ftdep_date = null;
    let csg_d = 0;
    let csg_d_date = null;

    if (appId) {
      let applicationId = appId.application_id;

      let otherFunds = await db("sfa.funding_request")
        .where({ application_id: applicationId })
        .join("sfa.disbursement", "disbursement.funding_request_id", "funding_request.id")
        .select("request_type_id")
        .groupBy("request_type_id")
        .sum("disbursed_amount as disbursed_amount")
        .min("due_date as disbursed_date");

      let ftLoan = otherFunds.find((f) => f.request_type_id == 4);
      let ftGrant = otherFunds.find((f) => f.request_type_id == 35);
      let ftDepGrant = otherFunds.find((f) => f.request_type_id == 32);
      let disGrant = otherFunds.find((f) => f.request_type_id == 29);

      if (ftLoan) csl_ft = Math.ceil(ftLoan.disbursed_amount);
      if (ftLoan) csl_ft_date = ftLoan.disbursed_date;

      if (ftGrant) csg_ft = Math.ceil(ftGrant.disbursed_amount);
      if (ftGrant) csg_ft_date = ftGrant.disbursed_date;

      if (ftDepGrant) csg_ftdep = Math.ceil(ftDepGrant.disbursed_amount);
      if (ftDepGrant) csgp_ftdep_date = ftDepGrant.disbursed_date;

      if (disGrant) csg_d = Math.ceil(disGrant.disbursed_amount);
      if (disGrant) csg_d_date = disGrant.disbursed_date;
    } else {
      console.log("NO APP");
    }

    let row = new Row();
    row.push(new Column("loanyear", `${this.year}${this.year + 1}`, " ", 8));
    row.push(new Column("sin", app.sin, " ", 9));
    row.push(new Column("prov_issue", "YT", " ", 2));
    row.push(new Column("dob", moment.utc(app.birth_date).format("YYYYMMDD"), " ", 8));
    row.push(new Column("gender", app.sex_id == 1 ? "M" : app.sex_id == 2 ? "F" : "U", " ", 1));
    row.push(new Column("cat_code", cat_code, " ", 1));
    row.push(new Column("ei_code", app.institution_code, " ", 4));
    row.push(new Column("fos", app.field_program_code, " ", 2));
    row.push(new Column("year_study", Math.min(app.program_year, 4), " ", 1));
    row.push(new Column("program_duration", app.program_year_total, "0", 1));
    row.push(
      new Column(
        "prog_changed_date",
        app.assessed_date ? moment.utc(app.assessed_date).format("YYYYMMDD") : " ",
        "0",
        8
      )
    );
    row.push(new Column("course_load_changed_date", ".", " ", 8));
    row.push(new Column("perc_full_course_load", app.percent_of_full_time ?? 60, "0", 3));
    row.push(new Column("amt_disb", csl_ft || 0, "0", 6));
    row.push(new Column("disb_date", csl_ft_date ? moment.utc(csl_ft_date).format("YYYYMMDD") : ".", " ", 8));
    row.push(new Column("csgp_ft", csg_ft, "0", 6));
    row.push(new Column("csgpft_disb_date", csg_ft_date ? moment.utc(csg_ft_date).format("YYYYMMDD") : ".", " ", 8));
    row.push(new Column("csgp_pd", csg_d, "0", 6));
    row.push(new Column("csgppd_disb_date", csg_d_date ? moment.utc(csg_d_date).format("YYYYMMDD") : ".", " ", 8));
    row.push(new Column("csgp_ftdep", csg_ftdep, "0", 6));
    row.push(
      new Column("csgpftd_disb_date", csgp_ftdep_date ? moment.utc(csgp_ftdep_date).format("YYYYMMDD") : ".", " ", 8)
    );

    //console.log(row.columns.length);
    //console.log(row.columns.reduce((a, r) => a + r.length, 0));

    result.push(row);

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
