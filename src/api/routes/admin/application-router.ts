import express, { Request, Response } from "express";
import { body, param } from "express-validator";
import moment from "moment";
import knex from "knex";
import { DocumentService, DocumentStatus, DocumentationService } from "../../services/shared";
import { ReturnValidationErrors } from "../../middleware";
import { DB_CONFIG } from "../../config";
import { uniq, parseInt, min, get, isArray, isEmpty, orderBy } from "lodash";
import { AssessmentYukonGrant, AssessmentYEA } from "../../repositories/assessment";
import { weeksBetween } from "@/utils/date-utils";

const db = knex(DB_CONFIG);
export const applicationRouter = express.Router();
export const portalStudentRouter = express.Router();
const documentService = new DocumentService();
const documentationService = new DocumentationService();

applicationRouter.get("/all", ReturnValidationErrors, async (req: Request, res: Response) => {
  try {
    const { filter } = req.query;

    let applications;

    if (!filter || filter == undefined) {
      applications = await db("sfa.application")
        .leftJoin("sfa.institution_campus", "application.institution_campus_id", "institution_campus.id")
        .leftJoin("sfa.institution", "institution.id", "institution_campus.institution_id")
        .innerJoin("sfa.funding_request", "funding_request.application_id", "application.id")
        .innerJoin("sfa.student", "student.id", "application.student_id")
        .innerJoin("sfa.person", "student.person_id", "person.id")
        .select("application.id")
        .select("application.online_submit_date")
        .select("institution.name as institution_name")
        .select("application.academic_year_id")
        .select("person.first_name")
        .select("person.last_name")
        .limit(150)
        .where("funding_request.status_id", 32)
        .groupBy(
          "application.id",
          "application.online_submit_date",
          "institution.name",
          "person.first_name",
          "person.last_name",
          "application.academic_year_id"
        )
        .orderBy("online_submit_date", "asc");
    } else {
      applications = await db("sfa.application")
        .leftJoin("sfa.institution_campus", "application.institution_campus_id", "institution_campus.id")
        .leftJoin("sfa.institution", "institution.id", "institution_campus.institution_id")
        .innerJoin("sfa.funding_request", "funding_request.application_id", "application.id")
        .innerJoin("sfa.student", "student.id", "application.student_id")
        .innerJoin("sfa.person", "student.person_id", "person.id")
        .select("application.id")
        .select("application.online_submit_date")
        .select("institution.name as institution_name")
        .select("application.academic_year_id")
        .select("person.first_name")
        .select("person.last_name")
        .limit(150)
        .whereRaw(`UPPER(last_name) like '[${filter}]%'`)
        .andWhere("funding_request.status_id", 32)
        .groupBy(
          "application.id",
          "application.online_submit_date",
          "institution.name",
          "person.first_name",
          "person.last_name",
          "application.academic_year_id"
        )
        .orderBy("online_submit_date", "asc");
    }

    for (let item of applications) {
      item.title = `${item.first_name} ${item.last_name} - ${item.academic_year_id}: ${item.institution_name}`;
    }

    return res.json({ data: applications });
  } catch (error) {
    console.log("/all-ERR: ", error);
    res.status(404).send(error);
  }
});

applicationRouter.get("/latest-updates", ReturnValidationErrors, async (req: Request, res: Response) => {
  try {
    const { filter } = req.query;
    let data = new Array();

    const reviewDocsQuery = db("sfa.application")
      .innerJoin("sfa.file_reference", "application.id", "file_reference.application_id")
      .innerJoin("sfa.student", "student.id", "application.student_id")
      .innerJoin("sfa.person", "student.person_id", "person.id")
      .innerJoin("sfa.requirement_type", "file_reference.requirement_type_id", "requirement_type.id")
      .select(
        "application.id",
        "person.first_name",
        "person.last_name",
        "requirement_type.description as requirement_name",
        "application.academic_year_id",
        "file_reference.status_date "
      )
      .where("file_reference.status", DocumentStatus.REVIEW)
      .orderBy("status_date", "desc")
      .limit(150);

    if (filter) reviewDocsQuery.whereRaw(`UPPER(last_name) like '[${filter}]%'`);

    const reviewDocs = await reviewDocsQuery;

    for (let item of reviewDocs) {
      data.push({
        icon: "mdi-bookshelf",
        url: `/application/${item.id}/documentation`,
        title: `${item.first_name} ${item.last_name} - ${item.requirement_name}`,
        subtitle: `${item.requirement_name}`,
        updated_at: item.status_date,
      });
    }

    return res.json({ data });
  } catch (error) {
    console.log("/all-ERR: ", error);
    res.status(404).send(error);
  }
});

applicationRouter.post(
  "/",
  [body("studentId").notEmpty(), body("academicYear").notEmpty(), body("institutionId").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    let { studentId, academicYear, institutionId, classesStartDate } = req.body;
    /* let existing = await db("sfa.application")
      .where({ student_id: studentId, academic_year_id: academicYear, institution_campus_id: institutionId })
      .count("* as count")
      .first(); */

    let newApp = {
      student_id: parseInt(studentId),
      academic_year_id: parseInt(academicYear),
      institution_campus_id: parseInt(institutionId),
      classes_start_date: classesStartDate,
      program_division: 2,
      tuition_estimate_amount: 0,
      prestudy_accom_code: 1,
      study_accom_code: 1,
      csl_classification: 1,
      prestudy_csl_classification: 1,
      outstanding_cslpt_amount: 0,
      prestudy_board_amount: 0,
      study_board_amount: 0,
      parent1_income: 0,
      parent2_income: 0,
      parent1_tax_paid: 0,
      parent2_tax_paid: 0,
    };

    let newRow = await db("sfa.application").insert(newApp).returning("*");

    if (newRow && newRow.length == 1) {
      return res.json({ data: { id: newRow[0].id }, messages: [{ text: "Application created", variant: "success" }] });
    } else {
      return res.json({ messages: [{ text: "This record appears to already exist", variant: "error" }] });
    }
  }
);

applicationRouter.get("/flags", async (req: Request, res: Response) => {
  let flagList = await db("sfa.application").whereNotNull("flags").select("flags").distinct();
  let flags = uniq(flagList.flatMap((f) => f.flags.split(",")))
    .map((i) => i.trim())
    .filter((i) => !isEmpty(i));

  res.json({ data: flags });
});

applicationRouter.get("/flags/:flag", ReturnValidationErrors, async (req: Request, res: Response) => {
  try {
    const { flag } = req.params;
    let applications = await db("sfa.application")
      .leftJoin("sfa.institution_campus", "application.institution_campus_id", "institution_campus.id")
      .leftJoin("sfa.institution", "institution.id", "institution_campus.institution_id")
      .leftJoin("sfa.student", "student.id", "application.student_id")
      .leftJoin("sfa.person", "student.person_id", "person.id")
      .select("application.*")
      .select("institution.name as institution_name")
      .select("person.first_name")
      .select("person.last_name")
      .limit(150)
      .whereLike("flags", `%${flag}%`)
      .orderBy("updated_at", "desc");

    for (let item of applications) {
      item.title = `${item.first_name} ${item.last_name} - ${item.academic_year_id}: ${item.institution_name}`;
    }

    return res.json({ data: applications });
  } catch (error) {
    console.log("/all-ERR: ", error);
    res.status(404).send(error);
  }
});

