import express, { NextFunction, Request, Response } from "express";
import { body, param } from "express-validator";
import moment from "moment";
import knex from "knex";
import { ReturnValidationErrors, ReturnValidationErrorsCustomMessage } from "../../middleware";
import { DB_CONFIG } from "../../config";
import { first, orderBy } from "lodash";

let { RequireServerAuth, RequireAdmin } = require("../auth")

const db = knex(DB_CONFIG)

export const studentRouter = express.Router();


studentRouter.post("/",
    [body("first_name").notEmpty(), body("last_name").notEmpty()], ReturnValidationErrors,
    async (req: Request, res: Response) => {
        let { first_name, last_name, initials, locator_number, sin } = req.body;

        let student = {
            first_name, last_name, initials, locator_number, sin
        };

        let result = await insertStudent(student);

        res.json({ data: result })
    });

studentRouter.put("/:student_id",
    [param("student_id").isInt().notEmpty()], ReturnValidationErrors,
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

                if (!Object.keys(types).some(value => value === type)) {
                    return res.json({ messages: [{ variant: "error", text: "type valid is required" }] });
                }

                const getPerson = await db("sfa.person")
                    .where({ id: person_id })
                    .first();

                if (getPerson) {
                    if (type === "addressInfo") {

                        const table = types[type];

                        if (extraId !== null && isNaN(extraId)) {
                            const resUpdate = await db(table)
                                .insert({ ...data, person_id, address_type_id: addresTypes[addressType] });
                            return resUpdate ?
                                res.json({ messages: [{ variant: "success", text: "Student saved" }] })
                                :
                                res.json({ messages: [{ variant: "error", text: "Save failed" }] });
                        }

                        const getAddress: any = await await db(table)
                            .where({ id: extraId })
                            .first();

                        delete getAddress.id;


                        const resUpdate = await db(table)
                            .where({ id: extraId })
                            .update({ ...data });

                        return resUpdate > 0 ?
                            res.json({ messages: [{ variant: "success", text: "Student saved" }] })
                            :
                            res.json({ messages: [{ variant: "error", text: "Save failed" }] });
                    }

                    if (type === "personInfo" || type === "studentInfo") {

                        if (data.hasOwnProperty('first_name') && !data.first_name?.trim().length) {
                            return res.json({ messages: [{ variant: "error", text: "Student information record requires a first name." }] });
                        }

                        if (data.hasOwnProperty('last_name') && !data.last_name?.trim().length) {
                            return res.json({ messages: [{ variant: "error", text: "Student information record requires a last name." }] });
                        }

                        const table = types[type];

                        const typeId = type === "studentInfo" ?
                            { person_id: person_id }
                            :
                            { id: person_id };;

                        const resUpdate = await db(table)
                            .where({ ...typeId })
                            .update({ ...data });

                        return resUpdate > 0 ?
                            res.json({ messages: [{ variant: "success", text: "Student saved" }] })
                            :
                            res.json({ messages: [{ variant: "error", text: "Save failed" }] });
                    }

                    return res.json({ messages: [{ variant: "error", text: "Save failed" }] });

                }
            }

        } catch (error) {
            console.log(error)
            res.json({ messages: [{ variant: "error", text: "Save failed" }] });
        }
    }
);

studentRouter.patch("/:person_id/person",
    [param("person_id").isInt().notEmpty()], ReturnValidationErrors,
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
                    .where({ id: person_id  })
                    .returning("*");
                
                return resUpdate ?
                res.json({ messages: [{ variant: "success", text: "Updated" }] })
                :
                res.json({ messages: [{ variant: "error", text: "Failed to update" }] });

            }

        } catch (error) {
            console.log(error)
            return res.json({ messages: [{ variant: "error", text: "Save failed" }] });
        }
    }
);

