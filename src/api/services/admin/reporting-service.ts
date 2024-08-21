import db from "@/db/db-client";
import { unparse } from "papaparse";
import moment from "moment";
import { renderReportAsHtml, renderReportAsPdf } from "@/utils/express-handlebars-pdf-client";
import { NarsV17ReportingService } from "./nars-v17-reporting-service";
import { NarsPTReportingService } from "./nars-pt-reporting-service";
import { NarsDisabilityReportingService } from "./nars-dis-reporting-service";
import { NarsDisabilityRCLReportingService } from "./nars-disft-reporting-service";

export const STA_YUKON_UNIVERSITY_TEMPLATE = "./templates/admin/reports/student-training-allowance-yukon-university";

export default class ReportingService {
  static async runFundingStatusReport({ years }: FundingStatusReportParams): Promise<any[]> {
    let results = await db.raw(
      `SELECT person.first_name 'First Name', 
      person.last_name 'Last Name', 
      person.email 'Email', 
      marital_status.description 'Student Category', 
      request_type.description 'Grant Type',
      status.description 'Application Status', 
      institution.name 'Institution Name', 
      application.academic_year_id 'Application Year',
      status_date 'Status Change Date', 
      funding_request.received_date 'Received Date',
	  status_reason.description 'Status Reason'
    FROM sfa.funding_request
      INNER JOIN sfa.status ON funding_request.status_id = status.id
      INNER JOIN sfa.request_type ON request_type.id = funding_request.request_type_id
      INNER JOIN sfa.application ON funding_request.application_id = application.id
      INNER JOIN sfa.student ON application.student_id = student.id
      INNER JOIN sfa.person ON student.person_id = person.id
      INNER JOIN sfa.institution_campus ON application.institution_campus_id = institution_campus.id
      INNER JOIN sfa.institution ON institution_campus.institution_id = institution.id
      INNER JOIN sfa.marital_status ON application.marital_status_id = marital_status.id
	    LEFT OUTER JOIN sfa.status_reason ON funding_request.status_reason_id = status_reason.id
    WHERE application.academic_year_id IN (` +
        years.join(",") +
        `)
    ORDER BY person.last_name, person.first_name, status.description, request_type.description, application.academic_year_id
    `
    );

    for (let row of results) {
      row.statusChangeDate = row.statusChangeDate ? moment.utc(row.statusChangeDate).format("YYYY-MM-DD") : "";
      row.receivedDate = row.receivedDate ? moment.utc(row.receivedDate).format("YYYY-MM-DD") : "";
    }

    return results;
  }

  static async runSTAYukonUniversityReport({
    academic_year_id,
    format = "json",
  }: {
    academic_year_id: number;
    format: string | undefined;
  }): Promise<any[]> {
    let results = await db.raw(
      `SELECT CONCAT(person.first_name, ' ', person.last_name) 'Name', 
      person.sin, 
      assessment.effective_rate_date effectiveDate, 
      weeks_allowed weeks,
      weekly_amount,
      travel_allowance,
      disbursement.disbursed_amount as net,
      change_reason.description as comment,
      disbursement.id
      FROM sfa.funding_request
        INNER JOIN sfa.application ON funding_request.application_id = application.id
        INNER JOIN sfa.student ON application.student_id = student.id
        INNER JOIN sfa.person ON student.person_id = person.id
        INNER JOIN sfa.assessment ON assessment.funding_request_id = funding_request.id
        INNER JOIN sfa.disbursement ON assessment.id = disbursement.assessment_id
        LEFT OUTER JOIN sfa.change_reason ON disbursement.change_reason_id = change_reason.id
      WHERE application.academic_year_id IN (${academic_year_id})
        AND application.institution_campus_id IN (5326, 3488, 5648)
        AND disbursement.issue_date <= GETDATE()
        AND disbursement.due_date IS NULL
        AND funding_request.request_type_id = 1
      ORDER BY person.last_name, person.first_name`
    );

    for (let row of results) {
      row.effectiveDate = row.effectiveDate ? moment.utc(row.effectiveDate).format("YYYY-MM-DD") : "";
    }

    return results;
  }