applicationRouter.get("/:id", [param("id").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
  let { id } = req.params;

  let application = await db("sfa.application").select("sfa.application.*").where({ id }).first();

  if (application) {
    const student = await db("sfa.student")
      .innerJoin("sfa.person", "student.person_id", "person.id")
      .select("student.*")
      .select("person.first_name")
      .select("person.last_name")
      .where({ "student.id": application.student_id })
      .first();

    application.prev_pre_leg_weeks = application.prev_pre_leg_weeks ?? 22;
    application.funded_years_used_preleg_chg = application.funded_years_used_preleg_chg ?? 22;

    application.incomes = await db("sfa.income").where({ application_id: id });
    application.expenses = await db("sfa.expense").where({ application_id: id });
    application.disabilities = await db("sfa.disability").where({ application_id: id });
    application.disability_services = await db("sfa.disability_requirement").where({ application_id: id });
    application.disability_equipments = await db("sfa.equipment_required").where({ application_id: id });
    application.funding_requests = await db("sfa.funding_request")
      .where({ application_id: id })
      .orderBy("received_date");
    application.parent_dependents = await db("sfa.parent_dependent")
      .where({ application_id: id })
      .orderBy("birth_date");
    application.requirements = await db("sfa.requirement_met").where({ application_id: id }).orderBy("completed_date");
    application.other_funding = await db("sfa.agency_assistance").where({ application_id: id }).orderBy("id");
    application.yea = await db("sfa.yea").where({ yukon_id: student.yukon_id }).orderBy("school_year");
    application.institution = await db("sfa.institution_campus")
      .where({ id: application.institution_campus_id })
      .first();
    application.main_institution = await db("sfa.institution_campus")
      .innerJoin("sfa.institution", "institution.id", "institution_campus.institution_id")
      .select("institution.*")
      .where({ "institution_campus.id": application.institution_campus_id })
      .first();

    let field_program_code = await db("field_program")
      .withSchema("sfa")
      .innerJoin("study_area", "field_program.study_field_id", "study_area.study_field_id")
      .where({ "field_program.program_id": application.program_id, "study_area.id": application.study_area_id })
      .select("field_program_code")
      .first();

    application.field_program_code = field_program_code ? field_program_code.field_program_code : null;

    application.warning_code = await db("sfa.application as app")
      .innerJoin("sfa.csl_code as warning", function () {
        this.on("warning.id", "=", "csl_restriction_warn_id");
      })
      .select(
        "app.id",
        "csl_restriction_reason_id",
        "csl_restriction_warn_id",
        "warning.warning_code",
        "warning.code_type",
        "warning.definition"
      )
      .where("app.id", id)
      .first();

    application.reason_code = await db("sfa.application as app")
      .innerJoin("sfa.csl_code as reason", function () {
        this.on("reason.id", "=", "csl_restriction_reason_id");
      })
      .select(
        "app.id",
        "csl_restriction_reason_id",
        "csl_restriction_warn_id",
        "reason.reason_code",
        "reason.code_type",
        "reason.definition"
      )
      .where("app.id", id)
      .first();

    application.parent1 = await db("sfa.person")
      .leftJoin("sfa.person_address", "sfa.person.id", "sfa.person_address.person_id")
      .select(
        "sfa.person.*",
        "sfa.person_address.id AS person_address_id",
        "sfa.person_address.address_type_id",
        "sfa.person_address.address1",
        "sfa.person_address.address2",
        "sfa.person_address.city_id",
        "sfa.person_address.country_id",
        "sfa.person_address.province_id",
        "sfa.person_address.postal_code"
      )
      .where("sfa.person.id", application.parent1_id)
      .orderBy("sfa.person_address.address_type_id")
      .first();

    application.mailing_address = await db("sfa.person")
      .leftJoin("sfa.person_address", "sfa.person.id", "sfa.person_address.person_id")
      .select(
        "sfa.person.*",
        "sfa.person_address.id AS person_address_id",
        "sfa.person_address.address_type_id",
        "sfa.person_address.address1",
        "sfa.person_address.address2",
        "sfa.person_address.city_id",
        "sfa.person_address.country_id",
        "sfa.person_address.province_id",
        "sfa.person_address.postal_code"
      )
      .where("sfa.person.id", student.person_id)
      .andWhere("sfa.person_address.address_type_id", 4)
      .first();

    application.parent2 = await db("sfa.person").where({ id: application.parent2_id }).first();
    application.spouse_info = await db("sfa.person").where({ id: application.spouse_id }).first();
    application.agencies_assistance = await db("sfa.agency_assistance").where({ application_id: application.id });
    application.courses_enrolled = await db("sfa.course_enrolled").where({ application_id: application.id });

    for (let dep of application.parent_dependents) {
      if (dep.birth_date) dep.birth_date = moment(dep.birth_date).add(7, "hours").format("YYYY-MM-DD");
    }

    for (let dep of application.requirements) {
      if (dep.completed_date) dep.completed_date = moment(dep.completed_date).add(7, "hours").format("YYYY-MM-DD");
    }

    for (let dep of application.funding_requests) {
      if (dep.received_date) dep.received_date = moment(dep.received_date).add(7, "hours").format("YYYY-MM-DD");

      if (dep.status_date) dep.status_date = moment(dep.status_date).add(7, "hours").format("YYYY-MM-DD");
    }
    if (student) {
      student.consents = await db("sfa.student_consent")
        .where({ student_id: application.student_id })
        .orderBy("start_academic_year_id");
      student.residences = await db("sfa.residence")
        .where({ student_id: application.student_id })
        .orderBy("from_year")
        .orderBy("from_month");
      student.dependents = await db("sfa.dependent")
        .where({ student_id: application.student_id })
        .orderBy("birth_date");

      for (let dep of student.dependents) {
        let elg = await db("sfa.dependent_eligibility").where({ application_id: id, dependent_id: dep.id }).first();
        dep.eligibility = elg || {};

        if (dep.birth_date) dep.birth_date = moment(dep.birth_date).add(7, "hours").format("YYYY-MM-DD");
      }

      student.applications = await db("sfa.application")
        .innerJoin("sfa.institution_campus", "application.institution_campus_id", "institution_campus.id")
        .innerJoin("sfa.institution", "institution.id", "institution_campus.institution_id")
        .select("application.*")
        .select("institution.name as institution_name")
        .where({ student_id: student.id })
        .orderBy("academic_year_id", "desc");

      for (let item of student.applications) {
        item.title = `${item.academic_year_id}: ${item.institution_name}`;
      }

      if (student.birth_date) {
        student.birth_date = moment(student.birth_date).utc(false).format("YYYY-MM-DD");
      }

      const readOnlyData = await db.raw(
        `SELECT COALESCE(sfa.fn_get_yea_total(${student.yukon_id}), 0) AS yea_earned,
          COALESCE(sfa.fn_get_system_yea_used(${student.id}), 0) AS yea_used`
      );

      application.calculated_data = readOnlyData?.[0] || {};
      application.student = student;

      await db("sfa.application").where({ id: application.id }).update({ seen: true });

      return res.json({ data: application });
    }
  }

  res.status(404).send();
});

applicationRouter.get(
  "/:id/required-documents",
  [param("id").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    let { id } = req.params;

    let application = await db("sfa.application").where({ id }).first();

    if (application) {
      let docs = await documentationService.getRequiredDocumentsForApplication(parseInt(id), application);
      return res.json({ data: docs });
    }

    res.status(404).send();
  }
);

applicationRouter.delete(
  "/:id",
  [param("id").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    let disbursements = await db("sfa.disbursement")
      .join("sfa.funding_request", "funding_request.id", "disbursement.funding_request_id")
      .where("funding_request.application_id", id)
      .select("disbursement.*");

    if (disbursements.length > 0) {
      return res.status(400).json({
        data: {},
        messages: [{ variant: "error", text: "This application has disbursements and cannot be deleted" }],
      });
    }

    let fundingRequests = await db("sfa.funding_request").where({ application_id: id }).select("id");
    let frIds = fundingRequests.map((r) => r.id);

    let msfaas = await db("sfa.msfaa").where({ application_id: id }).select("id");
    let msIds = msfaas.map((r) => r.id);

    let trx = await db.transaction();

    try {
      let d1 = trx("sfa.agency_assistance").where({ application_id: id }).delete();
      let d2 = trx("sfa.application_part_time_reason").where({ application_id: id }).delete();
      let d3 = trx("sfa.course_enrolled").where({ application_id: id }).delete();
      let d4 = trx("sfa.dependent_eligibility").where({ application_id: id }).delete();
      let d5 = trx("sfa.disability").where({ application_id: id }).delete();
      let d6 = trx("sfa.disability_requirement").where({ application_id: id }).delete();
      let d7 = trx("sfa.equipment_required").where({ application_id: id }).delete();
      let d8 = trx("sfa.expense").where({ application_id: id }).delete();
      let d9 = trx("sfa.income").where({ application_id: id }).delete();
      let d10 = trx("sfa.investment").where({ application_id: id }).delete();
      let d11 = trx("sfa.parent_dependent").where({ application_id: id }).delete();
      let d12 = trx("sfa.parent_resident").where({ application_id: id }).delete();
      let d13 = trx("sfa.requirement_met").where({ application_id: id }).delete();
      let d14 = trx("sfa.file_reference").where({ application_id: id }).update({ application_id: null });
      let d15 = trx("sfa.csl_nars_history").where({ application_id: id }).delete();
      let d16 = trx("sfa.disbursement").whereIn("funding_request_id", frIds).delete();
      let d17 = trx("sfa.assessment").whereIn("funding_request_id", frIds).delete();
      let d18 = trx("sfa.msfaa_email_log").whereIn("msfaa_id", msIds).delete();
      let d19 = trx("sfa.communication_log").whereIn("msfaa_id", msIds).delete();

      Promise.all([d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12, d13, d14, d15, d16, d17, d18, d19])
        .then(async () => {
          let d20 = trx("sfa.funding_request").where({ application_id: id }).delete();
          let d21 = trx("sfa.msfaa").where({ application_id: id }).delete();

          await Promise.all([d20, d21]).then(async () => {
            await trx("sfa.application").where({ id }).delete();
            await trx.commit();
            return res.json({ data: {}, messages: [{ variant: "success", text: "Application deleted" }] });
          });
        })
        .catch(async (err) => {
          await trx.rollback();
          console.log("ERROR DELETING, ROLLBACK", err.message);
          return res
            .status(500)
            .json({ data: {}, messages: [{ variant: "error", text: "Error deleting application: " + err.message }] });
        });
    } catch (e: any) {
      await trx.rollback();
      return res
        .status(500)
        .json({ data: {}, messages: [{ variant: "error", text: "Error deleting application: " + e.message }] });
    }
  }
);

applicationRouter.put("/:id", [param("id").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
  let { id } = req.params;

  db("sfa.application")
    .where({ id })
    .update(req.body)
    .then((result: any) => {
      res.json({ messages: [{ variant: "success", text: "Application saved" }] });
    })
    .catch((err: any) => {
      console.log("FAILED", err);
      res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    });
});