studentRouter.post("/search",
    async (req: Request, res: Response) => {
        let { terms } = req.body;
        terms = terms.toLowerCase().trim()

        if (terms.length == 0)
            res.json({ data: [], messages: [{ variant: "error", text: "You must include search terms" }] });

        let termParts = terms.split(/[,-\s]/);
        termParts = termParts.filter((t: string) => t.trim().length > 0);

        let kq = db('sfa.student').join("sfa.person", "student.person_id", "person.id");
        kq.select("student.id as student_id", "person.id as person_id", "*")

        for (let part of termParts) {
            kq.whereRaw(`(LTRIM(STR(sin,20,0)) like ? OR lower(first_name) like ? OR lower(locator_number) like ?
        OR lower(last_name) like ? OR lower(email) like ? OR lower(yukon_id) like ? OR lower(user_name) like ?
        )`, [`${part}%`, `%${part}%`, `${part}%`, `%${part}%`, `${part}%`, `${part}%`, `${part}%`])
        }

        let results = await kq.orderBy("first_name").orderBy("last_name");

        for (let r of results) {
            delete r.id;
            r.id = r.student_id;

            let history = await db("sfa.application").where({ student_id: r.student_id }).count("* as counter").first();
            r.application_count = history?.counter;

            r.name = `${r.first_name} ${r.initials || ""} ${r.last_name}`.replace("  ", " ");

            if (r.birth_date)
                r.birth_date = moment(r.birth_date).utc(false).format("YYYY-MM-DD")
        };

        res.json({ data: results, meta: { item_count: results.length, page: 1, page_count: 1, page_size: results.length } })
    });

studentRouter.post("/:student_id/education", [param("student_id").isInt().notEmpty(),],
    ReturnValidationErrors, async (req: Request, res: Response) => {
        try {
            const { student_id } = req.params;
            const { data } = req.body;

            const student: any = await db("sfa.student").where({ id: student_id }).first();

            if (student) {

                const resInsert = await db("sfa.education")
                    .insert({ ...data, student_id });

                return resInsert ?
                    res.json({ messages: [{ variant: "success", text: "Saved" }] })
                    :
                    res.json({ messages: [{ variant: "error", text: "Failed" }] });

            }

            return res.status(404).send({ messages: [{ variant: "error", text: "Failed" }] });

        } catch (error) {
            console.error(error);
            return res.status(400).send({ messages: [{ variant: "error", text: "Failed", error }] });
        }
    }
);

studentRouter.put("/:student_id/education",
    [param("student_id").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
        try {
            const { student_id } = req.params;
            const { type, extraId, data, addressType } = req.body;

            const types: any = {
                educationInfo: "sfa.education",
            };

            if (!Object.keys(types).some(value => value === type)) {
                return res.json({ messages: [{ variant: "error", text: "type valid is required" }] });
            }

            const student: any = await db("sfa.student").where({ id: student_id }).first();

            if (student) {

                if (!Object.keys(data).some(value => value === "sin")) {
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

                return resUpdate > 0 ?
                    res.json({ messages: [{ variant: "success", text: "Saved" }] })
                    :
                    res.json({ messages: [{ variant: "error", text: "Save failed" }] });

            }

            return res.status(404).send();

        } catch (error) {
            console.error(error);
            return res.status(400).send(error);
        }
    }
);

studentRouter.delete("/:id/education", [param("id").isInt().notEmpty()], ReturnValidationErrors,
    async (req: Request, res: Response) => {

        const { id = null } = req.params;
        let description = "";
        try {

            const verifyRecord: any = await db("sfa.education")
                .where({ id: id })
                .first();

            if (!verifyRecord) {
                return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
            }

            description = verifyRecord?.description;

            const deleteRecord: any = await db("sfa.education")
                .where({ id: id })
                .del();

            return (deleteRecord > 0) ?
                res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
                :
                res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });

        } catch (error: any) {

            console.log(error);

            if (error?.number === 547) {
                return res.status(409).send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
            }

            return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
        }
    }
);