  static async runScholarshipReport({
    academic_year_id,
    status_id,
    scholarshipIds,
  }: ScholarshipReportParams): Promise<any[]> {
    let results = await db.raw(
      `SELECT request_type.description scholarship, person.first_name, person.last_name, study_area.description program, application.academic_percent
      FROM sfa.application
       INNER JOIN sfa.funding_request ON application.id = funding_request.application_id
       INNER JOIN sfa.request_type ON funding_request.request_type_id = request_type.id
       INNER JOIN sfa.student on application.student_id = student.id
       INNER JOIN sfa.person on student.person_id = person.id
       INNER JOIN sfa.study_area on application.study_area_id = study_area.id
      WHERE
        application.academic_year_id = ${academic_year_id}
        AND funding_request.request_type_id IN (${scholarshipIds.join(",")})
        AND funding_request.status_id = ${status_id}
      ORDER BY request_type.description, application.academic_percent desc`
    );

    return results;
  }

  static async runNars2022FTReport({ format = "json" }: { format: string | undefined }): Promise<any> {
    let service = new NarsV17ReportingService({
      startDate: new Date("2022-06-01"),
      endDate: new Date("2023-05-31"),
      year: 2022,
    });

    let results = await service.runReport();

    if (format == "json") {
      return results.map((r) => r.toJson());
    } else if (format == "csv") {
      let lines = results.map((r) => r.toCsv());
      lines.unshift(results[0].columns.map((c) => c.field).join(","));
      return lines.join("\n");
    }

    let lines = results.map((r) => r.toString());
    return lines.join("\n");
  }

  static async runNars2022PTReport({ format = "json" }: { format: string | undefined }): Promise<any> {
    let service = new NarsPTReportingService({
      startDate: new Date("2022-06-01"),
      endDate: new Date("2023-05-31"),
      year: 2022,
    });

    let results = await service.runReport();

    if (format == "json") {
      return results.map((r) => r.toJson());
    } else if (format == "csv") {
      let lines = results.map((r) => r.toCsv());
      lines.unshift(results[0].columns.map((c) => c.field).join(","));
      return lines.join("\n");
    }

    let lines = results.map((r) => r.toString());
    return lines.join("\n");
  }

  static async runNars2022DisabilityReport({
    format = "json",
    academic_year_id,
  }: {
    format: string | undefined;
    academic_year_id: number;
  }): Promise<any> {
    let service = new NarsDisabilityReportingService({
      startDate: new Date("2022-06-01"),
      endDate: new Date("2023-05-31"),
      year: academic_year_id,
    });

    let results = await service.runReport();

    if (format == "json") {
      return results.map((r) => r.toJson());
    } else if (format == "csv") {
      let lines = results.map((r) => r.toCsv());
      lines.unshift(results[0].columns.map((c) => c.field).join(","));
      return lines.join("\n");
    }

    let lines = results.map((r) => r.toString());
    return lines.join("\n");
  }

  static async runNars2022DisabilityRCLReport({
    format = "json",
    academic_year_id,
  }: {
    format: string | undefined;
    academic_year_id: number;
  }): Promise<any> {
    let service = new NarsDisabilityRCLReportingService({
      startDate: new Date("2022-06-01"),
      endDate: new Date("2023-05-31"),
      year: academic_year_id,
    });

    let results = await service.runReport();

    if (format == "json") {
      return results.map((r) => r.toJson());
    } else if (format == "csv") {
      let lines = results.map((r) => r.toCsv());
      lines.unshift(results[0].columns.map((c) => c.field).join(","));
      return lines.join("\n");
    }

    let lines = results.map((r) => r.toString());
    return lines.join("\n");
  }