applicationRouter.post(
  "/:application_id/status",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;
    const {
      request_type_id = null,
      received_date = null,
      status_id = null,
      status_reason_id = null,
      status_date = null,
      comments = null,
    } = req.body;

    try {
      const application: any = await db("sfa.application").where({ id: application_id }).first();

      if (application) {
        const newRecord = {
          request_type_id,
          received_date,
          status_id,
          status_reason_id,
          status_date,
          comments,
        };

        // see if this application already has this funding request
        const checkIfExist = await db("sfa.funding_request").where({ request_type_id, application_id }).first();

        if (checkIfExist) {
          return res.json({
            messages: [{ variant: "error", text: "A record already exist with the same information" }],
          });
        }

        // make sure request type is active
        const checkIsActive = await db("sfa.request_type").where("id", request_type_id).first();

        if (checkIsActive?.is_active) {
          if (newRecord.request_type_id === 1) {
            const isSTACandidate = await db("sfa.institution_campus")
              .where({ id: application.institution_campus_id })
              .whereIn("institution_id", [30, 811, 852]) // Alkan, Yukon College, Yukon University
              .first();

            if (!isSTACandidate?.id) {
              return res.json({
                messages: [{ variant: "error", text: "Only available for Yukon University or Alkan Air" }],
              });
            }
          }

          const resInsert = await db("sfa.funding_request").insert({
            ...newRecord,
            is_csg_only: false,
            application_id,
            status_id: 2,
          });

          return resInsert
            ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
            : res.json({ messages: [{ variant: "error", text: "Failed" }] });
        } else {
          res.json({ messages: [{ variant: "error", text: "Request Type is not active" }] });
        }
      }

      return res.json({ messages: [{ text: "Application does not exist", variant: "error" }] });
    } catch (error) {
      return res.json({ messages: [{ text: "Failed to insert Funding Request", variant: "error" }] });
    }
  }
);

// downloads a document
applicationRouter.get("/:application_id/student/:student_id/files/:file_type", async (req: Request, res: Response) => {
  const { student_id, application_id, file_type } = req.params;

  //* Ordenar descendente mas nuevo a mas viejo
  let doc: any = await db("sfa.file_reference")
    .where({ application_id: application_id })
    .andWhere({ student_id: student_id })
    .andWhere({ requirement_type_id: file_type })
    .orderBy("upload_date", "desc")
    .first();

  if (doc) {
    let fileReference = await documentService.getDocumentWithFile(doc.object_key);

    if (
      fileReference &&
      fileReference.student_id == parseInt(student_id) &&
      fileReference.application_id == parseInt(application_id)
    ) {
      res.set("Content-disposition", "attachment; filename=" + fileReference.file_name);
      res.set("Content-type", fileReference.mime_type);
      return res.send(fileReference.file_contents);
    }
  }

  res.status(404).send();
});

// downloads a document
applicationRouter.get(
  "/:application_id/student/:student_id/files_id/:object_key",
  async (req: Request, res: Response) => {
    const { student_id, application_id, object_key } = req.params;

    let fileReference = await documentService.getDocumentWithFile(object_key);

    if (
      fileReference &&
      fileReference.student_id == parseInt(student_id) &&
      fileReference.application_id == parseInt(application_id)
    ) {
      res.set("Content-disposition", "attachment; filename=" + fileReference.file_name);
      res.set("Content-type", fileReference.mime_type);
      return res.send(fileReference.file_contents);
    }

    res.status(404).send();
  }
);
// downloads a document
applicationRouter.get("/student/:student_id/files_id/:object_key", async (req: Request, res: Response) => {
  const { student_id, object_key } = req.params;

  let fileReference = await documentService.getDocumentWithFile(object_key);

  if (fileReference && fileReference.student_id == parseInt(student_id)) {
    res.set("Content-disposition", "attachment; filename=" + fileReference.file_name);
    res.set("Content-type", fileReference.mime_type);
    return res.send(fileReference.file_contents);
  }

  res.status(404).send();
});

// downloads a document pdf
applicationRouter.get(
  "/:application_id/student/:student_id/files_id_pdf/:object_key_pdf",
  async (req: Request, res: Response) => {
    const { student_id, application_id, object_key_pdf } = req.params;

    let fileReference = await documentService.getPdfDocumentWithFile(object_key_pdf);

    if (
      fileReference &&
      fileReference.student_id == parseInt(student_id) &&
      fileReference.application_id == parseInt(application_id)
    ) {
      res.set("Content-disposition", "attachment; filename=" + `${fileReference.file_name}.pdf`);
      res.set("Content-type", "application/pdf");
      return res.send(fileReference.file_contents);
    }

    res.status(404).send();
  }
);

// updates a document
applicationRouter.put("/:application_id/student/:student_id/files/:object_key", async (req: Request, res: Response) => {
  const { student_id, application_id, object_key } = req.params;
  let { upload_date, status, status_date, comment } = req.body;

  let fileReference = await documentService.getDocument(object_key);

  if (
    fileReference &&
    fileReference.student_id == parseInt(student_id) &&
    fileReference.application_id == parseInt(application_id)
  ) {
    await documentService.updateDocument(object_key, { upload_date, status, status_date, comment });
    return res.json({ messages: [{ variant: "success", text: "Documentation Saved" }] });
  }

  res.status(404).send();
});

// updates a document
applicationRouter.put("/student/:student_id/files/:object_key", async (req: Request, res: Response) => {
  const { student_id, object_key } = req.params;
  let { upload_date, status, status_date, comment } = req.body;

  let fileReference = await documentService.getDocument(object_key);

  if (fileReference && fileReference.student_id == parseInt(student_id)) {
    await documentService.updateDocument(object_key, { upload_date, status, status_date, comment });
    return res.json({ messages: [{ variant: "success", text: "Documentation Saved" }] });
  }

  res.status(404).send();
});

// uploads a file
applicationRouter.post("/:application_id/student/:student_id/files", async (req: Request, res: Response) => {
  const { student_id, application_id } = req.params;
  const { requirement_type_id, disability_requirement_id, person_id, dependent_id, comment, status } = req.body;

  if (req.files) {
    let files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

    for (let file of files) {
      let newFile = await documentService.uploadApplicationDocument({
        email: req.user.email,
        student_id: parseInt(student_id.toString()),
        application_id: parseInt(application_id.toString()),
        file,
        requirement_type_id,
        disability_requirement_id,
        person_id,
        dependent_id,
        comment,
        source: "Admin",
        status,
        visible_in_portal: true,
      });
    }

    return res.json({ messages: [{ variant: "success", text: "Saved" }] });
  }
  res.json({ error: "No files included in request" });
});

// deletes a file
applicationRouter.delete(
  "/:application_id/student/:student_id/files/:object_key",
  async (req: Request, res: Response) => {
    const { student_id, application_id, object_key } = req.params;
    let fileRef = await documentService.getDocument(object_key);

    if (fileRef) {
      await documentService.removeDocument(object_key);
    }

    res.status(200).send();
  }
);

// updates _met
applicationRouter.post(
  "/:application_id/student/:student_id/files/:requirement_type_id",
  [
    param("application_id").isInt().notEmpty(),
    param("student_id").isInt().notEmpty(),
    param("requirement_type_id").isInt().notEmpty(),
  ],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, student_id, requirement_type_id } = req.params;
      let { completed_date, data } = req.body;
      const application: any = await db("sfa.file_reference")
        .where({ application_id: application_id })
        .andWhere({ student_id: student_id })
        .andWhere({ requirement_type_id: requirement_type_id })
        .first();

      const alreadyExist: any = await db("sfa.requirement_met")
        .where({ application_id: application_id })
        .andWhere({ requirement_type_id: requirement_type_id })
        .first();
      const compDate = completed_date;

      if (application) {
        if (alreadyExist) {
          try {
            const appId = application_id;
            const resUpdate = await db("sfa.requirement_met")
              .where({ application_id: application_id })
              .andWhere({ requirement_type_id: requirement_type_id })
              //.update({ ...data });
              .update({ completed_date: completed_date && completed_date !== "null" ? completed_date : null });

            return resUpdate
              ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
              : res.json({ messages: [{ variant: "error", text: "Failed" }] });
          } catch (error) {
            return res.json({ messages: [{ text: "Failed to update Funding Request", variant: "error" }] });
          }
        } else {
          let resInsert;
          try {
            resInsert = await db("sfa.requirement_met").insert({
              completed_date: completed_date && completed_date !== "null" ? completed_date : null,
              requirement_type_id,
              application_id,
            });
          } catch (error) {
            console.log(error);
            return res.json({ messages: [{ variant: "error", text: "Failed to update Funding Request" }] });
          }
          return resInsert
            ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
            : res.json({ messages: [{ variant: "error", text: "Save failed" }] });
        }
      }

      return res.status(404).send();
    } catch (error) {
      console.error(error);
      return res.status(400).send(error);
    }
  }
);

// downloads a document with extra parameters
applicationRouter.get(
  "/:application_id/student/:student_id/files/:file_type/fellow_type/:fellow_type/fellow/:fellow",
  async (req: Request, res: Response) => {
    const { student_id, application_id, file_type, fellow_type, fellow } = req.params;

    let doc: any;
    switch (fellow_type) {
      case "dependent":
        doc = await db("sfa.file_reference")
          .where({ application_id: application_id })
          .andWhere({ student_id: student_id })
          .andWhere({ requirement_type_id: file_type })
          .andWhere({ dependent_id: fellow })
          .orderBy("upload_date", "desc")
          .first();
        break;
      case "parent":
        doc = await db("sfa.file_reference")
          .where({ application_id: application_id })
          .andWhere({ student_id: student_id })
          .andWhere({ requirement_type_id: file_type })
          .andWhere({ fellow_type: fellow })
          .orderBy("upload_date", "desc")
          .first();
        break;
    }

    if (doc) {
      let fileReference = await documentService.getDocumentWithFile(doc.object_key);

      if (
        fileReference &&
        fileReference.student_id == parseInt(student_id) &&
        fileReference.application_id == parseInt(application_id)
      ) {
        res.set("Content-disposition", "attachment; filename=" + fileReference.file_name);
        res.set("Content-type", fileReference.mime_type);
        return res.send(fileReference.file_contents);
      }
    }

    res.status(404).send();
  }
);