studentRouter.get("/:id",
    [param("id").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const student: any = await db("sfa.student").where({ id }).first();

            if (student) {

                const person = await db("sfa.person").where({ id: student.person_id }).first();

                if (person) {
                    const applicationInfo = await db("sfa.application")
                        .innerJoin("sfa.institution_campus", "application.institution_campus_id", "institution_campus.id")
                        .innerJoin("sfa.institution", "institution.id", "institution_campus.institution_id")
                        .select("application.*").select("institution.name as institution_name")
                        .where({ student_id: id }).orderBy("academic_year_id", "desc");

                    for (let item of applicationInfo) {
                        item.title = `${item.academic_year_id}: ${item.institution_name}`;
                    }

                    const consentInfo = await db("sfa.student_consent")
                        .where({ student_id: id });

                    const residenceInfo = await db("sfa.residence")
                        .where({ student_id: id });

                    const dependentInfo = await db("sfa.dependent")
                        .leftJoin(
                            "sfa.dependent_eligibility",
                            "sfa.dependent.id",
                            "sfa.dependent_eligibility.dependent_id"
                        )
                        .select(
                            "sfa.dependent_eligibility.application_id",
                            "sfa.dependent_eligibility.id as de_id",
                            "sfa.dependent_eligibility.is_csg_eligible",
                            "sfa.dependent_eligibility.is_csl_eligible",
                            "sfa.dependent_eligibility.is_eligible",
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
                            "sfa.dependent.student_id",
                        )
                        .where({ student_id: id });

                    const temporalAddress = await db("sfa.person_address")
                        .where({ person_id: student.person_id })
                        .where({ address_type_id: 2 })
                        .orderBy("id", "DESC")
                        .first();

                    const permanentAddress = await db("sfa.person_address")
                        .where({ person_id: student.person_id })
                        .where({ address_type_id: 1 })
                        .orderBy("id", "DESC")
                        .first();

                    const educationInfo = await db("sfa.education")
                        .leftJoin(
                            "sfa.institution_campus",
                            "sfa.education.institution_campus_id",
                            "sfa.institution_campus.id"
                        )
                        .select(
                            "sfa.education.id",
                            "sfa.education.from_year",
                            "sfa.education.from_month",
                            "sfa.education.to_year",
                            "sfa.education.to_month",
                            "sfa.education.study_area_id",
                            "sfa.education.institution_campus_id",
                            "sfa.institution_campus.institution_id",
                        )
                        .where(
                            "sfa.education.student_id",
                            student.id
                        );

                    let highSchoolInfo = {
                        city_id: null,
                        province_id: null,
                        country_id: null,
                    };

                    if (student?.high_school_id !== null && !isNaN(student?.high_school_id)) {

                        const resultsHighSchoolInfo = await db("sfa.high_school")
                            .where({ id: student.high_school_id })
                            .first();

                        if (resultsHighSchoolInfo) {
                            highSchoolInfo = { ...resultsHighSchoolInfo };
                        }

                    }

                    const data = {
                        ...person,
                        temporalAddress: { ...temporalAddress },
                        permanentAddress: { ...permanentAddress },
                        locator_number: student.locator_number,
                        yukon_id: student.yukon_id,
                        pre_funded_year: student.pre_funded_year,
                        adj_yg_funding_weeks: student.adj_yg_funding_weeks,
                        pre_funding_years_used: student.pre_funding_years_used,
                        adj_sta_upgrading_weeks: student.adj_sta_upgrading_weeks,
                        adj_outside_travel_cnt: student.adj_outside_travel_cnt,
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
                        applications: applicationInfo,
                        id: student.id
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

studentRouter.put("/:student_id/consent",
    [param("student_id").isInt().notEmpty(), body("extraId").notEmpty()],
    ReturnValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { student_id } = req.params;
            const { type, extraId, data } = req.body;

            if (!("consentInfo" === type)) {
                return res.json({ messages: [{ variant: "error", text: "type valid is required" }] });
            }

            if (Object.keys(data).some(k => k === 'consent_person') &&
                !(data.consent_person?.trim().length > 2)) {
                return res.json({ messages: [{ variant: "error", text: "Consent Person is required" }] });
            }

            const student: any = await db("sfa.student").where({ id: student_id }).first();

            if (student) {

                const resUpdate = await db("sfa.student_consent")
                    .where({ id: extraId })
                    .update({ ...data });

                return resUpdate > 0 ?
                    res.json({ messages: [{ variant: "success", text: "Saved" }] })
                    :
                    res.json({ messages: [{ variant: "error", text: "Save failed" }] });

            }

            return res.status(404).send();

        } catch (error) {
            console.error(error);
            return res.status(400).send(error);
        }
    }
);

studentRouter.post("/:student_id/consent",
    [
        param("student_id").isInt().notEmpty(),
        body('data.start_academic_year_id').notEmpty().withMessage("Start academic year is required"),
        body('data.end_academic_year_id').notEmpty().withMessage("End academic year is required"),
        body('data.consent_person').isString().isLength({ min: 3 }).withMessage("Consent person is required")
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

                const resInsert = await db("sfa.student_consent")
                    .insert({ ...data, student_id });

                return resInsert ?
                    res.json({ messages: [{ variant: "success", text: "Saved" }] })
                    :
                    res.json({ messages: [{ variant: "error", text: "Failed" }] });

            }

            return res.status(404).send({ messages: [{ variant: "error", text: "Failed" }] });

        } catch (error) {
            console.error(error);
            return res.status(400).send({ messages: [{ variant: "error", text: "Failed", error }] });
        }
    }
);

studentRouter.delete("/:id/consent", [param("id").isInt().notEmpty()], ReturnValidationErrors,
    async (req: Request, res: Response) => {

        const { id = null } = req.params;
        let description = "";
        try {

            const verifyRecord: any = await db("sfa.student_consent")
                .where({ id: id })
                .first();

            if (!verifyRecord) {
                return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
            }

            description = verifyRecord?.description;

            const deleteRecord: any = await db("sfa.student_consent")
                .where({ id: id })
                .del();

            return (deleteRecord > 0) ?
                res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
                :
                res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });

        } catch (error: any) {

            console.log(error);

            if (error?.number === 547) {
                return res.status(409).send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
            }

            return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
        }
    }
);

