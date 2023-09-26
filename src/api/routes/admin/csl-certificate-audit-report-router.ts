import express, { Request, Response } from "express";
import knex from "knex";
import { param } from "express-validator";
import { DB_CONFIG } from "../../config";
import { renderReportAsHtml, renderReportAsPdf } from "@/utils/express-handlebars-pdf-client";
import moment from "moment";

const db = knex(DB_CONFIG);

export const cslCertificateAuditReportRouter = express.Router();
const TEMPLATE_PATH = "./templates/admin/reports/csl-certificate-audit-report";

cslCertificateAuditReportRouter.get(
  "/:FROM_DATE/:TO_DATE/:ACADEMIC_YEAR.:format",
  [param("ACADEMIC_YEAR").isInt().notEmpty(), param("FROM_DATE").notEmpty(), param("TO_DATE").notEmpty()],
  //ReturnValidationErrors,
  async (req: Request, res: Response) => {
    //const { filter = true } = req.query;
    const { FROM_DATE, TO_DATE, ACADEMIC_YEAR, format } = req.params;

    try {
      const res1 = await db
        .select(
          "d.id",
          "d.transaction_number",
          "p.last_name",
          "p.first_name",
          "rt.description",
          "d.issue_date",
          "d.due_date",
          db.raw("d.disbursed_amount * 100 AS disbursed_amount"),
          "d.disbursement_type_id",
          "rt.description AS type",
          "d.csl_cert_seq_number",
          "d.ecert_sent_date",
          "msfaa.received_date",
          "msfaa.id AS msfaa_number",
          "loan_disburse.ecert_sent_date AS loan_cert_date",
          "loan_disburse.id"
        )
        .from("sfa.student AS s")
        .innerJoin("sfa.person AS p", "s.person_id", "p.id")
        .innerJoin("sfa.application AS hd", "s.id", "hd.student_id")
        .innerJoin("sfa.funding_request AS fr", "hd.id", "fr.application_id")
        .innerJoin("sfa.request_type AS rt", "fr.request_type_id", "rt.id")
        .innerJoin("sfa.disbursement AS d", "fr.id", "d.funding_request_id")
        .innerJoin("sfa.disbursement_type AS dt", "d.disbursement_type_id", "dt.id")
        .innerJoin("sfa.msfaa", "msfaa.student_id", "s.id")
        .leftJoin(
          function () {
            this.select(
              "d1.ecert_sent_date",
              "d1.issue_date",
              "d1.csl_cert_seq_number",
              "d1.id",
              "d1.due_date",
              "d1.transaction_number"
            )
              .from("sfa.disbursement AS d1")
              .innerJoin("sfa.funding_request AS fr1", "d1.funding_request_id", "fr1.id")
              .innerJoin("sfa.request_type AS rt1", "fr1.request_type_id", "rt1.id")
              .whereIn("fr1.request_type_id", [4, 5])
              .as("loan_disburse");
          },
          function () {
            this.on("d.csl_cert_seq_number", "=", "loan_disburse.csl_cert_seq_number")
              .andOn("d.issue_date", "=", "loan_disburse.issue_date")
              .andOn(db.raw("(CASE WHEN loan_disburse.ecert_sent_date IS NULL THEN 0 ELSE 1 END) = 0"))
              .andOn("d.transaction_number", "=", "loan_disburse.transaction_number");
          }
        )
        .where(
          "fr.request_type_id",
          "in",
          [4, 5, 6, 15, 16, 17, 18, 19, 22, 23, 24, 31, 32, 29, 27, 26, 28, 30, 31, 32, 33, 34, 35, 47]
        )
        .where("d.issue_date", ">=", FROM_DATE)
        .where("d.issue_date", "<=", TO_DATE)
        .where("hd.academic_year_id", "=", ACADEMIC_YEAR)
        .where("msfaa.is_full_time", "=", db.raw("CASE WHEN d.disbursement_type_id = 4 THEN 1 ELSE 0 END"))
        .where("msfaa.msfaa_status", "!=", "Cancelled")
        .whereNull("d.ecert_sent_date")
        .orderByRaw("RIGHT(CONCAT('00000000000000000000', CAST(d.transaction_number AS CHAR(20))), 20)")
        .orderBy("d.issue_date")
        .orderBy("d.due_date")
        .orderBy("p.last_name")
        .orderBy("p.first_name")
        .orderBy("rt.description");

      const res2 = await db
        .select(
          "d.id",
          "d.transaction_number",
          "p.last_name",
          "p.first_name",
          "rt.description",
          "d.issue_date",
          "d.due_date",
          db.raw("d.disbursed_amount * 100 AS disbursed_amount"),
          "d.disbursement_type_id",
          "rt.description AS type",
          "d.csl_cert_seq_number",
          "d.ecert_sent_date",
          "msfaa.id AS msfaa_number",
          "loan_disburse.ecert_sent_date AS loan_cert_date",
          "loan_disburse.id"
        )
        .from("sfa.student AS s")
        .innerJoin("sfa.person AS p", "s.person_id", "p.id")
        .innerJoin("sfa.application AS hd", "s.id", "hd.student_id")
        .innerJoin("sfa.funding_request AS fr", "hd.id", "fr.application_id")
        .innerJoin("sfa.request_type AS rt", "fr.request_type_id", "rt.id")
        .innerJoin("sfa.disbursement AS d", "fr.id", "d.funding_request_id")
        .innerJoin("sfa.disbursement_type AS dt", "d.disbursement_type_id", "dt.id")
        .innerJoin("sfa.msfaa", "msfaa.student_id", "s.id")
        .leftJoin(
          function () {
            this.select(
              "d1.ecert_sent_date",
              "d1.issue_date",
              "d1.csl_cert_seq_number",
              "d1.id",
              "d1.due_date",
              "d1.transaction_number"
            )
              .from("sfa.disbursement AS d1")
              .innerJoin("sfa.funding_request AS fr1", "d1.funding_request_id", "fr1.id")
              .innerJoin("sfa.request_type AS rt1", "fr1.request_type_id", "rt1.id")
              .whereIn("fr1.request_type_id", [4, 5])
              .as("loan_disburse");
          },
          function () {
            this.on("d.transaction_number", "=", "loan_disburse.transaction_number")
              .andOn("d.issue_date", "=", "loan_disburse.issue_date")
              .andOn(db.raw("(CASE WHEN loan_disburse.ecert_sent_date IS NULL THEN 0 ELSE 1 END) = 1"));
          }
        )
        .where("fr.request_type_id", "in", [4, 6, 15, 16, 17, 18, 19, 22, 23, 24, 32, 29, 27, 26, 28, 30, 31, 33, 47])
        .where("d.issue_date", ">=", FROM_DATE)
        .where("d.issue_date", "<=", TO_DATE)
        .where("hd.academic_year_id", "=", ACADEMIC_YEAR)
        .where("msfaa.is_full_time", "=", db.raw("CASE WHEN d.disbursement_type_id = 4 THEN 1 ELSE 0 END"))
        .where("msfaa.msfaa_status", "!=", "Cancelled")
        .whereNotNull("d.ecert_sent_date")
        .orderByRaw("RIGHT(CONCAT('00000000000000000000', CAST(d.transaction_number AS CHAR(20))), 20)")
        .orderBy("d.issue_date")
        .orderBy("d.due_date")
        .orderBy("p.last_name")
        .orderBy("p.first_name")
        .orderBy("rt.description");

      let data = {
        currentDate: new Date(),
        startDate: FROM_DATE,
        endDate: TO_DATE,

        notSent: res1,
        sent: res2,
      };

      if (format == "pdf") {
        let pdf = await renderReportAsPdf(TEMPLATE_PATH, data, "LETTER", true);
        res.setHeader("Content-disposition", `attachment; filename="EDU-SFA-${moment().format("YYYY-MM-DD")}.pdf"`);
        res.setHeader("Content-type", "application/pdf");
        return res.send(pdf);
      }

      let html = await renderReportAsHtml(TEMPLATE_PATH, data);
      res.send(html);
    } catch (error: any) {
      console.log(error);
      return res.status(404).send();
    }
  }
);