// updates the status of a funding request
applicationRouter.put(
  "/:application_id/status/:id",
  [param("application_id").isInt().notEmpty(), param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id, id } = req.params;
    const { data } = req.body;

    if (data.status_id || data.status_reason_id) {
      data.status_date = new Date();
    }

    try {
      const resUpdate = await db("sfa.funding_request")
        .where({ id, application_id })
        .update({ ...data });

      if (resUpdate) {
        await db("sfa.application")
          .where({ id: application_id })
          .update({ seen: true, updated_at: new Date().toISOString() });
      }

      return resUpdate
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ text: "Failed to update Funding Request", variant: "error" }] });
    }
  }
);

// deletes a funding request along with the disbursements and assessments
applicationRouter.delete(
  "/:id/status",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const verifyRecord: any = await db("sfa.funding_request").where({ id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ messages: [{ variant: "error", text: "The record does not exits" }] });
      }

      await db("sfa.disbursement").where({ funding_request_id: id }).del();
      await db("sfa.assessment").where({ funding_request_id: id }).del();
      const deleteRecord: any = await db("sfa.funding_request").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.put(
  "/:application_id/parent-dependent/:id",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, id } = req.params;
      const { data } = req.body;

      if (!Object.values(data).length || Object.values(data).some((v) => v === null || v === undefined)) {
        return res.json({ messages: [{ variant: "error", text: "The value is required" }] });
      }

      const application: any = await db("sfa.application").where({ id: application_id }).first();

      if (application) {
        const resUpdate = await db("sfa.parent_dependent")
          .where({ application_id, id })
          .update({ ...data });

        return resUpdate > 0
          ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
          : res.json({ messages: [{ variant: "error", text: "Save failed" }] });
      }

      return res.status(404).send();
    } catch (error) {
      console.error(error);
      return res.status(400).send(error);
    }
  }
);

applicationRouter.post(
  "/:application_id/parent-dependent",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data } = req.body;

      if (!Object.values(data).length) {
        return res.json({ messages: [{ variant: "error", text: "The value is required" }] });
      }

      const application: any = await db("sfa.application").where({ id: application_id }).first();

      if (application) {
        const resInsert = await db("sfa.parent_dependent").insert({ ...data, application_id });

        return resInsert
          ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
          : res.json({ messages: [{ variant: "error", text: "Save failed" }] });
      }

      return res.status(404).send();
    } catch (error) {
      console.error(error);
      return res.status(400).send(error);
    }
  }
);