studentRouter.put("/:student_id/:application_id/dependent/:id",
    [param("student_id").isInt().notEmpty(), body("type").notEmpty()],
    ReturnValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { student_id, application_id, id } = req.params;
            const { type, data } = req.body;
            
            if ((type !== "dependent") && (type !== "d_eligibility"))  {
                return res.json({ messages: [{ variant: "error", text: "Type is required" }] });
            }

            const student: any = await db("sfa.student").where({ id: student_id }).first();
            const application: any = await db("sfa.application").where({ id: application_id }).first();

            if (student && application) {
                const table = type === "dependent" ? "sfa.dependent" : "sfa.dependent_eligibility";
                const resUpdate = await db(table)
                    .where({id })
                    .update({ ...data });

                return resUpdate > 0 ?
                    res.json({ messages: [{ variant: "success", text: "Saved" }] })
                    :
                    res.json({ messages: [{ variant: "error", text: "Save failed" }] });

            }

            return res.status(404).send();

        } catch (error) {
            console.error(error);
            return res.status(400).send(error);
        }
    }
);

studentRouter.post("/:student_id/:application_id/dependent", [param("student_id").isInt().notEmpty(), param("application_id").isInt().notEmpty()],
    ReturnValidationErrorsCustomMessage,
    async (req: Request, res: Response) => {
        try {
            const { student_id, application_id } = req.params;
            const { dependentData, dEligibilityData } = req.body;

            const student: any = await db("sfa.student").where({ id: student_id }).first();

            if (student) {

                await db.transaction(async (trx) => {

                    const [resInsertDependent]: any = await Promise.all(
                        [
                            trx('sfa.dependent')
                                .insert({ ...dependentData, student_id })
                                .returning("*"),
                        ]
                    )
                        
                    if (resInsertDependent) {
                        const resInsert = await trx("sfa.dependent_eligibility")
                            .insert({ 
                                ...dEligibilityData, 
                                dependent_id: resInsertDependent[0].id,
                                application_id,
                            })
                            .returning("*");

                            return resInsert ?
                                res.json({ messages: [{ variant: "success", text: "Saved" }] })
                                :
                                res.json({ messages: [{ variant: "error", text: "Failed" }] });
                    } else {
                        return res.json({ messages: [{ variant: "error", text: "Failed" }] });
                    }
                });

            } else {
                return res.status(404).send({ messages: [{ variant: "error", text: "Failed" }] });
            }

        } catch (error) {
            console.log(error);
             res.status(500).send({ messages: [{ variant: "error", text: "Failed", }] });
        }
    }
);