  static async runStepReport({
    academic_year_id,
    format = "json",
  }: {
    academic_year_id: number;
    format: string | undefined;
  }): Promise<any> {
    let results = await db.raw(
      `SELECT distinct person.last_name, person.first_name, study_area.description program_name, 
         program.description program_type, program_year, institution.name institution_name, person.email
       FROM sfa.application
         INNER JOIN sfa.student on application.student_id = student.id
         INNER JOIN sfa.person on student.person_id = person.id
         INNER JOIN sfa.study_area on application.study_area_id = study_area.id
         INNER JOIN sfa.program on application.program_id = program.id
         INNER JOIN sfa.institution_campus on application.institution_campus_id = institution_campus.id
         INNER JOIN sfa.institution on institution_campus.institution_id = institution.id
       WHERE application.academic_year_id = ${academic_year_id} and has_consent_to_share_data = 1
       ORDER BY 1, 2`
    );

    if (format == "csv") {
      let lines = results.map((r: any) => r.toCsv());
      lines.unshift(results[0].columns.map((c: any) => c.field).join(","));
      return lines.join("\n");
    }

    return results;
  }

  static async runApprovedFundingReport({ academic_year_id }: { academic_year_id: number }): Promise<any[]> {
    let results = await db.raw(
      `SELECT DISTINCT application.academic_year_id academic_year, student.id as sfa_id, last_name, first_name, LEFT(sex. description, 1) gender
          , (0 + FORMAT(COALESCE(application.classes_start_date, GETDATE()),'yyyyMMdd') - FORMAT(person.birth_date,'yyyyMMdd') ) / 10000 age
          , aboriginal_status.description ethnicity, first_nation.description first_nation, marital_status.description marital_status
          , application.csl_classification, category.description yg_category
          , institution.name institution_name, institution_country.description institution_country, institution_province.description institution_province
          , institution_level.description institution_level, CONCAT (application.program_year, ' of ',  application.program_year_total) year_of_program
          , study_area.description program_name, program.description program_type, study_field.description study_field
          , CONCAT(student.yukon_resident_from_month,'/', student.yukon_resident_from_year) AS yukon_resident_since, CONCAT(student.high_school_left_year, '/', student.high_school_left_month) AS left_high_school
          , COALESCE(prestudy_classification.description, 'Unknown') as prestudy_csl_classification, COALESCE(prestudy_accomodation.description, 'Unknown') AS prestudy_accomodation
          , COALESCE(study_classification.description, 'Unknown') as study_csl_classification, COALESCE(study_accomodation.description, 'Unknown') AS study_accomodation
          , application.parent1_income, application.parent2_income, application.student_ln150_income, application.spouse_ln150_income
          , application.classes_start_date, application.classes_end_date
          , mail_address.address1 mail_address_line1, mail_address.address2 mail_address_line2, mail_address.city mail_address_city, mail_address.province mail_address_province, mail_address.country mail_address_country, mail_address.postal_code mail_address_postal_code
          , application.school_email, application.school_telephone
        FROM sfa.funding_request
          INNER JOIN sfa.application ON funding_request.application_id = application.id
          INNER JOIN sfa.student ON application.student_id = student.id
          INNER JOIN sfa.person ON student.person_id = person.id
          INNER JOIN sfa.assessment ON assessment.funding_request_id = funding_request.id
          INNER JOIN sfa.disbursement ON assessment.id = disbursement.assessment_id
          INNER JOIN sfa.sex on person.sex_id = sex.id
          INNER JOIN sfa.institution_campus on application.institution_campus_id = institution_campus.id
          LEFT JOIN sfa.country institution_country on institution_country.id = institution_campus.address_country_id
          LEFT JOIN sfa.province institution_province on institution_province.id = institution_campus.address_province_id
          INNER JOIN sfa.institution on institution_campus.institution_id = institution.id
          LEFT JOIN sfa.institution_level on institution_level.id = institution.institution_level_id
          LEFT JOIN sfa.aboriginal_status ON application.aboriginal_status_id = aboriginal_status.id
          LEFT JOIN sfa.first_nation ON application.first_nation_id = first_nation.id
          LEFT JOIN sfa.marital_status ON application.marital_status_id = marital_status.id
          LEFT JOIN sfa.csl_classification ON application.csl_classification = csl_classification.id
          LEFT JOIN sfa.category on application.category_id = category.id
          LEFT JOIN sfa.program on application.program_id = program.id
          LEFT JOIN sfa.study_area on application.study_area_id = study_area.id
          LEFT JOIN sfa.study_field on study_area.study_field_id = study_field.id
          LEFT JOIN sfa.csl_classification prestudy_classification on prestudy_classification.id = application.prestudy_csl_classification
          LEFT JOIN sfa.csl_classification study_classification on study_classification.id = application.csl_classification
          LEFT JOIN sfa.accommodation_type prestudy_accomodation ON prestudy_accomodation.id = application.prestudy_accom_code
          LEFT JOIN sfa.accommodation_type study_accomodation ON study_accomodation.id = application.study_accom_code
          LEFT JOIN sfa.person_address on application.primary_address_id = person_address.id
          LEFT JOIN sfa.v_current_person_address mail_address on (mail_address.address_type_id = 1 and mail_address.person_id = student.person_id)
        WHERE application.academic_year_id = ${academic_year_id} and funding_request.status_id = 7
        ORDER BY student.id`
    );

    let payments =
      await db.raw(`SELECT application.student_id, funding_request.request_type_id, SUM(disbursement.disbursed_amount) disbursed_amount
        FROM sfa.disbursement
        INNER JOIN sfa.assessment ON disbursement.assessment_id = assessment.id
        INNER JOIN sfa.funding_request ON disbursement.funding_request_id = funding_request.id and funding_request.status_id = 7
        INNER JOIN sfa.application ON funding_request.application_id = application.id
        WHERE application.academic_year_id = 2022
        GROUP BY student_id, request_type_id
        ORDER BY student_id`);

    let dependents =
      await db.raw(`SELECT application.student_id, dependent_eligibility.is_sta_eligible, dependent_eligibility.is_csl_eligible, birth_date
        ,(0 + FORMAT(COALESCE(application.classes_start_date, GETDATE()),'yyyyMMdd') - FORMAT(dependent.birth_date,'yyyyMMdd')) / 10000 age
        FROM sfa.dependent_eligibility
        INNER JOIN sfa.application on dependent_eligibility.application_id = application.id
        INNER JOIN sfa.dependent on dependent.id  = dependent_eligibility.dependent_id
        WHERE application.academic_year_id = 2022
          AND (dependent_eligibility.is_sta_eligible = 1 OR dependent_eligibility.is_csl_eligible = 1)`);

    for (let row of results) {
      let rowPays = payments.filter((p: any) => p.studentId == row.sfaId);
      let rowDepends = dependents.filter((p: any) => p.studentId == row.sfaId);

      row.yukon_grant_amount = rowPays.find((r: any) => r.requestTypeId == 2)?.disbursedAmount ?? 0;
      row.sta_amount = rowPays.find((r: any) => r.requestTypeId == 1)?.disbursedAmount ?? 0;
      row.yea_amount = rowPays.find((r: any) => r.requestTypeId == 3)?.disbursedAmount ?? 0;
      row.csl_ft_amount = rowPays.find((r: any) => r.requestTypeId == 4)?.disbursedAmount ?? 0;
      row.csg_ft_amount = rowPays.find((r: any) => r.requestTypeId == 35)?.disbursedAmount ?? 0;
      row.csg_tu_amount = rowPays.find((r: any) => r.requestTypeId == 28)?.disbursedAmount ?? 0;
      row.csg_ftdep_amount = rowPays.find((r: any) => r.requestTypeId == 32)?.disbursedAmount ?? 0;
      row.csg_disequp_amount = rowPays.find((r: any) => r.requestTypeId == 30)?.disbursedAmount ?? 0;
      row.csg_ftdis_amount = rowPays.find((r: any) => r.requestTypeId == 29)?.disbursedAmount ?? 0;
      row.csl_pt_amount = rowPays.find((r: any) => r.requestTypeId == 5)?.disbursedAmount ?? 0;
      row.csg_pt_amount = rowPays.find((r: any) => r.requestTypeId == 31)?.disbursedAmount ?? 0;
      row.csg_ptdep_amount = rowPays.find((r: any) => r.requestTypeId == 33)?.disbursedAmount ?? 0;
      row.sfa_army_amount = rowPays.find((r: any) => r.requestTypeId == 7)?.disbursedAmount ?? 0;
      row.sfa_harach_amount = rowPays.find((r: any) => r.requestTypeId == 9)?.disbursedAmount ?? 0;
      row.sfa_art_amount = rowPays.find((r: any) => r.requestTypeId == 10)?.disbursedAmount ?? 0;
      row.sfa_husky_amount = rowPays.find((r: any) => r.requestTypeId == 11)?.disbursedAmount ?? 0;
      row.total_gov_amount =
        row.yukon_grant_amount +
        row.sta_amount +
        row.yea_amount +
        row.csl_ft_amount +
        row.csg_ft_amount +
        row.csg_tu_amount +
        row.csg_ftdep_amount +
        row.csg_disequp_amount +
        row.csg_ftdis_amount +
        row.csl_pt_amount +
        row.csg_pt_amount +
        row.csg_ptdep_amount;
      row.total_amount =
        row.total_gov_amount + row.sfa_army_amount + row.sfa_harach_amount + row.sfa_art_amount + row.sfa_husky_amount;

      let staCount = rowDepends.filter((r: any) => r.isStaEligible).length;
      let csl0Count = rowDepends.filter((r: any) => r.isCslEligible && r.age < 12).length;
      let csl12Count = rowDepends.filter((r: any) => r.isCslEligible && r.age > 11).length;

      row.sta_dependants = staCount;
      row.csl_dependants_0_11 = csl0Count;
      row.csl_dependants_12_up = csl12Count;
      row.csl_dependants_total = csl0Count + csl12Count;

      let csl_family_size = 99;

      row.csl_family_size = 99;
    }

    return results;
  }
  static async runT4AReport({ tax_year }: { tax_year: number }): Promise<any[]> {
    let results = await db.raw(
      `select person.sin, person.last_name, person.first_name, person.initials
      , address1, address2, city, province, country, postal_code
      , request_type.description
      , SUM(paid.disbursed) amount, student.vendor_id
      from sfa.application
        INNER JOIN sfa.funding_request ON application.id = funding_request.application_id
        INNER JOIN sfa.request_type ON funding_request.request_type_id = request_type.id
        INNER JOIN sfa.student ON application.student_id = student.id
        INNER JOIN sfa.person ON student.person_id = person.id
        INNER JOIN sfa.v_current_person_address ON person.id = v_current_person_address.person_id AND v_current_person_address.address_type_id = 1
        INNER JOIN (select assessment.funding_request_id, SUM(disbursed_amount) disbursed
      FROM sfa.assessment INNER JOIN sfa.disbursement ON assessment.id = disbursement.assessment_id
      WHERE tax_year = ${tax_year}
      group by assessment.funding_request_id
      having SUM(disbursed_amount) > 0) paid ON funding_request.id = paid.funding_request_id
      WHERE t4a_required = 1 AND funding_request.status_id = 7
      GROUP BY person.sin, person.last_name, person.first_name, person.initials
      , address1, address2, city, province, country, postal_code
      , request_type.description, student.vendor_id
      order by sin, description
      `
    );

    return results;
  }