applicationRouter.delete(
  "/:id/parent-dependent",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;

    try {
      const verifyRecord: any = await db("sfa.parent_dependent").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      const deleteRecord: any = await db("sfa.parent_dependent").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/person",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data, typeId } = req.body;

      const types: any = {
        spouse_id: "spouse_id",
        parent1_id: "parent1_id",
        parent2_id: "parent2_id",
      };

      if (!types[typeId]) {
        return res.json({ messages: [{ variant: "error", text: "type Id is required" }] });
      }

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      await db.transaction(async (trx) => {
        const [resInsert] = await Promise.all([
          trx("sfa.person")
            .insert({ ...data })
            .returning("*"),
        ]);

        if (resInsert) {
          const resUpdate = await trx("sfa.application")
            .update(types[typeId], resInsert[0].id)
            .where({ id: application_id })
            .returning("*");

          return res.json({ messages: [{ variant: "success", text: "Inserted" }] });
        } else {
          res.json({ messages: [{ variant: "error", text: "Failed to update" }] });
        }
      });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/person-address",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data, addressTypeId = 4 } = req.body;
      let { personAddressId = null } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }
      if (personAddressId) {
        let student_id = null;
        if (data.student_id) {
          student_id = data.student_id;
          delete data.student_id;
        }

        const resInsertPA = await db("sfa.person_address")
          //.insert({ ...data, address_type_id: addressTypeId, person_id: student_id, is_active: true })
          .insert({ ...data, address_type_id: addressTypeId, person_id: personAddressId, is_active: true })
          .returning("*");

        return res.json({ messages: [{ variant: "success", text: "Inserted" }] });
      } else {
        await db.transaction(async (trx) => {
          const [resInsert] = await Promise.all([trx("sfa.person").insert({ first_name: "" }).returning("*")]);

          if (resInsert) {
            const resUpdateA = await trx("sfa.application")
              .update("parent1_id", resInsert[0].id)
              .where({ id: application_id })
              .returning("*");

            const resInsertPA = await trx("sfa.person_address")
              .insert({ ...data, person_id: resInsert[0].id, address_type_id: addressTypeId, is_active: true })
              .returning("*");

            return res.json({ messages: [{ variant: "success", text: "Inserted" }] });
          } else {
            res.json({ messages: [{ variant: "error", text: "Failed to update" }] });
          }
        });
      }
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.patch(
  "/:person_address_id/person-address",
  [param("person_address_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { person_address_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      let student_id = null;
      if (data.student_id) {
        student_id = data.student_id;
        delete data.student_id;
      }
      const resUpdate = await db("sfa.person_address")
        .update({ ...data, is_active: true })
        .where({ id: person_address_id })
        .returning("*");

      return res.json({ messages: [{ variant: "success", text: "Inserted" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/agency-assistance",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      if (data?.amount === "" || data?.amount === null || isNaN(data?.amount)) {
        data.amount = 0;
      }

      if (!data?.agency_id) {
        return res.json({ messages: [{ variant: "error", text: "Agency Id is required" }] });
      }

      data.is_tuition = !!data?.is_tuition;
      data.is_living_expenses = !!data?.is_living_expenses;
      data.is_books = !!data?.is_books;
      data.is_transportation = !!data?.is_transportation;

      const verifyAgency = await db("sfa.agency_assistance").where({ application_id, agency_id: data.agency_id });

      if (verifyAgency?.length) {
        return res.json({ messages: [{ variant: "error", text: "The Agency already exists" }] });
      }

      const resInsert = await db("sfa.agency_assistance").insert({ ...data, application_id });

      return resInsert
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.patch(
  "/:application_id/agency-assistance/:id",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, id } = req.params;
      const { data } = req.body;

      if (Object.keys(data).some((k) => k === "agency_id")) {
        const verifyAgency = await db("sfa.agency_assistance").where({ application_id, agency_id: data.agency_id });

        if (verifyAgency?.length) {
          return res.json({ messages: [{ variant: "error", text: "The Agency already exists" }] });
        }
      }

      if (Object.keys(data).some((k) => k === "amount")) {
        if (data?.amount === "" || data?.amount === null || isNaN(data?.amount)) {
          data.amount = 0;
        }
      }

      const resUpdate = await db("sfa.agency_assistance")
        .where({ id, application_id })
        .update({ ...data });

      return resUpdate
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.delete(
  "/:id/agency-assistance",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;

    try {
      const verifyRecord: any = await db("sfa.agency_assistance").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      const deleteRecord: any = await db("sfa.agency_assistance").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/course",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      if (data?.description === "" || data?.description === null) {
        return res.json({ messages: [{ variant: "error", text: "Description is required" }] });
      }

      if (!data?.instruction_type_id) {
        return res.json({ messages: [{ variant: "error", text: "Instruction Type is required" }] });
      }

      const resInsert = await db("sfa.course_enrolled").insert({ ...data, application_id });

      return resInsert
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.patch(
  "/:application_id/course/:id",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, id } = req.params;
      const { data } = req.body;

      if (Object.keys(data).some((k) => k === "description")) {
        if (!data?.description?.length) {
          return res.json({ messages: [{ variant: "error", text: "Description is required" }] });
        }
      }

      if (Object.keys(data).some((k) => k === "description")) {
        if (!data?.description?.length) {
          return res.json({ messages: [{ variant: "error", text: "Description is required" }] });
        }
      }

      if (Object.keys(data).some((k) => k === "instruction_type_id")) {
        if (
          data?.instruction_type_id === "" ||
          data?.instruction_type_id === null ||
          isNaN(data?.instruction_type_id)
        ) {
          return res.json({ messages: [{ variant: "error", text: "Instruction Type is required" }] });
        }
      }

      const resUpdate = await db("sfa.course_enrolled")
        .where({ id, application_id })
        .update({ ...data });

      return resUpdate
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.delete(
  "/:id/course",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;

    try {
      const verifyRecord: any = await db("sfa.course_enrolled").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      const deleteRecord: any = await db("sfa.course_enrolled").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.get("/yea/all", async (req: Request, res: Response) => {
  const { last_name = "" } = req.query;

  try {
    const results = await db("sfa.yea").where("last_name", last_name).orderBy("sfa.yea.first_name");

    if (results) {
      return res.status(200).json({ success: true, data: [...results] });
    } else {
      return res.status(404).send();
    }
  } catch (error: any) {
    console.log(error);
    return res.status(404).send();
  }
});

applicationRouter.post(
  "/:application_id/income",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      if (data?.amount === "" || data?.amount === null || (!data?.amount && data?.amount !== 0)) {
        data.amount = 0;
      }

      const resInsert = await db("sfa.income").insert({ ...data, application_id });

      return resInsert
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.patch(
  "/:application_id/income/:id",
  [param("application_id").isInt().notEmpty(), param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, id } = req.params;
      const { data } = req.body;

      if (Object.keys(data).some((k) => k === "amount")) {
        if (data.amount === null || data.amount === "") {
          data.amount = 0;
        }
      }

      if (Object.keys(data).some((k) => k === "income_type_id")) {
        if (data?.income_type_id === "" || data?.income_type_id === null || isNaN(data?.income_type_id)) {
          return res.json({ messages: [{ variant: "error", text: "Income Type is required" }] });
        }
      }

      const resUpdate = await db("sfa.income")
        .where({ id, application_id })
        .update({ ...data });

      return resUpdate
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.delete(
  "/income/:id",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;

    try {
      const verifyRecord: any = await db("sfa.income").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      const deleteRecord: any = await db("sfa.income").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/expense",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      if (data?.amount === "" || data?.amount === null || (!data?.amount && data?.amount !== 0)) {
        data.amount = 0;
      }
      if (!data?.period_id || !Number(data.period_id)) {
        return res.json({ messages: [{ variant: "error", text: "Period is required" }] });
      }

      const resInsert = await db("sfa.expense").insert({ ...data, application_id });

      return resInsert
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.patch(
  "/:application_id/expense/:id",
  [param("application_id").isInt().notEmpty(), param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, id } = req.params;
      const { data } = req.body;

      if (Object.keys(data).some((k) => k === "amount")) {
        if (data.amount === null || data.amount === "") {
          data.amount = 0;
        }
      }

      if (Object.keys(data).some((k) => k === "period_id")) {
        if (!data.period_id || !Number(data.period_id)) {
          return res.json({ messages: [{ variant: "error", text: "Period is required" }] });
        }
      }

      const resUpdate = await db("sfa.expense")
        .where({ id, application_id })
        .update({ ...data });

      return resUpdate
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.delete(
  "/expense/:id",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;

    try {
      const verifyRecord: any = await db("sfa.expense").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      const deleteRecord: any = await db("sfa.expense").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/disability",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      if (!data?.disability_type_id || !Number(data.disability_type_id)) {
        return res.json({ messages: [{ variant: "error", text: "Disability Type is required" }] });
      }

      if (!data?.verified_disability_need) {
        data.verified_disability_need = false;
      }

      const resInsert = await db("sfa.disability").insert({ ...data, application_id });

      return resInsert
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.patch(
  "/:application_id/disability/:id",
  [param("application_id").isInt().notEmpty(), param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, id } = req.params;
      const { data } = req.body;

      if (Object.keys(data).some((k) => k === "disability_type_id")) {
        if (!data?.disability_type_id || !Number(data.disability_type_id)) {
          return res.json({ messages: [{ variant: "error", text: "Disability Type is required" }] });
        }
      }

      if (Object.keys(data).some((k) => k === "verified_disability_need")) {
        if (!Boolean(data?.verified_disability_need)) {
          data.verified_disability_need = false;
        }
      }

      const resUpdate = await db("sfa.disability")
        .where({ id, application_id })
        .update({ ...data });

      return resUpdate
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.delete(
  "/disability/:id",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;

    try {
      const verifyRecord: any = await db("sfa.disability").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      const deleteRecord: any = await db("sfa.disability").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/disability-service",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      if (!data?.disability_service_id || !Number(data.disability_service_id)) {
        return res.json({ messages: [{ variant: "error", text: "Disability Service is required" }] });
      }

      if (!data?.verified_service_need) {
        data.verified_service_need = false;
      }

      const resInsert = await db("sfa.disability_requirement").insert({ ...data, application_id });

      return resInsert
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.patch(
  "/:application_id/disability-service/:id",
  [param("application_id").isInt().notEmpty(), param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, id } = req.params;
      const { data } = req.body;

      if (Object.keys(data).some((k) => k === "disability_service_id")) {
        if (!data?.disability_service_id || !Number(data.disability_service_id)) {
          return res.json({ messages: [{ variant: "error", text: "Disability Type is required" }] });
        }
      }

      if (Object.keys(data).some((k) => k === "verified_service_need")) {
        if (!Boolean(data?.verified_service_need)) {
          data.verified_service_need = false;
        }
      }

      const resUpdate = await db("sfa.disability_requirement")
        .where({ id, application_id })
        .update({ ...data });

      return resUpdate
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.delete(
  "/disability-service/:id",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;

    try {
      const verifyRecord: any = await db("sfa.disability_requirement").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      const deleteRecord: any = await db("sfa.disability_requirement").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/disability-equipment",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      if (!data?.equipment_category_id || !Number(data.equipment_category_id)) {
        return res.json({ messages: [{ variant: "error", text: "Equipment Category is required" }] });
      }

      if (!data?.verified_equipment_need) {
        data.verified_equipment_need = false;
      }

      const resInsert = await db("sfa.equipment_required").insert({ ...data, application_id });

      return resInsert
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.patch(
  "/:application_id/disability-equipment/:id",
  [param("application_id").isInt().notEmpty(), param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, id } = req.params;
      const { data } = req.body;

      if (Object.keys(data).some((k) => k === "equipment_category_id")) {
        if (!data?.equipment_category_id || !Number(data.equipment_category_id)) {
          return res.json({ messages: [{ variant: "error", text: "Equipment Category is required" }] });
        }
      }

      if (Object.keys(data).some((k) => k === "verified_equipment_need")) {
        if (!Boolean(data?.verified_equipment_need)) {
          data.verified_equipment_need = false;
        }
      }

      const resUpdate = await db("sfa.equipment_required")
        .where({ id, application_id })
        .update({ ...data });

      return resUpdate
        ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
        : res.json({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

applicationRouter.get(
  "/:applicationId/funding-request/:fundingRequestId/letters",
  [param("applicationId").isInt().notEmpty(), param("fundingRequestId").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { applicationId, fundingRequestId } = req.params;
    let letters = await documentService.getDocumentsForFundingRequest(parseInt(fundingRequestId));
    res.json({ data: letters });
  }
);

applicationRouter.get(
  "/:applicationId/funding-request/:fundingRequestId/letters/:object_key",
  [param("applicationId").isInt().notEmpty(), param("fundingRequestId").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { fundingRequestId, object_key } = req.params;
    let letters = await documentService.getDocumentsForFundingRequest(parseInt(fundingRequestId));
    let letter = letters.filter((l) => l.object_key == object_key);

    if (letter.length > 0) {
      let fileReference = await documentService.getDocumentWithFile(object_key);

      if (fileReference) {
        res.set("Content-disposition", "attachment; filename=" + fileReference.file_name);
        res.set("Content-type", fileReference.mime_type);
        return res.send(fileReference.file_contents);
      }
    }

    res.status(404).send;
  }
);

applicationRouter.put(
  "/:applicationId/funding-request/:fundingRequestId/letters/:object_key",
  [param("applicationId").isInt().notEmpty(), param("fundingRequestId").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { fundingRequestId, object_key } = req.params;
    let letters = await documentService.getDocumentsForFundingRequest(parseInt(fundingRequestId));
    let letter = letters.filter((l) => l.object_key == object_key);

    if (letter.length > 0) {
      await documentService.updateDocument(object_key, req.body);
      res.json({ data: "Success" });
    }

    res.status(404).send;
  }
);

applicationRouter.delete(
  "/:applicationId/funding-request/:fundingRequestId/letters/:object_key",
  [param("applicationId").isInt().notEmpty(), param("fundingRequestId").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { fundingRequestId, object_key } = req.params;
    let letters = await documentService.getDocumentsForFundingRequest(parseInt(fundingRequestId));
    let letter = letters.filter((l) => l.object_key == object_key);

    if (letter.length > 0) {
      await documentService.removeDocument(object_key);
      return res.status(200).send();
    }

    res.status(404).send;
  }
);

applicationRouter.post(
  "/:applicationId/funding-request/:fundingRequestId/letter-upload",
  [param("applicationId").isInt().notEmpty(), param("fundingRequestId").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { applicationId, fundingRequestId } = req.params;

    let application = await db("sfa.application").where({ id: applicationId }).first();

    if (application && req.files) {
      let file = isArray(req.files.file) ? req.files.file[0] : req.files.file;

      if (file) {
        await documentService.uploadApplicationDocument({
          email: req.user.email,
          student_id: parseInt(application.student_id.toString()),
          application_id: parseInt(applicationId.toString()),
          file,
          source: "Admin",
          status: DocumentStatus.APPROVED,
          funding_request_id: parseInt(fundingRequestId.toString()),
          visible_in_portal: true,
        });

        return res.status(201).send();
      }
    }

    res.status(404).send();
  }
);

applicationRouter.delete(
  "/disability-equipment/:id",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;

    try {
      const verifyRecord: any = await db("sfa.equipment_required").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      const deleteRecord: any = await db("sfa.equipment_required").where({ id: id }).del();

      return deleteRecord > 0
        ? res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
        : res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });
    } catch (error: any) {
      console.log(error);

      if (error?.number === 547) {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
      }

      return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
    }
  }
);

applicationRouter.get(
  "/:application_id/:funding_request_id/assessments",
  [param("application_id").isInt().notEmpty(), param("funding_request_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, funding_request_id } = req.params;

      const application = await db("sfa.application").where({ id: application_id }).first();

      const fundingRequest = await db("sfa.funding_request")
        .where({ application_id })
        .where({ id: funding_request_id })
        .first();

      const student = await db("sfa.student").where({ "student.id": application.student_id }).first();

      if (application && fundingRequest) {
        const getAsessment = await db("sfa.assessment").where({ funding_request_id });

        if (getAsessment?.length) {
          for (let item of getAsessment) {
            const readOnlyData = await db.raw(
              `SELECT 
                            COALESCE(sfa.fn_get_previous_weeks_yg(${
                              application.student_id
                            },  ${application_id}), 0) AS previous_weeks,
                            COALESCE(sfa.fn_get_allowed_weeks ('${moment(
                              getAsessment[0].classes_start_date?.toISOString().slice(0, 10)
                            ).format("YYYY-MM-DD")}', '${moment(
                getAsessment[0].classes_end_date?.toISOString().slice(0, 10)
              ).format("YYYY-MM-DD")}'), 0) AS assessed_weeks,
                            COALESCE(sfa.fn_get_disbursed_amount_fct(${funding_request_id}, ${
                item.id
              }), 0) AS previous_disbursement,
                            COALESCE(sfa.fn_net_amount(${funding_request_id}, ${item.id}), 0) AS net_amount,
                            COALESCE(sfa.fn_get_total_funded_years ( ${
                              application.student_id
                            }, ${application_id}), 0) AS years_funded,
                            COALESCE(sfa.fn_get_yea_total(${student.yukon_id}), 0) AS yea_earned,
                            COALESCE(sfa.fn_get_system_yea_used(${student.id}), 0) AS yea_used;
                            `
            );

            item.read_only_data = readOnlyData?.[0] || {};
            item.read_only_data.assessed_weeks = weeksBetween(
              application.classes_start_date,
              application.classes_end_date
            );

            const yea_balance = item.read_only_data.yea_earned - item.read_only_data.yea_used;
            const unused_receipts = min([
              min([application.yea_tot_receipt_amount || 0, yea_balance]),
              fundingRequest.yea_request_amount,
            ]);
            const assessed_amount = unused_receipts + item.read_only_data.previous_disbursement;
            const yea_net_amount = assessed_amount - item.read_only_data.previous_disbursement;

            item.read_only_data = {
              yea_net_amount,
              yea_balance,
              unused_receipts,
              assessed_amount,
              ...item.read_only_data,
            };
          }
        }

        const listAssessment = getAsessment.map((a, index) => {
          return {
            name_assessment: `assessment ${index + 1} - ${a.id}`,
            ...a,
          };
        });

        return res.json({
          messages: [{ variant: "success" }],
          data: [...listAssessment],
        });
      } else {
        return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/:funding_request_id/assessments",
  [param("application_id").isInt().notEmpty(), param("funding_request_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, funding_request_id } = req.params;
      const { dataAssessment = null, dataApplication = null } = req.body;

      const application = await db("sfa.application").where({ id: application_id }).first();

      if (application) {
        const fundingRequest = await db("sfa.funding_request")
          .where({ application_id })
          .where({ id: funding_request_id })
          .first();

        if (fundingRequest?.request_type_id === 2) {
          // Create Assessment YG

          db.transaction(async (trx) => {
            const resSP = await db.raw(
              `EXEC sfa.sp_get_init_value ${funding_request_id}, ${application.id}, ${application.student_id};`
            );

            if (resSP?.[0]?.status) {
              if (dataAssessment) {
                delete dataAssessment.read_only_data;
                delete dataAssessment.id;
                delete dataAssessment.assessment_id;
                delete dataAssessment.program_division;
                delete dataAssessment.unused_receipts;
                delete dataAssessment.yea_balance;
                delete dataAssessment.yea_net_amount;
                delete dataAssessment.yea_used;
                delete dataAssessment.yea_earned;

                const resUpdate = await db("sfa.assessment")
                  .where({ id: resSP[0].assessment_id_inserted })
                  .update({ ...dataAssessment });

                const updateStatusFundingRequest = await db("sfa.funding_request")
                  .where({ id: funding_request_id })
                  .update({ status_id: 7 });

                return resUpdate
                  ? res.json({
                      messages: [{ variant: "success" }],
                      data: [...resSP],
                    })
                  : res.json({
                      messages: [{ variant: "success", text: "Failed to update values" }],
                      data: [[...resSP]],
                    });
              } else {
                const updateStatusFundingRequest = await db("sfa.funding_request")
                  .where({ id: funding_request_id })
                  .update({ status_id: 7 });

                return res.json({
                  messages: [{ variant: "success" }],
                  data: [...resSP],
                });
              }
            } else {
              return res.json({
                messages: [{ variant: "error" }],
                data: [],
              });
            }
          });
        } else if (fundingRequest?.request_type_id === 3) {
          // Create Assessment YEA
          try {
            db.transaction(async (trx) => {
              if (!dataAssessment.id) {
                const insert_response = await db("sfa.assessment").returning("*").insert({
                  funding_request_id,
                  assessment_type_id: 2,
                  student_contrib_exempt: "NO",
                  spouse_contrib_exempt: "NO",
                  student_contribution_review: "NO",
                  spouse_contribution_review: "NO",
                  parent_contribution_review: "NO",
                  classes_end_date: dataAssessment.classes_end_date,
                  classes_start_date: dataAssessment.classes_start_date,
                  assessed_date: dataAssessment.assessed_date,
                });

                // if (dataApplication) {
                //     const update_response = await db("sfa.application")
                //         .where({ id: dataApplication.id })
                //         .update({ yea_tot_receipt_amount: dataApplication.yea_tot_receipt_amount })
                // }

                return res.json({
                  messages: [{ variant: "success" }],
                  data: [...insert_response],
                });
              } else {
                // delete dataAssessment.read_only_data;
                // delete dataAssessment.id;
                // delete dataAssessment.assessment_id;
                // const resUpdate = await db("sfa.assessment")
                // .where({ id: insert_response[0].assessment_id_inserted })
                // .update({ ...dataAssessment });
                // return resUpdate
                //     ? res.json({
                //         messages: [{ variant: "success" }],
                //         data: [ ...insert_response ],
                //     })
                //     : res.json({
                //         messages: [{ variant: "success", text: "Failed to update values" }],
                //         data: [[ ...insert_response ]],
                //     });
                // } else {
                //     return res.json({
                //         messages: [{ variant: "success" }],
                //         data: [ ...insert_response ],
                //     });
                // }
              }
            });
          } catch (err) {
            return res.json({
              messages: [{ variant: "error" }],
              data: [err],
            });
          }
        } else {
          return res.json({
            messages: [{ variant: "error" }],
            data: [],
          });
        }
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error to insert" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/:funding_request_id/assessments-with-disburse",
  [param("application_id").isInt().notEmpty(), param("funding_request_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, funding_request_id } = req.params;
      const { dataDisburse, dataAssessment, dataApplication = null } = req.body;

      if (!dataDisburse?.length) {
        return res.json({
          messages: [{ variant: "error", text: "No disbursement found" }],
        });
      }

      const application = await db("sfa.application").where({ id: application_id }).first();

      if (application) {
        const fundingRequest = await db("sfa.funding_request")
          .where({ application_id })
          .where({ id: funding_request_id })
          .first();

        if (fundingRequest?.request_type_id === 2) {
          // Create Assessment YG

          db.transaction(async (trx) => {
            const resSP = await db.raw(
              `EXEC sfa.sp_get_init_value ${funding_request_id}, ${application.id}, ${application.student_id};`
            );

            if (resSP?.[0]?.status) {
              delete dataAssessment.read_only_data;
              delete dataAssessment.id;
              delete dataAssessment.assessment_id;
              delete dataAssessment.program_division;
              delete dataAssessment.unused_receipts;
              delete dataAssessment.yea_balance;
              delete dataAssessment.yea_net_amount;
              delete dataAssessment.yea_used;
              delete dataAssessment.yea_earned;
              //Changing values that the user may have updated from preview-assessment

              const resUpdate = await db("sfa.assessment")
                .where({ id: resSP[0].assessment_id_inserted })
                .update({ ...dataAssessment });

              if (dataDisburse.length) {
                const student = await db("sfa.assessment AS a")
                  .select("s.vendor_id AS vendor_id")
                  .innerJoin("sfa.funding_request AS fr", "fr.id", "a.funding_request_id")
                  .innerJoin("sfa.application AS app", "app.id", "fr.application_id")
                  .innerJoin("sfa.student AS s", "s.id", "app.student_id")
                  .where("a.id", resSP[0].assessment_id_inserted)
                  .first();

                if (student.vendor_id) {
                  // Insert the disbursement list
                  for (const item of dataDisburse) {
                    if (item?.issue_date?.length === 10) {
                      item.tax_year = item.issue_date?.slice(0, 4);
                    }
                    const resInsert = await db("sfa.disbursement")
                      .insert({
                        disbursement_type_id: item.disbursement_type_id,
                        assessment_id: resSP[0].assessment_id_inserted,
                        funding_request_id: funding_request_id,
                        disbursed_amount: item.disbursed_amount,
                        due_date: item.due_date,
                        tax_year: item.tax_year,
                        issue_date: item.issue_date,
                        paid_amount: item.paid_amount,
                        change_reason_id: item.change_reason_id,
                        financial_batch_id: item.financial_batch_id,
                        financial_batch_id_year: item.financial_batch_id_year,
                        financial_batch_run_date: item.financial_batch_run_date,
                        financial_batch_serial_no: item.financial_batch_serial_no,
                        transaction_number: item.transaction_number,
                        csl_cert_seq_number: item.csl_cert_seq_number,
                        ecert_sent_date: item.ecert_sent_date,
                        ecert_response_date: item.ecert_response_date,
                        ecert_status: item.ecert_status,
                        ecert_portal_status_id: item.ecert_portal_status_id,
                      })
                      .returning("*");
                  }
                } else {
                  return res.json({
                    messages: [
                      { text: "Saved, but student must have a Vendor ID to create disbursements", variant: "success" },
                    ],
                    data: [],
                  });
                }

                const updateStatusFundingRequest = await db("sfa.funding_request")
                  .where({ id: funding_request_id })
                  .update({ status_id: 7 });

                return res.json({
                  messages: [{ variant: "success" }],
                  data: [],
                });
              } else {
                return res.json({
                  messages: [{ variant: "error", text: "Error to insert assessment" }],
                  data: [],
                });
              }
            }
          });
        } else if (fundingRequest?.request_type_id === 3) {
          // Create Assessment YEA
          try {
            db.transaction(async (trx) => {
              if (!dataAssessment.id) {
                const insert_response: any = await db("sfa.assessment").returning("id").insert({
                  funding_request_id,
                  assessment_type_id: 2,
                  student_contrib_exempt: "NO",
                  spouse_contrib_exempt: "NO",
                  student_contribution_review: "NO",
                  spouse_contribution_review: "NO",
                  parent_contribution_review: "NO",
                  classes_end_date: dataAssessment.classes_end_date,
                  classes_start_date: dataAssessment.classes_start_date,
                  assessed_date: dataAssessment.assessed_date,
                });

                // if (dataApplication) {
                //     const update_response = await db("sfa.application")
                //         .where({ id: dataApplication.id })
                //         .update({ yea_tot_receipt_amount: dataApplication.yea_tot_receipt_amount })
                // }

                // Insert the disbursement list
                if (dataDisburse?.length) {
                  let existYEARequestType = false;

                  const student = await db("sfa.assessment AS a")
                    .select("s.vendor_id AS vendor_id")
                    .innerJoin("sfa.funding_request AS fr", "fr.id", "a.funding_request_id")
                    .innerJoin("sfa.application AS app", "app.id", "fr.application_id")
                    .innerJoin("sfa.student AS s", "s.id", "app.student_id")
                    .where("a.id", insert_response[0].id)
                    .first();

                  if (student?.vendor_id) {
                    for (const item of dataDisburse) {
                      if (!existYEARequestType && item?.disbursement_type_id === 1) {
                        existYEARequestType = true;
                      }

                      const resInsert = await db("sfa.disbursement")
                        .insert({
                          disbursement_type_id: item.disbursement_type_id,
                          assessment_id: get(insert_response, "[0].id", ""),
                          funding_request_id: funding_request_id,
                          disbursed_amount: item.disbursed_amount,
                          due_date: item.due_date,
                          tax_year: item.tax_year,
                          issue_date: item.issue_date,
                          paid_amount: item.paid_amount,
                          change_reason_id: item.change_reason_id,
                          financial_batch_id: item.financial_batch_id,
                          financial_batch_id_year: item.financial_batch_id_year,
                          financial_batch_run_date: item.financial_batch_run_date,
                          financial_batch_serial_no: item.financial_batch_serial_no,
                          transaction_number: item.transaction_number,
                          csl_cert_seq_number: item.csl_cert_seq_number,
                          ecert_sent_date: item.ecert_sent_date,
                          ecert_response_date: item.ecert_response_date,
                          ecert_status: item.ecert_status,
                          ecert_portal_status_id: item.ecert_portal_status_id,
                        })
                        .returning("*");
                    }

                    const updateYeaRequestType = await db("sfa.funding_request")
                      .where({ id: funding_request_id })
                      .update({ yea_request_type: existYEARequestType ? 1 : 2 });
                  } else {
                    return res.json({
                      messages: [
                        {
                          text: "Saved, but student must have a Vendor ID to create disbursements",
                          variant: "success",
                        },
                      ],
                      data: [],
                    });
                  }
                }

                const updateStatusFundingRequest = await db("sfa.funding_request")
                  .where({ id: funding_request_id })
                  .update({ status_id: 7 });

                return res.json({
                  messages: [{ variant: "success" }],
                  data: [...insert_response],
                });
              } else {
                // delete dataAssessment.read_only_data;
                // delete dataAssessment.id;
                // delete dataAssessment.assessment_id;
                // const resUpdate = await db("sfa.assessment")
                // .where({ id: insert_response[0].assessment_id_inserted })
                // .update({ ...dataAssessment });
                // return resUpdate
                //     ? res.json({
                //         messages: [{ variant: "success" }],
                //         data: [ ...insert_response ],
                //     })
                //     : res.json({
                //         messages: [{ variant: "success", text: "Failed to update values" }],
                //         data: [[ ...insert_response ]],
                //     });
                // } else {
                //     return res.json({
                //         messages: [{ variant: "success" }],
                //         data: [ ...insert_response ],
                //     });
                // }
              }
            });
          } catch (err) {
            return res.json({
              messages: [{ variant: "error" }],
              data: [err],
            });
          }
        }
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error to insert" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/:funding_request_id/assessments/:assessment_id/re-calc",
  [
    param("application_id").isInt().notEmpty(),
    param("funding_request_id").isInt().notEmpty(),
    param("assessment_id").isInt().notEmpty(),
  ],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { assessment_id, application_id, funding_request_id } = req.params;
      const { disbursementList = [] } = req.body;

      const application = await db("sfa.application").where({ id: application_id }).first();
      const assessment = await db("sfa.assessment").where({ id: assessment_id }).first();

      if (application) {
        const assessmentMethods = new AssessmentYukonGrant(db);

        const results: any = await assessmentMethods.getNewInfo(
          Number(application_id),
          Number(assessment_id),
          disbursementList
        );

        if (results) {
          results.read_only_data = {};
          results.read_only_data.previous_weeks = results?.previous_weeks;
          results.read_only_data.assessed_weeks = results?.assessed_weeks;
          results.read_only_data.previous_disbursement = results?.previous_disbursement;
          results.read_only_data.net_amount = results?.net_amount;
          results.read_only_data.years_funded = results?.years_funded;

          delete results.previous_weeks;
          delete results.assessed_weeks;
          delete results.previous_disbursement;
          delete results.net_amount;
          delete results.years_funded;
        }

        return res.json({
          messages: [{ variant: "success" }],
          data: [results],
        });
      } else {
        return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
    }
  }
);

applicationRouter.get(
  "/:application_id/:funding_request_id/preview-assessment",
  [param("application_id").isInt().notEmpty(), param("funding_request_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, funding_request_id } = req.params;

      const application = await db("sfa.application").where({ id: application_id }).first();

      const fundingRequest = await db("sfa.funding_request").where({ id: funding_request_id }).first();

      if (application && fundingRequest) {
        const assessmentMethods = new AssessmentYukonGrant(db);

        const results: any = await assessmentMethods.getNewInfo(Number(application_id), 0, []);

        if (results) {
          results.read_only_data = {};
          results.read_only_data.previous_weeks = results?.previous_weeks;
          results.read_only_data.assessed_weeks = results?.assessed_weeks;
          results.read_only_data.previous_disbursement = results?.previous_disbursement;
          results.read_only_data.net_amount = results?.net_amount;
          results.read_only_data.years_funded = results?.years_funded;

          const student = await db("sfa.student").where({ id: application.student_id }).first();

          const readOnlyData = await db.raw(
            `SELECT 
                        COALESCE(sfa.fn_get_yea_total(${student.yukon_id}), 0) AS yea_earned,
                        COALESCE(sfa.fn_get_system_yea_used(${student.id}), 0) AS yea_used;
                        `
          );

          let { yea_earned, yea_used } = readOnlyData?.[0] || {};

          const yea_balance = yea_earned - yea_used;
          const unused_receipts = min([
            min([application.yea_tot_receipt_amount || 0, yea_balance]),
            fundingRequest.yea_request_amount,
          ]);
          const assessed_amount = unused_receipts + results?.previous_disbursement;
          const yea_net_amount = assessed_amount - results?.previous_disbursement;

          results.read_only_data = {
            yea_earned,
            yea_used,
            yea_net_amount,
            yea_balance,
            unused_receipts,
            assessed_amount,
            ...results.read_only_data,
          };

          delete results.previous_weeks;
          delete results.assessed_weeks;
          delete results.previous_disbursement;
          delete results.net_amount;
          delete results.years_funded;
        }

        return res.json({
          messages: [{ variant: "success" }],
          data: [results],
        });
      } else {
        return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
    }
  }
);

applicationRouter.get(
  "/:application_id/:funding_request_id/preview-assessment-yea",
  [param("application_id").isInt().notEmpty(), param("funding_request_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, funding_request_id } = req.params;

      const application = await db("sfa.application").where({ id: application_id }).first();

      const fundingRequest = await db("sfa.funding_request").where({ id: funding_request_id }).first();

      const student = await db("sfa.student").where({ id: application.student_id }).first();

      if (application && fundingRequest) {
        const preview = await db.raw(
          `SELECT * FROM sfa.fn_get_new_info(
                        ${application_id},
                        -1,
                        ${funding_request_id},
                        ${application.student_id}
                    );
                    `
        );
        const calculateValues = preview?.[0];
        const readOnlyData = await db.raw(
          `SELECT 
                    COALESCE(sfa.fn_get_yea_total(${student.yukon_id}), 0) AS yea_earned,
                    COALESCE(sfa.fn_get_system_yea_used(${student.id}), 0) AS yea_used;
                    `
        );

        calculateValues.read_only_data = readOnlyData?.[0] || {};

        const yea_balance = calculateValues.read_only_data.yea_earned - calculateValues.read_only_data.yea_used;
        const unused_receipts = min([
          min([application.yea_tot_receipt_amount || 0, yea_balance]),
          fundingRequest.yea_request_amount,
        ]);
        const assessed_amount = unused_receipts + calculateValues.read_only_data.previous_disbursement;
        const yea_net_amount = assessed_amount - calculateValues.read_only_data.previous_disbursement;

        delete calculateValues.destination_city;
        delete calculateValues.previous_disbursement;

        calculateValues.read_only_data = {
          yea_net_amount,
          yea_balance,
          unused_receipts,
          assessed_amount,
          ...calculateValues.read_only_data,
        };

        return res.json({
          messages: [{ variant: "success" }],
          data: [calculateValues],
        });
      } else {
        return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/assessment/:assessment_id/disburse",
  [param("application_id").isInt().notEmpty(), param("assessment_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, assessment_id } = req.params;
      const { data } = req.body;

      const application = await db("sfa.application").where({ id: application_id }).first();

      const assessment = await db("sfa.assessment").where({ id: assessment_id }).first();

      if (application) {
        const disbursements = await db.raw(
          `
                        EXEC sfa.sp_disburse_button_yg
                        ${application_id ?? null},
                        ${assessment_id ?? null},
                        ${data.funding_request_id ?? null},
                        ${data.air_travel_disbursement_period ?? null},
                        ${data.travel_allowance ?? null},
                        ${data.airfare_amount ?? null},
                        ${data.disbursements_required ?? null},
                        ${data.over_award_disbursement_period ?? null},
                        ${data.over_award ?? null},
                        ${data.over_award_applied_flg ?? "No"},
                        ${data.years_funded_equivalent ?? null},
                        ${data.allowed_tuition ?? null},
                        ${data.living_costs ?? null},
                        ${data.allowed_books ?? null},
                        ${data.weekly_amount ?? null},
                        ${data.assessment_adj_amount ?? null},
                        ${data.assessed_amount ?? null},
                        ${data.program_division ?? 0},
                        ${data?.read_only_data?.net_amount ?? 0}
                    `
        );

        if (disbursements?.length === 1 && disbursements[0]?.status === 0) {
          return res.json({
            messages: [{ variant: "error", text: disbursements[0].message }],
          });
        }

        if (disbursements?.length && disbursements[0]?.status === 1) {
          const disbursementList = disbursements.map((d: any) => {
            delete d.id;
            delete d.status;
            return {
              ...d,
            };
          });
          return res.json({
            messages: [{ variant: "success" }],
            data: [...disbursementList],
          });
        } else {
          return res.json({
            messages: [{ variant: "error", text: "Error to get data" }],
          });
        }
      } else {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Application id or Assessment id is invalid" }] });
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/assessment/:assessment_id/disburse-yea",
  [param("application_id").isInt().notEmpty(), param("assessment_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, assessment_id } = req.params;
      const { data } = req.body;

      const application = await db("sfa.application").where({ id: application_id }).first();

      const funding_request = await db("sfa.funding_request").where({ id: data.funding_request_id }).first();
      if (application) {
        const response = await db("sfa.disbursement");
        // .insert({
        //     assessment_id,
        //     funding_request_id: data.funding_request_id,
        //     disbursement_type_id: funding_request.yea_request_type == 1 ? 3 : 1,
        //     disbursed_amount: data.read_only_data.net_amount,
        //     tax_year: new Date().getFullYear(),
        //     paid_amount: data.read_only_data.net_amount,
        // })
        // .returning("*");

        if (response?.length) {
          const disbursementList = response.map((d: any) => {
            delete d.id;
            return {
              ...d,
            };
          });

          return res.json({
            messages: [{ variant: "success" }],
            data: [
              {
                assessment_id,
                funding_request_id: data.funding_request_id,
                disbursement_type_id: funding_request.yea_request_type == 1 ? 3 : 1,
                disbursed_amount: data.read_only_data.yea_net_amount,
                tax_year: new Date().getFullYear(),
                paid_amount: data.read_only_data.yea_net_amount,
              },
            ],
          });
        } else {
          return res.json({
            messages: [{ variant: "error", text: "Error to get data" }],
          });
        }
      } else {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "Application id or Assessment id is invalid" }] });
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ error, variant: "error", text: "Error get data" }] });
    }
  }
);

applicationRouter.patch(
  "/:application_id/:funding_request_id/assessments/:assessment_id",
  [
    param("application_id").isInt().notEmpty(),
    param("funding_request_id").isInt().notEmpty(),
    param("assessment_id").isInt().notEmpty(),
  ],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { assessment_id, application_id, funding_request_id } = req.params;
      const { data, disburseList, updatedApplication } = req.body;

      const application = await db("sfa.application").where({ id: application_id }).first();

      if (application) {
        const fundingRequest = await db("sfa.funding_request")
          .where({ application_id })
          .where({ id: funding_request_id })
          .first();

        !data?.over_award_applied_flg ? (data.over_award_applied_flg = "No") : (data.over_award_applied_flg = "Yes");

        if (fundingRequest) {
          // Create Assessment YG
          let resAssessment;
          if (data.assessment_type_id == 1) {
            const assessmentYG = new AssessmentYukonGrant(db);

            resAssessment = await assessmentYG.updateAssessmentYG(
              data,
              disburseList,
              Number(assessment_id),
              Number(funding_request_id)
            );

            return res.json({ messages: [resAssessment] });
          } else if (data.assessment_type_id == 2) {
            const assessmentMethods = new AssessmentYEA(db);

            resAssessment = await assessmentMethods.updateAssessmentYEA(
              data,
              updatedApplication,
              disburseList,
              Number(assessment_id),
              Number(funding_request_id)
            );

            return res.json({ messages: [resAssessment] });
          }

          return resAssessment
            ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
            : res.json({ messages: [{ variant: "error", text: "Failed" }] });
        } else {
          return res.json({
            messages: [{ variant: "error", text: "Error to insert" }],
            data: [],
          });
        }
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error to insert" }] });
    }
  }
);

applicationRouter.get(
  "/:application_id/request-type/:request_type_id/deadline-check",
  [param("application_id").isInt().notEmpty(), param("request_type_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id, request_type_id } = req.params;

      const application = await db("sfa.application").where({ id: application_id }).first();

      const requestType = await db("sfa.request_type").where({ id: request_type_id }).first();

      if (application && requestType) {
        const checkDeadline = await db.raw(
          `SELECT sfa.check_deadline_fct (
                        ${application_id},
                        ${request_type_id}
                    ) as message;
                    `
        );

        return checkDeadline?.[0].message === "OK"
          ? res.json({
              messages: [{ variant: "success", text: "OK" }],
            })
          : res.json({
              messages: [{ variant: "error", text: checkDeadline?.[0]?.message || "Error to check deadline" }],
              data: [],
            });
      } else {
        return res
          .status(409)
          .send({ messages: [{ variant: "error", text: "application or funding request no valid" }] });
      }
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/update-preview",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data, disburseAmountList } = req.body;

      const application = await db("sfa.application").where({ id: application_id }).first();

      const assessmentMethods = new AssessmentYukonGrant(db);

      const assessmentDTO = { ...data, ...data?.read_only_data };

      const results: any = await assessmentMethods.getRefreshAssessmentData(
        assessmentDTO,
        disburseAmountList,
        application.student_id,
        Number(application_id),
        data?.program_division ?? 0
      );

      if (results) {
        results.read_only_data.previous_weeks = results.previous_weeks;
        results.read_only_data.assessed_weeks = results.assessed_weeks;
        results.read_only_data.previous_disbursement = results.previous_disbursement;
        results.read_only_data.net_amount = results.net_amount;
        results.read_only_data.years_funded = results.years_funded;

        delete results.previous_weeks;
        delete results.assessed_weeks;
        delete results.previous_disbursement;
        delete results.net_amount;
        delete results.years_funded;
      }

      return res.json({ messages: [{ variant: "success", text: "ok" }], data: [results] });
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
    }
  }
);

applicationRouter.post(
  "/:application_id/update-preview-yea",
  [param("application_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { application_id } = req.params;
      const { data, disburseAmountList } = req.body;

      const application = await db("sfa.application").where({ id: application_id }).first();

      const assessmentMethods = new AssessmentYEA(db);
      if (!data.assessment) {
        data.assessment = { ...data };
      }
      if (!data.application) {
        data.application = { ...application };
      }
      const results: any = await assessmentMethods.getRefreshAssessmentData(
        data.assessment,
        data.application,
        disburseAmountList,
        application.student_id,
        Number(application_id)
      );

      if (results) {
        results.read_only_data = {
          ...results.read_only_data,
        };
      }

      return res.json({ messages: [{ variant: "success", text: "ok" }], data: [results] });
    } catch (error) {
      console.log(error);
      return res.status(409).send({ messages: [{ variant: "error", text: "Error get data" }] });
    }
  }
);

// :assessment.assessed_amount := :assessment.unused_receipts + :assessment.previous_disbursement;
// NOTE: THIS ALSO IS AFFECTED WHEN A DISBURSEMENT IS ADDED IT; even if it is not saved, you must load it in preview mode.