studentRouter.delete("/:d_elegibility_id/:dependent_id/dependent",  
    [
        param("d_elegibility_id").isInt().notEmpty(), 
        param("dependent_id").isInt().notEmpty(), 
    ], 
    ReturnValidationErrors,
    async (req: Request, res: Response) => {

        const { d_elegibility_id, dependent_id } = req.params;

        try {
            
            const verifyRecord: any = await db("sfa.dependent_eligibility")
                .where({ id: d_elegibility_id })
                .first();

            if (verifyRecord && verifyRecord.dependent_id !== Number(dependent_id)) {
                return res.status(404).send({ messages: [{ variant: "success", text: "The relationship between the data does not exist." }] });
            }

            const deleteRecordDEligibility: any = await db("sfa.dependent_eligibility")
                .where({ id: d_elegibility_id })
                .del();

            const deleteRecordDependent: any = await db("sfa.dependent_eligibility")
                .where({ id: dependent_id })
                .del();
            
            return (deleteRecordDEligibility > 0 && deleteRecordDependent > 0) ?
                res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
                :
                res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });

        } catch (error: any) {

            console.log(error);

            if (error?.number === 547) {
                return res.status(409).send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
            }

            return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
        }
    }
);

studentRouter.put("/:student_id/residence",
    [param("student_id").isInt().notEmpty(), body("extraId").isInt().notEmpty()],
    ReturnValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { student_id } = req.params;
            const { type, extraId, data } = req.body;

            if (!("residenceInfo" === type)) {
                return res.json({ messages: [{ variant: "error", text: "type valid is required" }] });
            }

            if (Object.keys(data).some(k => k === 'is_in_progress') &&
                !(data.is_in_progress)) {

                data.is_in_progress = false;

            }

            const student: any = await db("sfa.student").where({ id: student_id }).first();

            if (student) {
                const residence: any = await db("sfa.residence").where({ id: extraId }).first();

                if (Object.keys(data).some(k => k === 'from_month')) {
                    if (Number(data.from_month) > residence.to_month &&
                        residence.from_year === residence.to_year) {
                        data.to_month = null;
                    }
                }

                if (Object.keys(data).some(k => k === 'to_year')) {
                    if (residence.from_year === Number(data.to_year) &&
                        residence.from_month > residence.to_month) {
                        data.to_month = null;
                    }
                }

                if (Object.keys(data).some(k => k === 'from_year')) {
                    if (residence.to_year === Number(data.from_year) &&
                        residence.from_month > residence.to_month) {
                        data.to_month = null;
                    }

                    if (Number(data.from_year) > residence.to_year) {
                        data.to_year = null;
                    }
                }
                Object.keys(data).some(k => k === 'from_year')

                if (Object.keys(data).some(k => (k === 'from_year' || k === 'to_year' || k === 'from_month' || k === 'to_month'))) {

                    const regex = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;

                    const startYear = Object.keys(data).some(k => k === 'from_year') ? data.from_year : residence.from_year;
                    const startMonth = Object.keys(data).some(k => k === 'from_month') ?
                        (String(data.from_month).length === 1 ? "0" + data.from_month : data.from_month)
                        :
                        (String(residence.from_month).length === 1 ? "0" + residence.from_month : residence.from_month);

                    const endYear = Object.keys(data).some(k => k === 'to_year') ? data.to_year : residence.to_year;
                    const endMonth = Object.keys(data).some(k => k === 'to_month') ?
                        (String(data.to_month).length === 1 ? "0" + data.to_month : data.to_month)
                        :
                        (String(residence.to_month).length === 1 ? "0" + residence.to_month : residence.to_month);

                    const startDate = `${startYear}-${startMonth}-01`;
                    const endDate = `${endYear}-${endMonth}-01`;

                    if (regex.test(startDate) && regex.test(endDate)) {
                        const residences: any = await db("sfa.residence")
                            .select(db.raw(
                                `COALESCE(CAST(from_year as varchar(5)), '')+'-'+COALESCE(REPLICATE('0',2-LEN(from_month))+CAST(from_month AS varchar(4)), '')+'-01' as startDate,
                        COALESCE(CAST(to_year as varchar(5)), '')+'-'+COALESCE(REPLICATE('0',2-LEN(to_month))+CAST(to_month AS varchar(4)), '')+'-01' as endDate`
                            ))
                            .where({ student_id });

                        const filterResidences = residences.filter((residence: any) => {
                            return regex.test(residence.startDate) &&
                                regex.test(residence.endDate);
                        });

                        if (checkOverlap(filterResidences, startDate, endDate)) {
                            return res.status(404).send({
                                messages: [{
                                    variant: "error",
                                    text: "Residency period overlaps in time with an existing record."
                                }]
                            });
                        }
                    }
                }

                const resUpdate = await db("sfa.residence")
                    .where({ id: extraId })
                    .update({ ...data });

                return resUpdate > 0 ?
                    res.json({ messages: [{ variant: "success", text: "Saved" }] })
                    :
                    res.json({ messages: [{ variant: "error", text: "Save failed" }] });

            }

            return res.status(404).send();

        } catch (error) {
            console.error(error);
            return res.status(400).send(error);
        }
    }
);

