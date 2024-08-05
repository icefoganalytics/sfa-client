import express, { Request, Response } from "express";
import { body, param } from "express-validator";
import moment from "moment";
import { readFileSync } from "fs";
import knex from "knex";
import { orderBy } from "lodash";
import axios from "axios";
import { ReturnValidationErrors, ReturnValidationErrorsCustomMessage } from "../../middleware";
import { API_PORT, DB_CONFIG } from "../../config";
import { DocumentService } from "@/services/shared";
import { generatePDF } from "@/utils/pdf-generator";
import { create } from "express-handlebars";
let { RequireActive } = require("../auth");

const db = knex(DB_CONFIG);

export const studentRouter = express.Router();

const documentService = new DocumentService();

studentRouter.post(
  "/",
  [body("first_name").notEmpty(), body("last_name").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    let { first_name, last_name, initials, locator_number, sin } = req.body;

    let student = {
      first_name,
      last_name,
      initials,
      locator_number,
      sin,
    };

    let result = await insertStudent(student);

    res.json({ data: result });
  }
);

studentRouter.put(
  "/:student_id",
  [param("student_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { student_id } = req.params;
      const { type, extraId, data, addressType } = req.body;

      const student: any = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        const person_id = student.person_id;

        const types: any = {
          personInfo: "sfa.person",
          addressInfo: "sfa.person_address",
          studentInfo: "sfa.student",
          educationInfo: "sfa.education",
        };

        const addresTypes: any = {
          permanent: 1,
          temporal: 2,
        };

        if (!Object.keys(types).some((value) => value === type)) {
          return res.json({ messages: [{ variant: "error", text: "type valid is required" }] });
        }

        const getPerson = await db("sfa.person").where({ id: person_id }).first();

        if (getPerson) {
          if (type === "addressInfo") {
            const table = types[type];

            if (extraId !== null && isNaN(extraId)) {
              const resUpdate = await db(table).insert({
                ...data,
                person_id,
                address_type_id: addresTypes[addressType],
              });
              return resUpdate
                ? res.json({ messages: [{ variant: "success", text: "Student saved" }] })
                : res.json({ messages: [{ variant: "error", text: "Save failed" }] });
            }

            const getAddress: any = await await db(table).where({ id: extraId }).first();

            delete getAddress.id;

            const resUpdate = await db(table)
              .where({ id: extraId })
              .update({ ...data });

            return resUpdate > 0
              ? res.json({ messages: [{ variant: "success", text: "Student saved" }] })
              : res.json({ messages: [{ variant: "error", text: "Save failed" }] });
          }

          if (type === "personInfo" || type === "studentInfo") {
            if (data.hasOwnProperty("first_name") && !data.first_name?.trim().length) {
              return res.json({
                messages: [{ variant: "error", text: "Student information record requires a first name." }],
              });
            }

            if (data.hasOwnProperty("last_name") && !data.last_name?.trim().length) {
              return res.json({
                messages: [{ variant: "error", text: "Student information record requires a last name." }],
              });
            }

            const table = types[type];

            const typeId = type === "studentInfo" ? { person_id: person_id } : { id: person_id };

            const resUpdate = await db(table)
              .where({ ...typeId })
              .update({ ...data });

            return resUpdate > 0
              ? res.json({ messages: [{ variant: "success", text: "Student saved" }] })
              : res.json({ messages: [{ variant: "error", text: "Save failed" }] });
          }

          return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
        }
      }
    } catch (error) {
      console.log(error);
      res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

studentRouter.patch(
  "/:person_id/person",
  [param("person_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { person_id } = req.params;
      const { data } = req.body;

      if (!Object.keys(data).length) {
        return res.json({ messages: [{ variant: "error", text: "data is required" }] });
      }

      const person: any = await db("sfa.person").where({ id: person_id }).first();

      if (person) {
        const resUpdate = await db("sfa.person")
          .update({ ...data })
          .where({ id: person_id })
          .returning("*");

        return resUpdate
          ? res.json({ messages: [{ variant: "success", text: "Updated" }] })
          : res.json({ messages: [{ variant: "error", text: "Failed to update" }] });
      }
    } catch (error) {
      console.log(error);
      return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
    }
  }
);

studentRouter.post("/search", RequireActive, async (req: Request, res: Response) => {
  let { terms } = req.body;
  terms = terms.toLowerCase().trim();

  if (terms.length == 0)
    res.json({ data: [], messages: [{ variant: "error", text: "You must include search terms" }] });

  let termParts = terms.split(/[,-\s]/);
  termParts = termParts.filter((t: string) => t.trim().length > 0);

  let kq = db("sfa.student").join("sfa.person", "student.person_id", "person.id");
  kq.select("student.id as student_id", "person.id as person_id", "*");

  for (let part of termParts) {
    kq.whereRaw(
      `(LTRIM(STR(sin,20,0)) like ? OR lower(first_name) like ? OR lower(locator_number) like ?
        OR lower(last_name) like ? OR lower(email) like ? OR lower(yukon_id) like ? OR lower(user_name) like ?
        )`,
      [`${part}%`, `%${part}%`, `${part}%`, `%${part}%`, `${part}%`, `${part}%`, `${part}%`]
    );
  }

  let results = await kq.orderBy("first_name").orderBy("last_name");

  for (let r of results) {
    delete r.id;
    r.id = r.student_id;

    let history = await db("sfa.application").where({ student_id: r.student_id }).count("* as counter").first();
    r.application_count = history?.counter;

    r.name = `${r.first_name} ${r.initials || ""} ${r.last_name}`.replace("  ", " ");

    if (r.birth_date) r.birth_date = moment(r.birth_date).utc(false).format("YYYY-MM-DD");
  }

  res.json({ data: results, meta: { item_count: results.length, page: 1, page_count: 1, page_size: results.length } });
});

studentRouter.post(
  "/:student_id/education",
  [param("student_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { student_id } = req.params;
      const { data } = req.body;

      const student: any = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        const resInsert = await db("sfa.education").insert({ ...data, student_id });

        return resInsert
          ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
          : res.json({ messages: [{ variant: "error", text: "Failed" }] });
      }

      return res.status(404).send({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.error(error);
      return res.status(400).send({ messages: [{ variant: "error", text: "Failed", error }] });
    }
  }
);

studentRouter.put(
  "/:student_id/education",
  [param("student_id").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { student_id } = req.params;
      const { type, extraId, data, addressType } = req.body;

      const types: any = {
        educationInfo: "sfa.education",
      };

      if (!Object.keys(types).some((value) => value === type)) {
        return res.json({ messages: [{ variant: "error", text: "type valid is required" }] });
      }

      const student: any = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        if (!Object.keys(data).some((value) => value === "sin")) {
          const table = types[type];
          const sinList: any = await db(table).where({ sin: data.sin });
          //.whereNot({ student_id })
          if (sinList.length > 0) {
            return res.json({ messages: [{ variant: "error", text: "SIN is in use." }] });
          }
        }
        const table = types[type];

        const resUpdate = await db(table)
          .where({ id: extraId })
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

studentRouter.delete(
  "/:id/education",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;
    let description = "";
    try {
      const verifyRecord: any = await db("sfa.education").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      description = verifyRecord?.description;

      const deleteRecord: any = await db("sfa.education").where({ id: id }).del();

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

studentRouter.get("/:id", [param("id").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const student: any = await db("sfa.student")
      .where({ id })
      .select(
        "sfa.student.*",
        db.raw("sfa.fn_get_pre_leg_sta_up_weeks(student.id) AS pre_leg_sta_up_weeks"),
        db.raw("sfa.fn_get_pre_leg_outside_travel(student.id) AS pre_leg_outside_travel"),
        db.raw("sfa.fn_get_yea_total(student.yukon_id) - sfa.fn_get_system_yea_used(student.id) AS yea_balance"),
        db.raw("sfa.fn_get_prev_pre_leg_weeks(student.id, a.application_id) AS prev_pre_leg_weeks"),
        db.raw("sfa.fn_get_funded_years_used_preleg_chg(student.id, a.application_id) AS funded_years_used_preleg_chg"),
        db.raw("sfa.fn_get_post_leg_sta_up_weeks(student.id) AS post_leg_sta_up_weeks"),
        db.raw("sfa.fn_get_post_leg_weeks(student.id) AS post_leg_weeks"),
        db.raw("sfa.fn_get_pre_leg_weeks(student.id) AS pre_leg_weeks"),
        db.raw("sfa.fn_get_post_leg_outside_travel(student.id) AS post_leg_outside_travel")
      )
      .leftJoin(
        function () {
          this.select("id as application_id", "academic_year_id", "student_id")
            .from("sfa.application")
            .where("student_id", id)
            .orderBy("academic_year_id", "desc")
            .limit(1)
            .as("a");
        },
        "a.student_id",
        "sfa.student.id"
      )
      .first();

    if (student) {
      const person = await db("sfa.person").where({ id: student.person_id }).first();

      if (person) {
        const applicationInfo = await db("sfa.application")
          .innerJoin("sfa.institution_campus", "application.institution_campus_id", "institution_campus.id")
          .innerJoin("sfa.institution", "institution.id", "institution_campus.institution_id")
          .select("application.*")
          .select("institution.name as institution_name")
          .where({ student_id: id })
          .orderBy("academic_year_id", "desc");

        for (let item of applicationInfo) {
          item.title = `${item.academic_year_id}: ${item.institution_name}`;
        }

        const consentInfo = await db("sfa.student_consent").where({ student_id: id });

        const vendorUpdates = await db("sfa.vendor_update").where({ student_id: id }).orderBy("created_date", "desc");

        const residenceInfo = await db("sfa.residence").where({ student_id: id });

        const dependentInfo = await db("sfa.dependent")
          .leftJoin("sfa.dependent_eligibility", "sfa.dependent.id", "sfa.dependent_eligibility.dependent_id")
          .select(
            "sfa.dependent_eligibility.application_id",
            "sfa.dependent_eligibility.id as de_id",
            "sfa.dependent_eligibility.is_csg_eligible",
            "sfa.dependent_eligibility.is_csl_eligible",
            "sfa.dependent_eligibility.is_sta_eligible",
            "sfa.dependent_eligibility.is_in_progress",
            "sfa.dependent_eligibility.is_post_secondary",
            "sfa.dependent_eligibility.is_shares_custody",
            "sfa.dependent_eligibility.resides_with_student",
            "sfa.dependent_eligibility.shares_custody_details",
            "sfa.dependent.birth_date",
            "sfa.dependent.comments",
            "sfa.dependent.first_name",
            "sfa.dependent.id as d_id",
            "sfa.dependent.is_conversion",
            "sfa.dependent.is_disability",
            "sfa.dependent.is_in_progress",
            "sfa.dependent.last_name",
            "sfa.dependent.relationship_id",
            "sfa.dependent.student_id"
          )
          .where({ student_id: id });

        let addresses = await db("sfa.person_address")
          .where({ person_id: person.id, "person_address.is_active": true })
          .leftOuterJoin("sfa.city", "city.id", "person_address.city_id")
          .leftOuterJoin("sfa.province", "province.id", "person_address.province_id")
          .leftOuterJoin("sfa.country", "country.id", "person_address.country_id")
          .select([
            "person_address.*",
            "city.description as city_name",
            "province.description as province_name",
            "country.description as country_name",
          ]);
        orderBy(id, "desc");

        for (let item of addresses) {
          item.address_display = `${item.city_name || ""} ${item.province_name || ""} ${item.postal_code || ""}`.trim();

          if (item.address2)
            item.address_display = `${item.address2}
${item.address_display}`;

          if (item.address1)
            item.address_display = `${item.address1}
${item.address_display}`;
        }

        const temporalAddress = addresses.filter((a) => a.address_type_id == 2)[0];
        const permanentAddress = addresses.filter((a) => a.address_type_id == 1)[0];

        const educationInfo = await db("sfa.education")
          .leftJoin("sfa.institution_campus", "sfa.education.institution_campus_id", "sfa.institution_campus.id")
          .select(
            "sfa.education.id",
            "sfa.education.from_year",
            "sfa.education.from_month",
            "sfa.education.to_year",
            "sfa.education.to_month",
            "sfa.education.study_area_id",
            "sfa.education.institution_campus_id",
            "sfa.institution_campus.institution_id"
          )
          .where("sfa.education.student_id", student.id);

        const yeaList = await db("sfa.student")
          .innerJoin("sfa.yea", "sfa.student.yukon_id", "sfa.yea.yukon_id")
          .select("sfa.yea.*")
          .where("sfa.yea.yukon_id", student.yukon_id);

        let highSchoolInfo = {
          city_id: null,
          province_id: null,
          country_id: null,
        };

        if (student?.high_school_id !== null && !isNaN(student?.high_school_id)) {
          const resultsHighSchoolInfo = await db("sfa.high_school").where({ id: student.high_school_id }).first();

          if (resultsHighSchoolInfo) {
            highSchoolInfo = { ...resultsHighSchoolInfo };
          }
        }

        const data = {
          ...person,
          temporalAddress: { ...temporalAddress },
          permanentAddress: { ...permanentAddress },
          addresses,
          locator_number: student.locator_number,
          yukon_id: student.yukon_id,
          pre_funded_year: student.pre_funded_year,
          adj_yg_funding_weeks: student.adj_yg_funding_weeks || 0,
          pre_funding_years_used: student.pre_funding_years_used,
          adj_sta_upgrading_weeks: student.adj_sta_upgrading_weeks,
          adj_outside_travel_cnt: student.adj_outside_travel_cnt,
          checked_for_yukon_id: student.checked_for_yukon_id,
          pre_leg_sta_up_weeks: student.pre_leg_sta_up_weeks || 0,
          post_leg_outside_travel: student.post_leg_outside_travel || 0,
          pre_leg_outside_travel: student.pre_leg_outside_travel,
          yea_expiry_date: student.yea_expiry_date,
          vendor_id: student.vendor_id,
          is_crown_ward: student.is_crown_ward,
          high_school_final_grade: student.high_school_final_grade,
          high_school_left_year: student.high_school_left_year,
          high_school_left_month: student.high_school_left_month,
          education_level_id: student.education_level_id,
          high_school_id: student.high_school_id,
          high_school_info: highSchoolInfo,
          education_info: educationInfo,
          consent_info: consentInfo,
          dependent_info: dependentInfo,
          residence_info: residenceInfo,
          yea_list: yeaList,
          applications: applicationInfo,
          id: student.id,
          person_id: student.person_id,
          vendor_updates: vendorUpdates,
          yea_balance: student.yea_balance,
          prev_pre_leg_weeks: student.prev_pre_leg_weeks,
          funded_years_used_preleg_chg: student.funded_years_used_preleg_chg,
          post_leg_weeks: student.post_leg_weeks,
          pre_leg_weeks: student.pre_leg_weeks,
          post_leg_sta_up_weeks: student.post_leg_sta_up_weeks,
          csl_warn_code: student.csl_warn_code,
          csl_letter_date: student.csl_letter_date,
          pre_over_award_amount: student.pre_over_award_amount,
        };

        return res.status(200).json({ data });
      }
    }

    return res.status(404).send();
  } catch (error) {
    console.error(error);
    return res.status(400).send(error);
  }
});

studentRouter.put(
  "/:student_id/consent",
  [param("student_id").isInt().notEmpty(), body("extraId").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { student_id } = req.params;
      const { type, extraId, data } = req.body;

      if (!("consentInfo" === type)) {
        return res.json({ messages: [{ variant: "error", text: "type valid is required" }] });
      }

      if (Object.keys(data).some((k) => k === "consent_person") && !(data.consent_person?.trim().length > 2)) {
        return res.json({ messages: [{ variant: "error", text: "Consent Person is required" }] });
      }

      const student: any = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        const resUpdate = await db("sfa.student_consent")
          .where({ id: extraId })
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

studentRouter.post(
  "/:student_id/consent",
  [
    param("student_id").isInt().notEmpty(),
    body("data.start_academic_year_id").notEmpty().withMessage("Start academic year is required"),
    body("data.end_academic_year_id").notEmpty().withMessage("End academic year is required"),
    body("data.consent_person").isString().isLength({ min: 3 }).withMessage("Consent person is required"),
  ],
  ReturnValidationErrorsCustomMessage,
  async (req: Request, res: Response) => {
    try {
      const { student_id } = req.params;
      const { data } = req.body;

      const student: any = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        data.consent_csl = !!data.consent_csl;
        data.consent_sfa = !!data.consent_sfa;

        const resInsert = await db("sfa.student_consent").insert({ ...data, student_id });

        return resInsert
          ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
          : res.json({ messages: [{ variant: "error", text: "Failed" }] });
      }

      return res.status(404).send({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.error(error);
      return res.status(400).send({ messages: [{ variant: "error", text: "Failed", error }] });
    }
  }
);

studentRouter.delete(
  "/:id/consent",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;
    let description = "";
    try {
      const verifyRecord: any = await db("sfa.student_consent").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      description = verifyRecord?.description;

      const deleteRecord: any = await db("sfa.student_consent").where({ id: id }).del();

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

studentRouter.put(
  "/:student_id/:application_id/dependent/:id",
  [param("student_id").isInt().notEmpty(), body("type").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { student_id, application_id, id } = req.params;
      const { type, data } = req.body;

      if (type !== "dependent" && type !== "d_eligibility") {
        return res.json({ messages: [{ variant: "error", text: "Type is required" }] });
      }

      const student: any = await db("sfa.student").where({ id: student_id }).first();
      const application: any = await db("sfa.application").where({ id: application_id }).first();

      if (student && application) {
        const table = type === "dependent" ? "sfa.dependent" : "sfa.dependent_eligibility";
        const resUpdate = await db(table)
          .where({ id })
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

studentRouter.post(
  "/:student_id/:application_id/dependent",
  [param("student_id").isInt().notEmpty(), param("application_id").isInt().notEmpty()],
  ReturnValidationErrorsCustomMessage,
  async (req: Request, res: Response) => {
    try {
      const { student_id, application_id } = req.params;
      const { dependentData, dEligibilityData } = req.body;

      const student: any = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        await db.transaction(async (trx) => {
          const [resInsertDependent]: any = await Promise.all([
            trx("sfa.dependent")
              .insert({ ...dependentData, student_id })
              .returning("*"),
          ]);

          if (resInsertDependent) {
            const resInsert = await trx("sfa.dependent_eligibility")
              .insert({
                ...dEligibilityData,
                dependent_id: resInsertDependent[0].id,
                application_id,
              })
              .returning("*");

            return resInsert
              ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
              : res.json({ messages: [{ variant: "error", text: "Failed" }] });
          } else {
            return res.json({ messages: [{ variant: "error", text: "Failed" }] });
          }
        });
      } else {
        return res.status(404).send({ messages: [{ variant: "error", text: "Failed" }] });
      }
    } catch (error) {
      console.log(error);
      res.status(500).send({ messages: [{ variant: "error", text: "Failed" }] });
    }
  }
);

studentRouter.delete(
  "/:d_elegibility_id/:dependent_id/dependent",
  [param("d_elegibility_id").isInt().notEmpty(), param("dependent_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { d_elegibility_id, dependent_id } = req.params;

    try {
      const verifyRecord: any = await db("sfa.dependent_eligibility").where({ id: d_elegibility_id }).first();

      if (verifyRecord && verifyRecord.dependent_id !== Number(dependent_id)) {
        return res
          .status(404)
          .send({ messages: [{ variant: "success", text: "The relationship between the data does not exist." }] });
      }

      const deleteRecordDEligibility: any = await db("sfa.dependent_eligibility").where({ id: d_elegibility_id }).del();

      const deleteRecordDependent: any = await db("sfa.dependent_eligibility").where({ id: dependent_id }).del();

      return deleteRecordDEligibility > 0 && deleteRecordDependent > 0
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

studentRouter.put(
  "/:student_id/residence",
  [param("student_id").isInt().notEmpty(), body("extraId").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { student_id } = req.params;
      const { type, extraId, data } = req.body;

      if (!("residenceInfo" === type)) {
        return res.json({ messages: [{ variant: "error", text: "type valid is required" }] });
      }

      if (Object.keys(data).some((k) => k === "is_in_progress") && !data.is_in_progress) {
        data.is_in_progress = false;
      }

      const student: any = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        const residence: any = await db("sfa.residence").where({ id: extraId }).first();

        if (Object.keys(data).some((k) => k === "from_month")) {
          if (Number(data.from_month) > residence.to_month && residence.from_year === residence.to_year) {
            data.to_month = null;
          }
        }

        if (Object.keys(data).some((k) => k === "to_year")) {
          if (residence.from_year === Number(data.to_year) && residence.from_month > residence.to_month) {
            data.to_month = null;
          }
        }

        if (Object.keys(data).some((k) => k === "from_year")) {
          if (residence.to_year === Number(data.from_year) && residence.from_month > residence.to_month) {
            data.to_month = null;
          }

          if (Number(data.from_year) > residence.to_year) {
            data.to_year = null;
          }
        }
        Object.keys(data).some((k) => k === "from_year");

        if (
          Object.keys(data).some((k) => k === "from_year" || k === "to_year" || k === "from_month" || k === "to_month")
        ) {
          const regex = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;

          const startYear = Object.keys(data).some((k) => k === "from_year") ? data.from_year : residence.from_year;
          const startMonth = Object.keys(data).some((k) => k === "from_month")
            ? String(data.from_month).length === 1
              ? "0" + data.from_month
              : data.from_month
            : String(residence.from_month).length === 1
            ? "0" + residence.from_month
            : residence.from_month;

          const endYear = Object.keys(data).some((k) => k === "to_year") ? data.to_year : residence.to_year;
          const endMonth = Object.keys(data).some((k) => k === "to_month")
            ? String(data.to_month).length === 1
              ? "0" + data.to_month
              : data.to_month
            : String(residence.to_month).length === 1
            ? "0" + residence.to_month
            : residence.to_month;

          const startDate = `${startYear}-${startMonth}-01`;
          const endDate = `${endYear}-${endMonth}-01`;

          if (regex.test(startDate) && regex.test(endDate)) {
            const residences: any = await db("sfa.residence")
              .select(
                db.raw(
                  `COALESCE(CAST(from_year as varchar(5)), '')+'-'+COALESCE(REPLICATE('0',2-LEN(from_month))+CAST(from_month AS varchar(4)), '')+'-01' as startDate,
                        COALESCE(CAST(to_year as varchar(5)), '')+'-'+COALESCE(REPLICATE('0',2-LEN(to_month))+CAST(to_month AS varchar(4)), '')+'-01' as endDate`
                )
              )
              .where({ student_id });

            const filterResidences = residences.filter((residence: any) => {
              return regex.test(residence.startDate) && regex.test(residence.endDate);
            });

            if (checkOverlap(filterResidences, startDate, endDate)) {
              return res.status(404).send({
                messages: [
                  {
                    variant: "error",
                    text: "Residency period overlaps in time with an existing record.",
                  },
                ],
              });
            }
          }
        }

        const resUpdate = await db("sfa.residence")
          .where({ id: extraId })
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

studentRouter.post(
  "/:student_id/residence",
  [
    param("student_id").isInt().notEmpty(),
    body("data.from_year").notEmpty().withMessage("from_year is required"),
    body("data.from_month").notEmpty().withMessage("from_month is required"),
  ],
  ReturnValidationErrorsCustomMessage,

  async (req: Request, res: Response) => {
    try {
      const { student_id } = req.params;
      const { data } = req.body;

      const student: any = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        const startYear = data.from_year;
        const startMonth = String(data.from_month).length === 1 ? "0" + data.from_month : data.from_month;

        const endYear = data.to_year;
        const endMonth = String(data.to_month).length === 1 ? "0" + data.to_month : data.to_month;

        const startDate = `${startYear}-${startMonth}-01`;
        const endDate = `${endYear}-${endMonth}-01`;

        const residences: any = await db("sfa.residence")
          .select(
            db.raw(
              `COALESCE(CAST(from_year as varchar(5)), '')+'-'+COALESCE(REPLICATE('0',2-LEN(from_month))+CAST(from_month AS varchar(4)), '')+'-01' as startDate,
                        COALESCE(CAST(to_year as varchar(5)), '')+'-'+COALESCE(REPLICATE('0',2-LEN(to_month))+CAST(to_month AS varchar(4)), '')+'-01' as endDate`
            )
          )
          .where({ student_id });

        const filterResidences = residences.filter((residence: any) => {
          const regex = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;

          return regex.test(residence.startDate) && regex.test(residence.endDate);
        });

        if (checkOverlap(filterResidences, startDate, endDate)) {
          return res.status(404).send({
            messages: [
              {
                variant: "error",
                text: "Residency period overlaps in time with an existing record.",
              },
            ],
          });
        }

        const resInsert = await db("sfa.residence").insert({ ...data, student_id });

        return resInsert
          ? res.json({ messages: [{ variant: "success", text: "Saved" }] })
          : res.json({ messages: [{ variant: "error", text: "Failed" }] });
      }

      return res.status(404).send({ messages: [{ variant: "error", text: "Failed" }] });
    } catch (error) {
      console.error(error);
      return res.status(400).send({ messages: [{ variant: "error", text: "Failed", error }] });
    }
  }
);

studentRouter.delete(
  "/:id/residence",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id = null } = req.params;
    let description = "";
    try {
      const verifyRecord: any = await db("sfa.residence").where({ id: id }).first();

      if (!verifyRecord) {
        return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
      }

      description = verifyRecord?.description;

      const deleteRecord: any = await db("sfa.residence").where({ id: id }).del();

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

studentRouter.get(
  "/:student_id/applications",
  [param("student_id").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    let { student_id } = req.params;

    let history_details = await db("sfa.history_detail")
      .innerJoin("sfa.institution", "history_detail.institution_id", "institution.institution_id")
      .innerJoin("sfa.study_area", "history_detail.study_area_id", "study_area.study_area_id")
      .innerJoin("sfa.program", "history_detail.program_id", "program.program_id")
      .select("history_detail.*")
      .select("institution.name as institution_name")
      .select("study_area.description as study_area_name")
      .select("program.description as program_name")
      .where({ student_id })
      .orderBy("academic_year", "desc");

    for (let h of history_details) {
      let fundingRequests = await db("sfa.funding_request")
        .innerJoin("sfa.request_type", "funding_request.request_type_id", "request_type.request_type_id")
        .where({ "funding_request.history_detail_id": h.HISTORY_DETAIL_ID })
        .select("funding_request.*")
        .select("request_type.short_name");

      h.funding_requests = fundingRequests;
    }

    res.json({ data: history_details });
  }
);

/* This appears to be obviously garbage
studentRouter.get("/:studentId/applications/:applicationId", async (req: Request, res: Response) => {
  let { studentId, applicationId } = req.params;

  res.json({ data: [{ appliation_id: 1123, institution_name: "HAPPY TOWN" }] });
}); */

studentRouter.get("/:student_id/standing-documents", async (req: Request, res: Response) => {
  const { student_id } = req.params;

  const returnDocs = await documentService.getStandingDocumentsForStudent(parseInt(student_id));
  return res.json({ data: returnDocs });
});

studentRouter.get(
  "/:student_id/vendor",
  [param("student_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    let { student_id } = req.params;

    try {
      const student = await db("sfa.student").where({ id: student_id }).first();

      if (student && student.vendor_id) {
        const vendor = await axios.get("https://api.gov.yk.ca/finance/api/v1/vendor/" + student.vendor_id, {
          headers: {
            "Ocp-Apim-Subscription-Key": "593e9b12bfb747db862429c0a935482c",
          },
        });

        if (vendor && vendor.status === 200) {
          return res.status(200).json({ success: true, data: { ...vendor.data } });
        }
      }
    } catch (error: any) {
      console.log("ERORR LOADING VENDOR", error);
      return res.status(500).send(error);
    }

    res.status(404).send();
  }
);

studentRouter.get(
  "/:student_id/vendor-list/:term",
  [param("student_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    let { term, student_id } = req.params;

    try {
      const student = await db("sfa.student").where({ id: student_id }).first();

      if (student) {
        const vendorList = await axios.post(
          `https://api.gov.yk.ca/finance/api/v1/vendor/search`,
          { term },
          {
            headers: { "Ocp-Apim-Subscription-Key": "593e9b12bfb747db862429c0a935482c" },
          }
        );

        if (vendorList && vendorList.status === 200) {
          return res.status(200).json({ success: true, data: { ...vendorList.data } });
        }
      }
    } catch (error: any) {
      console.log(error);
      return res.status(400).send(error);
    }

    res.status(404).send();
  }
);

studentRouter.post(
  "/:student_id/vendor-update",
  [param("student_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { student_id } = req.params;
      const { data } = req.body;

      const student = await db("sfa.student")
        .innerJoin("sfa.person", "student.person_id", "person_id")
        .where({ "student.id": student_id })
        .first();
      const vendorAddress = await db("sfa.person_address").where({ id: data.address_id }).first();

      if (student && vendorAddress) {
        const toInsert = {
          student_id,
          address: `${vendorAddress.address1 ?? ""},  ${vendorAddress.address2 ?? ""}`,
          city_id: vendorAddress.city_id,
          province_id: vendorAddress.province_id,
          postal_code: vendorAddress.postal_code,
          country_id: vendorAddress.country_id,
          telephone: student.telephone,
          email: student.email,
          address_type_id: vendorAddress.address_type_id,
          vendor_id: student.vendor_id,
          created_date: new Date(),
          is_address_update: data.is_address_update,
          is_banking_update: data.is_banking_update,
          is_direct_deposit_update: data.is_direct_deposit_update,
          is_name_change_update: data.is_name_change_update,
          name_change_comment: data.name_change_comment,
        };

        await db("sfa.vendor_update").insert(toInsert);
        return res.json({ messages: [{ variant: "success", text: "Saved" }] });
      }

      return res.status(404).send("Studend and address not found");
    } catch (error) {
      console.error(error);
      return res.status(400).send({ messages: [{ variant: "error", text: "Failed" }] });
    }
  }
);

studentRouter.get(
  "/:student_id/vendor-update/:id",
  [param("student_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { student_id, id } = req.params;
    const { format } = req.query;
    const update = await db("sfa.vendor_update")
      .where({ "vendor_update.id": id, student_id })
      .leftOuterJoin("sfa.city", "city.id", "vendor_update.city_id")
      .leftOuterJoin("sfa.province", "province.id", "vendor_update.province_id")
      .select("vendor_update.*", "city.description as city", "province.description as province")
      .first();
    const student = await db("sfa.student")
      .innerJoin("sfa.person", "person.id", "student.person_id")
      .where({ "student.id": student_id })
      .first();

    if (!update) return res.status(404).send("Vendor Update not found");
    if (!student) return res.status(404).send("Student not found");

    student.vendor_id = student.vendor_id ?? "____________________";

    const pdfData = {
      API_PORT: API_PORT,
      update,
      student,
      user: req.user,
      department: "Department: E-13A",
      date: moment().format("D MMM YYYY"),
      isCreate: student.vendor_id.startsWith("_"),
    };
    const h = create({ defaultLayout: "./templates/layouts/pdf-layout" });
    const data = await h.renderView(__dirname + "/../../templates/admin/vendor/vendor-request.handlebars", {
      ...pdfData,
    });

    if (format == "html") return res.send(data);

    let name = `VendorRequest-${student.first_name}${student.last_name}`.replace(/\s/g, "");

    const footerTemplate = `<div style="width: 100%; text-align: left; font-size: 11px; padding: 5px 0; border-top: 1px solid #ccc; margin: 0 40px 10px; font-family: Calibri;">
      <div style="float:left">${moment().format("MMMM D, YYYY")}</div><div style="float:right">Page 1 of 1</div>
    </div>`;

    let pdf = await generatePDF(data, "letter", false, footerTemplate);
    res.setHeader("Content-disposition", `attachment; filename="${name}.pdf"`);
    res.setHeader("Content-type", "application/pdf");
    res.send(pdf);
  }
);

studentRouter.put(
  "/:student_id/vendor-update/:id",
  [param("student_id").isInt().notEmpty(), param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { student_id, id } = req.params;
    const { update_completed_date } = req.body;

    await db("sfa.vendor_update").where({ id, student_id }).update({ update_completed_date });

    res.json({ messages: [{ variant: "success", text: "Saved" }] });
  }
);

async function insertStudent(student: any) {
  let max = (await db("sfa.STUDENT").max("student_id as smax").first())?.smax;
  let limit = 5;

  while (limit > 0) {
    let next = max; //+ 1;
    try {
      student.student_id = next;
      let returning = await knex("sfa.STUDENT").insert(student).returning("*");
      return returning[0];
    } catch (err) {
      max++;
      limit--;
    }
  }
}

function cleanUser(email: string) {
  return email.substring(0, Math.min(10, email.indexOf("@")));
}

const checkOverlap = (list: any[], startDate: string, endDate: string) => {
  return list.some((date: any) => {
    if (
      new Date(startDate).getTime() === new Date(date.startDate).getTime() &&
      new Date(endDate).getTime() === new Date(date.endDate).getTime()
    ) {
      return true;
    }
    if (
      new Date(date.startDate).getTime() < new Date(startDate).getTime() &&
      new Date(startDate).getTime() < new Date(date.endDate).getTime() &&
      new Date(date.startDate).getTime() < new Date(endDate).getTime() &&
      new Date(endDate).getTime() < new Date(date.endDate).getTime()
    ) {
      return true;
    }
    if (
      new Date(date.startDate).getTime() > new Date(startDate).getTime() &&
      new Date(startDate).getTime() < new Date(date.endDate).getTime() &&
      new Date(date.startDate).getTime() < new Date(endDate).getTime() &&
      new Date(endDate).getTime() > new Date(date.endDate).getTime()
    ) {
      return true;
    }
    if (
      new Date(date.startDate).getTime() > new Date(startDate).getTime() &&
      new Date(startDate).getTime() < new Date(date.endDate).getTime() &&
      new Date(date.startDate).getTime() < new Date(endDate).getTime() &&
      new Date(endDate).getTime() < new Date(date.endDate).getTime()
    ) {
      return true;
    }
    if (
      new Date(date.startDate).getTime() < new Date(startDate).getTime() &&
      new Date(startDate).getTime() < new Date(date.endDate).getTime() &&
      new Date(date.startDate).getTime() < new Date(endDate).getTime() &&
      new Date(endDate).getTime() > new Date(date.endDate).getTime()
    ) {
      return true;
    }
  });
};