  static async runVendorUpdateReport({ format }: { format: string }): Promise<any[]> {
    let results = await db.raw(
      `SELECT vendor_update.id, person.first_name, person.last_name, vendor_update.vendor_id, vendor_update.address, city.description as city, province.description as province, 
        postal_code, country.description as country, vendor_update.telephone, vendor_update.email
      FROM [sfa].[vendor_update]
        LEFT JOIN sfa.[city] on city.id = [vendor_update].city_id
        LEFT JOIN sfa.[province] on province.id = [vendor_update].province_id
        LEFT JOIN sfa.[country] on country.id = [vendor_update].country_id
        LEFT JOIN sfa.[student] on student.id = [vendor_update].student_id
        LEFT JOIN sfa.[person] on person.id = [student].person_id
      WHERE update_requested_date IS NULL`
    );

    const val = results.map((r: any) => {
      return {
        "Business Name": `${r.firstName} ${r.lastName}`,
        "Business Name 2": "",
        "Corporate Registry Number": "",
        "Existing Vendor id": r.vendorId ?? "",
        "Entity Type": "Individual",
        "Business type": "",
        Street: r.address,
        City: r.city,
        Province: r.province,
        "Postal Code": r.postalCode,
        Country: r.country,
        "Alt Address": "",
        "Phone number": r.telephone,
        "Cellphone number": "",
        Email: r.email,
      };
    });

    if (format == "csv") {
      //since it's a CSV, we need to update the items so they don't show up multiple times

      for (let item of results) {
        await db("vendor_update").where({ id: item.id }).update({ update_requested_date: new Date() });
      }
    }

    return val;
  }