studentRouter.post("/:student_id/residence", [
    param("student_id").isInt().notEmpty(),
    body('data.from_year').notEmpty().withMessage("from_year is required"),
    body('data.from_month').notEmpty().withMessage("from_month is required"),
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

                    .select(db.raw(
                        `COALESCE(CAST(from_year as varchar(5)), '')+'-'+COALESCE(REPLICATE('0',2-LEN(from_month))+CAST(from_month AS varchar(4)), '')+'-01' as startDate,
                        COALESCE(CAST(to_year as varchar(5)), '')+'-'+COALESCE(REPLICATE('0',2-LEN(to_month))+CAST(to_month AS varchar(4)), '')+'-01' as endDate`
                    ))
                    .where({ student_id });

                const filterResidences = residences.filter((residence: any) => {
                    const regex = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;

                    return regex.test(residence.startDate) &&
                        regex.test(residence.endDate);
                });

                if (checkOverlap(filterResidences, startDate, endDate)) {
                    return res.status(404).send({
                        messages: [{
                            variant: "error",
                            text: "Residency period overlaps in time with an existing record."
                        }]
                    });
                }

                const resInsert = await db("sfa.residence")
                    .insert({ ...data, student_id });

                return resInsert ?
                    res.json({ messages: [{ variant: "success", text: "Saved" }] })
                    :
                    res.json({ messages: [{ variant: "error", text: "Failed" }] });

            }

            return res.status(404).send({ messages: [{ variant: "error", text: "Failed" }] });

        } catch (error) {
            console.error(error);
            return res.status(400).send({ messages: [{ variant: "error", text: "Failed", error }] });
        }
    }
);

