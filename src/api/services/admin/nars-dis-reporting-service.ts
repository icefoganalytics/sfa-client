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

export class NarsDisabilityReportingService {
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
    person.sex_id, person.sin, person.birth_date, person.last_name, person.first_name, funding_request.status_id AS funding_request_status_id,    
    application.academic_year_id, COALESCE(institution.federal_institution_code, institution_campus.federal_institution_code ) institution_code , application.aboriginal_status_id,  
    application.category_id, application.is_disabled, application.program_year_total, application.program_year, application.is_perm_disabled, 
    application.permanent_disability, application.pers_or_prolong_disability, application.is_persist_disabled, 
    assessment.*, d.disbursed, d.issue_date, funding_request.request_type_id    
    from sfa.student
      INNER JOIN sfa.person ON (student.person_id = person.id)
      INNER JOIN sfa.application ON (student.id = application.student_id)
      INNER JOIN sfa.funding_request ON (application.id = funding_request.application_id)
      INNER JOIN sfa.assessment ON (funding_request.id = assessment.funding_request_id)
      INNER JOIN sfa.institution_campus ON (application.institution_campus_id = institution_campus.id)
      INNER JOIN sfa.institution ON (institution.id = institution_campus.institution_id)
      INNER JOIN (SELECT SUM(COALESCE(disbursed_amount, 0)) disbursed, max(issue_date) issue_date, funding_request_id, assessment_id 
        FROM sfa.disbursement GROUP BY assessment_id, funding_request_id) d ON (funding_request.id = d.funding_request_id and assessment.id = d.assessment_id)
      INNER JOIN (SELECT funding_request_id, MAX(id) last_id FROM sfa.assessment GROUP BY funding_request_id) maxid ON assessment.id = maxid.last_id
    where
      funding_request.request_type_id IN (4,5) AND application.academic_year_id = ${this.year} AND
      (application.is_perm_disabled = 1 OR application.permanent_disability = 1 OR application.pers_or_prolong_disability = 1 OR application.is_persist_disabled = 1)
	    AND application.student_id IN (
        select distinct student_id from sfa.funding_request inner join sfa.application on application.id = funding_request.application_id
        where application.academic_year_id = ${this.year} and status_id = 7 and funding_request.request_type_id IN (29,30))`);

    for (let student of this.allApplications) {
      let rows = await this.makeRows(student);
      this.reportData.push(...rows);
    }

    return this.reportData;
  }

  async makeRows(app: any): Promise<Row[]> {
    let result = new Array<Row>();

    //console.log("APPP", app);

    let appId = await db("sfa.funding_request").where({ id: app.funding_request_id }).select("application_id").first();

    let csg_d = 0;
    let csg_d_date = null;
    let csg_di_date = null;
    let csg_dse = 0;
    let csg_dse_date = null;
    let csg_dsei_date = null;

    let code1 = "";
    let code2 = "";
    let code3 = "";
    let types = [];

    if (appId) {
      let applicationId = appId.application_id;

      let otherFunds = await db("sfa.funding_request")
        .where({ application_id: applicationId })
        .join("sfa.disbursement", "disbursement.funding_request_id", "funding_request.id")
        .select("request_type_id")
        .groupBy("request_type_id")
        .sum("disbursed_amount as disbursed_amount")
        .min("due_date as disbursed_date")
        .min("issue_date as issue_date");

      let disGrant = otherFunds.find((f) => f.request_type_id == 29);
      let disSEGrant = otherFunds.find((f) => f.request_type_id == 30);

      if (disGrant) csg_d = Math.ceil(disGrant.disbursed_amount);
      if (disGrant) csg_d_date = disGrant.disbursed_date;
      if (disGrant) csg_di_date = disGrant.issue_date;

      if (disSEGrant) csg_dse = Math.ceil(disSEGrant.disbursed_amount);
      if (disSEGrant) csg_dse_date = disSEGrant.disbursed_date;
      if (disSEGrant) csg_dsei_date = disSEGrant.issue_date;

      let disability = await db("sfa.disability")
        .join("sfa.disability_type", "disability.disability_type_id", "disability_type.id")
        .where({
          application_id: applicationId,
          verified_disability_need: true,
        });

      code1 = disability[0] ? disability[0].csl_code : "";
      code2 = disability[1] ? disability[1].csl_code : "";
      code3 = disability[2] ? disability[2].csl_code : "";

      let services = await db("sfa.disability_requirement")
        .join("sfa.disability_service", "disability_service.id", "disability_requirement.disability_service_id")
        .where({ application_id: applicationId });

      let equipment = await db("sfa.equipment_required")
        .join("sfa.equipment_category", "equipment_required.equipment_category_id", "equipment_category.id")
        .where({ application_id: applicationId });

      for (let service of services) {
        types.push(getCodeForService(service.disability_service_id));
      }
      for (let service of equipment) {
        types.push(getCodeForEqipment(service.equipment_category_id));
      }
    } else {
      console.log("NO APP");
    }

    let row = new Row();
    row.push(new Column("sin", app.sin, " ", 9));
    row.push(new Column("last_name", app.last_name, " ", 25));
    row.push(new Column("first_name", app.first_name, " ", 15));
    row.push(new Column("loanyear", `${this.year}${this.year + 1}`, " ", 8));
    row.push(new Column("loan_type", app.request_type_id == 4 ? "F" : "P", " ", 1));
    row.push(new Column("prov_issue", "YT", " ", 2));

    row.push(new Column("csg_pd_auth", csg_d, "0", 5));
    row.push(new Column("csg_pd_disb", csg_d, "0", 5));
    row.push(new Column("csg_pd_authdate", csg_di_date ? moment.utc(csg_di_date).format("YYYYMMDD") : "", " ", 8));
    row.push(new Column("csg_pd_disbdate", csg_d_date ? moment.utc(csg_d_date).format("YYYYMMDD") : "", " ", 8));

    row.push(new Column("csg_pdse_auth", csg_dse, "0", 5));
    row.push(new Column("csg_pdse_disb", csg_dse, "0", 5));
    row.push(
      new Column("csg_pdse_authdate", csg_dsei_date ? moment.utc(csg_dsei_date).format("YYYYMMDD") : "", " ", 8)
    );
    row.push(new Column("csg_pdse_disbdate", csg_dse_date ? moment.utc(csg_dse_date).format("YYYYMMDD") : "", " ", 8));

    row.push(new Column("disab_code1", code1, ".", 1));
    row.push(new Column("disab_code2", code2, "Z", 1));
    row.push(new Column("disab_code3", code3, "Z", 1));

    row.push(new Column("type_serv_eqpt1", types[0] ? types[0] : "98", ".", 2));
    row.push(new Column("type_serv_eqpt2", types[1] ? types[1] : "98", ".", 2));
    row.push(new Column("type_serv_eqpt3", types[2] ? types[2] : "98", ".", 2));
    row.push(new Column("type_serv_eqpt4", types[3] ? types[3] : "98", ".", 2));
    row.push(new Column("type_serv_eqpt5", types[4] ? types[4] : "98", ".", 2));
    row.push(new Column("type_serv_eqpt6", types[5] ? types[5] : "98", ".", 2));

    row.push(new Column("type_serveqpt_desc1", "", ".", 25));
    row.push(new Column("type_serveqpt_desc2", "", ".", 25));
    row.push(new Column("type_serveqpt_desc3", "", ".", 25));

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

function getCodeForService(service: number): number {
  switch (service) {
    case 1: // note taker
      return 3;
    case 2: //tutor
      return 2;
    case 3:
      return 4;
    case 4:
      return 5;
    case 5:
      return 6;
    case 6:
      return 7;
    default:
      return 8;
  }
}
function getCodeForEqipment(equipment: number): number {
  switch (equipment) {
    case 1:
      return 13;
    case 2:
      return 20;
    case 3:
      return 18;
    case 4:
      return 10;
    case 5:
      return 21;
    case 6:
      return 16;
    default:
      return 11;
  }
}