  static async generateAs({
    format,
    reportData,
  }: {
    format: string | undefined;
    reportData: any[];
  }): Promise<{ fileContent: any; fileName: string; mimeType: string }> {
    if (format == "json") {
    } else if (format == "csv") {
      let t = unparse(reportData, {
        quotes: true,
      });

      console.log("MAKING CSV");

      return Promise.resolve({
        fileContent: t,
        fileName: `fundingStatusReport_${moment().format("YYYY-MM-DD")}.csv`,
        mimeType: "text/csv",
      });
    } else if (format == "html") {
      console.log("MAKING HTML");

      let disbursements = await db.raw(
        `SELECT disbursement.id,
        CONCAT(person.first_name, ' ', person.last_name) 'Name', 
        person.sin, 
        assessment.effective_rate_date effectiveDate, 
        weeks_allowed weeks,
        weekly_amount * 100 AS weekly_amount,
        travel_allowance * 100 AS travel_allowance,
        disbursement.disbursed_amount * 100 as net,
        change_reason.description as comment
        FROM sfa.funding_request
        INNER JOIN sfa.application ON funding_request.application_id = application.id
        INNER JOIN sfa.student ON application.student_id = student.id
        INNER JOIN sfa.person ON student.person_id = person.id
        INNER JOIN sfa.assessment ON assessment.funding_request_id = funding_request.id
        INNER JOIN sfa.disbursement ON assessment.id = disbursement.assessment_id
        LEFT OUTER JOIN sfa.change_reason ON disbursement.change_reason_id = change_reason.id
        WHERE application.academic_year_id IN (2023)
          AND application.institution_campus_id IN (5326, 3488, 5648)
          AND disbursement.issue_date <= GETDATE()
          AND disbursement.due_date IS NULL
          AND funding_request.request_type_id = 1
        ORDER BY person.last_name, person.first_name`
      );

      let total = disbursements.reduce((t: number, a: any) => {
        return t + a.net;
      }, 0);

      let data = { currentDate: new Date(), disbursements, total };
      let file = await renderReportAsHtml(STA_YUKON_UNIVERSITY_TEMPLATE, data);

      return Promise.resolve({
        fileContent: file,
        fileName: `fundingStatusReport_${moment().format("YYYY-MM-DD")}.html`,
        mimeType: "text/html",
      });
    } else if (format == "pdf") {
    } else {
      return Promise.reject("Unsupported format");
    }

    return Promise.resolve({ fileContent: reportData, fileName: "asdf.csv", mimeType: "text/csv" });
  }
}

export interface FundingStatusReportParams {
  years: number[];
}

export interface ScholarshipReportParams {
  academic_year_id: number;
  status_id: number;
  scholarshipIds: number[];
}