studentRouter.delete("/:id/residence", [param("id").isInt().notEmpty()], ReturnValidationErrors,
    async (req: Request, res: Response) => {

        const { id = null } = req.params;
        let description = "";
        try {

            const verifyRecord: any = await db("sfa.residence")
                .where({ id: id })
                .first();

            if (!verifyRecord) {
                return res.status(404).send({ wasDelete: false, message: "The record does not exits" });
            }

            description = verifyRecord?.description;

            const deleteRecord: any = await db("sfa.residence")
                .where({ id: id })
                .del();

            return (deleteRecord > 0) ?
                res.status(202).send({ messages: [{ variant: "success", text: "Removed" }] })
                :
                res.status(404).send({ messages: [{ variant: "error", text: "Record does not exits" }] });

        } catch (error: any) {

            console.log(error);

            if (error?.number === 547) {
                return res.status(409).send({ messages: [{ variant: "error", text: "Cannot be deleted because it is in use." }] });
            }

            return res.status(409).send({ messages: [{ variant: "error", text: "Error To Delete" }] });
        }
    }
);

studentRouter.get("/:student_id/applications",
    [param("student_id").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
        let { student_id } = req.params;

        let history_details = await db("sfa.history_detail")
            .innerJoin("sfa.institution", "history_detail.institution_id", "institution.institution_id")
            .innerJoin("sfa.study_area", "history_detail.study_area_id", "study_area.study_area_id")
            .innerJoin("sfa.program", "history_detail.program_id", "program.program_id")
            .select("history_detail.*")
            .select("institution.name as institution_name")
            .select("study_area.description as study_area_name")
            .select("program.description as program_name")
            .where({ student_id }).orderBy("academic_year", "desc");


        for (let h of history_details) {
            let fundingRequests = await db("sfa.funding_request")
                .innerJoin("sfa.request_type", "funding_request.request_type_id", "request_type.request_type_id")
                .where({ "funding_request.history_detail_id": h.HISTORY_DETAIL_ID })
                .select("funding_request.*")
                .select("request_type.short_name");

            h.funding_requests = fundingRequests;
        }

        res.json({ data: history_details })
    });

studentRouter.get("/:studentId/applications/:applicationId",
    async (req: Request, res: Response) => {
        let { studentId, applicationId } = req.params;

        res.json({ data: [{ appliation_id: 1123, institution_name: "HAPPY TOWN" }] })
    });

async function insertStudent(student: any) {
    let max = (await db("sfa.STUDENT").max("student_id as smax").first())?.smax;
    let limit = 5;

    while (limit > 0) {
        let next = max //+ 1;
        try {
            student.student_id = next;
            let returning = await knex('sfa.STUDENT').insert(student).returning("*");
            return returning[0];
        }
        catch (err) {
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

        if (new Date(startDate).getTime() === new Date(date.startDate).getTime() &&
            new Date(endDate).getTime() === new Date(date.endDate).getTime()) {

            return true;
        }
        if (new Date(date.startDate).getTime() < new Date(startDate).getTime() &&
            new Date(startDate).getTime() < new Date(date.endDate).getTime() &&
            new Date(date.startDate).getTime() < new Date(endDate).getTime() &&
            new Date(endDate).getTime() < new Date(date.endDate).getTime()) {

            return true;
        }
        if (new Date(date.startDate).getTime() > new Date(startDate).getTime() &&
            new Date(startDate).getTime() < new Date(date.endDate).getTime() &&
            new Date(date.startDate).getTime() < new Date(endDate).getTime() &&
            new Date(endDate).getTime() > new Date(date.endDate).getTime()) {

            return true;
        }
        if (new Date(date.startDate).getTime() > new Date(startDate).getTime() &&
            new Date(startDate).getTime() < new Date(date.endDate).getTime() &&
            new Date(date.startDate).getTime() < new Date(endDate).getTime() &&
            new Date(endDate).getTime() < new Date(date.endDate).getTime()) {

            return true;
        }
        if (new Date(date.startDate).getTime() < new Date(startDate).getTime() &&
            new Date(startDate).getTime() < new Date(date.endDate).getTime() &&
            new Date(date.startDate).getTime() < new Date(endDate).getTime() &&
            new Date(endDate).getTime() > new Date(date.endDate).getTime()) {

            return true;
        }

    });
};