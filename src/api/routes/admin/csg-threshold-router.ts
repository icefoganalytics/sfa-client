import express, { Request, Response } from "express";
import knex from "knex";
import { DB_CONFIG } from "../../config";
import { isArray, sortBy } from "lodash";
import { param } from "express-validator";
import { ReturnValidationErrors } from "@/middleware";
import { cleanNumber, cleanNumberOptional } from "@/models";
import moment from "moment";
import { AssessmentCslftRepositoryV2 } from "@/repositories";
import logger from "@/utils/logger";

const db = knex(DB_CONFIG);

const CSLFT_REQUEST_TYPE_ID = 4;
const CSLPT_REQUEST_TYPE_ID = 5;

const CSGTU_REQUEST_TYPE_ID = 28;
const CSGD_REQUEST_TYPE_ID = 29;
const CSGDSE_REQUEST_TYPE_ID = 30;
const CSGPT_REQUEST_TYPE_ID = 31;
const CSFTDEP_REQUEST_TYPE_ID = 32;
const CSPTDEP_REQUEST_TYPE_ID = 33;
const CSGFT_REQUEST_TYPE_ID = 35;

export const csgThresholdRouter = express.Router();

csgThresholdRouter.get(
  "/:academic_year_id",
  param("academic_year_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { academic_year_id } = req.params;
    let data = await db("sfa.csg_threshold").where({ academic_year_id });
    let rates = await db("sfa.csg_lookup").where({ academic_year_id }).first();
    let childcare = await db("sfa.child_care_ceiling").where({ academic_year_id });
    let allowances = await db("sfa.student_living_allowance").where({ academic_year_id });
    res.json({ data, rates, childcare, allowances });
  }
);

csgThresholdRouter.delete(
  "/funding-request/:funding_request_id/assessment/:assessment_id",
  param("assessment_id").isInt(),
  param("funding_request_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { assessment_id, funding_request_id } = req.params;

    let disbursements = await db("sfa.disbursement").where({ assessment_id });

    if (disbursements) {
      let eCertDisbursements = disbursements.filter((d) => d.csl_cert_seq_number);

      if (eCertDisbursements.length)
        return res.status(400).json({ errors: ["Cannot delete an assessment with eCert disbursements"] });

      await db("sfa.disbursement").where({ assessment_id }).delete();
    }

    await db("sfa.assessment").where({ id: assessment_id }).delete();
    return res.status(200).json({ data: "Assessment Deleted" });
  }
);

csgThresholdRouter.put(
  "/funding-request/:funding_request_id/assessment/:assessment_id",
  param("assessment_id").isInt(),
  param("funding_request_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { assessment_id, funding_request_id } = req.params;
    const {
      assessed_date,
      csl_over_reason_id,
      csl_non_reason_id,
      over_award,
      return_uncashable_cert,
      student_contribution_override,
      spouse_contribution_override,
      parent_contribution_override,
      disbursements,
      generateTransaction,
    } = req.body;

    if (disbursements && disbursements.length > 0) {
      let transaction_number = (await db.raw(`select next value for sfa.csl_transaction_seq as nextval`))[0].nextval;

      for (let disb of disbursements) {
        disb.assessment_id = assessment_id;
        disb.funding_request_id = funding_request_id;
        delete disb.financial_batch_id; // not editable through the interface
        delete disb.csl_cert_seq_number;

        if (disb.id) {
          let id = disb.id;
          delete disb.id;
          disb.disbursed_amount = cleanNumber(disb.disbursed_amount);
          await db("sfa.disbursement").where({ id }).update(disb);
        } else {
          disb.transaction_number = transaction_number;
          await db("sfa.disbursement").insert(disb);
        }
      }
    }

    let updateValue = {
      assessed_date,
      csl_non_reason_id,
      csl_over_reason_id,
      return_uncashable_cert: cleanNumberOptional(return_uncashable_cert),
      over_award: cleanNumberOptional(over_award),
      student_contribution_override: cleanNumberOptional(student_contribution_override),
      spouse_contribution_override: cleanNumberOptional(spouse_contribution_override),
      parent_contribution_override: cleanNumberOptional(parent_contribution_override),
    };

    let fundingRequest = await db("sfa.funding_request").where({ id: funding_request_id }).first();
    let assessment = await db("sfa.assessment").where({ id: assessment_id }).first();

    if (generateTransaction === true) {
      await generateOrConnectMSFAA(fundingRequest, fundingRequest.application_id);
    }

    assessment = Object.assign(assessment, updateValue);

    let repo = new AssessmentCslftRepositoryV2(db);
    assessment = await repo.updateCalcs(assessment);
    let calced = await repo.loadExisting(assessment, fundingRequest.application_id);

    if (!calced) return res.status(500).send("Error loading assessment");

    await db("sfa.assessment")
      .where({ id: assessment_id })
      .update({
        assessed_date,
        assessed_amount: calced.assessed_amount,
        csl_assessed_need: calced.csl_assessed_need,
        return_uncashable_cert: cleanNumberOptional(return_uncashable_cert),
        over_award: cleanNumberOptional(over_award),
        student_contribution_override: cleanNumberOptional(student_contribution_override),
        spouse_contribution_override: cleanNumberOptional(spouse_contribution_override),
        parent_contribution_override: cleanNumberOptional(parent_contribution_override),
      });

    return res.status(200).json({ data: "Assessment Saved" });
  }
);

csgThresholdRouter.put(
  "/funding-request/:funding_request_id/assessment/:assessment_id/recalculate",
  param("assessment_id").isInt(),
  param("funding_request_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { assessment_id, funding_request_id } = req.params;

    let repo = new AssessmentCslftRepositoryV2(db);

    try {
      let recalc = await repo.create(funding_request_id, assessment_id);

      delete (recalc as any).id;
      delete (recalc as any).assessment_type_id;
      (recalc as any).student_contribution_override = null;
      (recalc as any).spouse_contribution_override = null;
      (recalc as any).parent_contribution_override = null;
      (recalc as any).over_award = null;
      (recalc as any).return_uncashable_cert = null;
      (recalc as any).csl_non_reason_id = null;
      (recalc as any).csl_over_reason_id = null;

      await db("sfa.assessment").where({ id: assessment_id }).update(recalc);
      return res.status(200).json({ data: "Assessment Saved" });
    } catch (error) {
      console.log("CATCHING", error);
      logger.error(error);
      return res.status(400).json({ error });
    }
  }
);

csgThresholdRouter.post(
  "/funding-request/:funding_request_id/assessment/:assessment_id/record-overaward",
  param("assessment_id").isInt(),
  param("funding_request_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { assessment_id, funding_request_id } = req.params;

    let fundingRequest = await db("sfa.funding_request").where({ id: funding_request_id }).first();
    let application = await db("sfa.application").where({ id: fundingRequest.application_id }).first();
    let assessment = await db("sfa.assessment").where({ id: assessment_id }).first();
    let student = await db("sfa.student").where({ id: application.student_id }).first();

    let repo = new AssessmentCslftRepositoryV2(db);
    let loaded = await repo.loadExisting(assessment, fundingRequest.application_id);

    if (!loaded) return res.status(500).send("Error loading assessment");

    let existingOveraward = student.pre_over_award_amount ?? 0;
    existingOveraward += Math.abs(loaded.net_amount);

    const amount = Math.round(loaded.net_amount * 100) / 100;

    await db("sfa.overaward").insert({
      student_id: student.id,
      academic_year_id: application.academic_year_id,
      application_id: fundingRequest.application_id,
      funding_request_id,
      assessment_id,
      created_by: req.user.email,
      note: "Created from overaward in CLSFT Assessment",
      amount,
    });

    //await db("sfa.student").where({ id: application.student_id }).update({ pre_over_award_amount: existingOveraward });

    //await db("sfa.assessment").where({ id: assessment_id }).update(recalc);
    return res.status(200).json({ data: "Assessment Saved" });
  }
);

csgThresholdRouter.post(
  "/funding-request/:funding_request_id/assessment/:assessment_id/clear-overaward",
  param("assessment_id").isInt(),
  param("funding_request_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { assessment_id, funding_request_id } = req.params;

    let fundingRequest = await db("sfa.funding_request").where({ id: funding_request_id }).first();
    let application = await db("sfa.application").where({ id: fundingRequest.application_id }).first();
    let assessment = await db("sfa.assessment").where({ id: assessment_id }).first();
    let student = await db("sfa.student").where({ id: application.student_id }).first();

    let repo = new AssessmentCslftRepositoryV2(db);
    let loaded = await repo.loadExisting(assessment, fundingRequest.application_id);

    if (!loaded) return res.status(500).send("Error loading assessment");

    let existingOveraward = student.pre_over_award_amount ?? 0;
    existingOveraward -= Math.abs(loaded.net_amount);

    await db("sfa.student").where({ id: application.student_id }).update({ pre_over_award_amount: existingOveraward });

    return res.status(200).json({ data: "Assessment Saved" });
  }
);

csgThresholdRouter.post(
  "/cslft/:application_id/funding-request/:funding_request_id/assessment",
  param("application_id").isInt(),
  param("funding_request_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id, funding_request_id } = req.params;

    let repo = new AssessmentCslftRepositoryV2(db);
    let newAssessment = await repo.create(funding_request_id);

    if (newAssessment) {
      let inserted = await repo.insert(newAssessment);
      let loaded = await repo.loadExisting(inserted, application_id);
      return res.status(200).json({ data: loaded });
    } else {
      return res.status(500).send();
    }
  }
);

csgThresholdRouter.get(
  "/cslft/:application_id/:assessment_id?",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id, assessment_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSLFT_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessments = await db("sfa.assessment")
        .select(["id", "assessed_date", "assessment_type_id"])
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("assessed_date");

      funding_request.assessments = assessments;
      let assessment = null;

      let msfaa = await db("sfa.msfaa").where({ application_id }).first();

      // if one is requested, return that, otherwise return the most recent
      if (assessment_id) {
        assessment = await db("sfa.assessment")
          .where({
            funding_request_id: funding_request.id,
            id: assessment_id,
          })
          .orderBy("id", "asc")
          .first();
      } else {
        assessment = await db("sfa.assessment")
          .where({
            funding_request_id: funding_request.id,
          })
          .orderBy("assessed_date", "desc")
          .first();
      }

      try {
        let repo = new AssessmentCslftRepositoryV2(db);
        // if there aren't any yet, build a new one
        if (!assessment) {
          assessment = await repo.create(funding_request.id);

          if (assessment) {
            assessment = await repo.loadExisting(assessment, application_id);
            delete (assessment as any).id;
            return res.json({ data: { funding_request, assessment, disbursements: [], msfaa } });
          }
        } else {
          assessment = await repo.loadExisting(assessment, funding_request.application_id);

          if (assessment) {
            let disbursements = await db("sfa.disbursement")
              .where({
                funding_request_id: funding_request.id,
                assessment_id: assessment.id,
              })
              .orderBy("issue_date")
              .orderBy("id");
            return res.json({ data: { funding_request, assessment, disbursements, msfaa } });
          }
        }
      } catch (error) {
        console.log("catcing error", error);
        logger.error(error);
        return res.status(400).send("Error loading assessment - " + (error as any).message);
      }
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/cslpt/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSLPT_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      let msfaa = await db("sfa.msfaa").where({ application_id }).first();

      return res.json({ data: { funding_request, assessment, disbursements, msfaa } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/csgftdep/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSFTDEP_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      return res.json({ data: { funding_request, assessment, disbursements } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/csgd/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSGD_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      return res.json({ data: { funding_request, assessment, disbursements } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/csgtu/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSGTU_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      return res.json({ data: { funding_request, assessment, disbursements } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/csgdse/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSGDSE_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      return res.json({ data: { funding_request, assessment, disbursements } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/csgft/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSGFT_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      let msfaa = await db("sfa.msfaa").where({ application_id }).first();

      return res.json({ data: { funding_request, assessment, disbursements, msfaa } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/csgpt/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSGPT_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      return res.json({ data: { funding_request, assessment, disbursements } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/csgdpt/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSGD_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      return res.json({ data: { funding_request, assessment, disbursements } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.get(
  "/csgptdep/:application_id",
  param("application_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id } = req.params;

    let funding_request = await db("sfa.funding_request")
      .where({ application_id, request_type_id: CSPTDEP_REQUEST_TYPE_ID })
      .orderBy("id", "desc")
      .first();

    if (funding_request) {
      let assessment = await db("sfa.assessment")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("id", "desc")
        .first();

      let disbursements = await db("sfa.disbursement")
        .where({
          funding_request_id: funding_request.id,
        })
        .orderBy("issue_date")
        .orderBy("id");

      return res.json({ data: { funding_request, assessment, disbursements } });
    }

    res.status(404).send("Funding Request not found");
  }
);

csgThresholdRouter.post(
  "/csgftdep/:application_id/funding-request/:funding_request_id/assessment",
  param("application_id").isInt(),
  param("funding_request_id").isInt(),
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { application_id, funding_request_id } = req.params;

    let assessment = req.body;
    let disbursements = assessment.disbursements;
    let generateTransactions = assessment.generateTransaction;
    assessment.funding_request_id = funding_request_id;
    delete assessment.disbursements;
    delete assessment.generateTransaction;

    let fundingRequest = await db("sfa.funding_request").where({ id: funding_request_id }).first();
    let transaction_number = undefined;

    if (assessment.return_uncashable_cert)
      assessment.return_uncashable_cert = cleanNumber(assessment.return_uncashable_cert);

    if (fundingRequest && fundingRequest.request_type_id == CSLPT_REQUEST_TYPE_ID) {
      if (generateTransactions === true) {
        transaction_number = (await db.raw(`select next value for sfa.csl_transaction_seq as nextval`))[0].nextval;

        let childDisbursements = await db("sfa.funding_request")
          .join("sfa.disbursement", "funding_request.id", "disbursement.funding_request_id")
          .select("disbursement.*")
          .whereIn("request_type_id", [CSGPT_REQUEST_TYPE_ID, CSGD_REQUEST_TYPE_ID, CSPTDEP_REQUEST_TYPE_ID])
          .where({ application_id })
          .whereRaw(`(disbursement.transaction_number IS NULL OR disbursement.transaction_number = '')`);

        for (let cd of childDisbursements) {
          await db("sfa.disbursement").where({ id: cd.id }).update({ transaction_number });
        }

        await generateOrConnectMSFAA(fundingRequest, application_id);
      }
    }

    let assessmentInsert = await db("sfa.assessment").insert(assessment).returning("*");

    if (assessmentInsert.length > 0 && disbursements && isArray(disbursements)) {
      for (let disb of disbursements) {
        disb.assessment_id = assessmentInsert[0].id;
        disb.funding_request_id = funding_request_id;
        delete disb.financial_batch_id; // not editable through the interface
        delete disb.csl_cert_seq_number;

        if (disb.id) {
          let id = disb.id;
          delete disb.id;
          disb.disbursed_amount = cleanNumber(disb.disbursed_amount);
          await db("sfa.disbursement").where({ id }).update(disb);
        } else {
          disb.transaction_number = transaction_number;
          await db("sfa.disbursement").insert(disb);
        }
      }
    }

    res.status(201).send();
  }
);

csgThresholdRouter.put(
  "/csgftdep/:application_id/funding-request/:funding_request_id/assessment/:assessment_id",
  async (req: Request, res: Response) => {
    const { application_id, funding_request_id, assessment_id } = req.params;
    let assessment = req.body;
    let disbursements = assessment.disbursements;
    let generateTransactions = assessment.generateTransaction;
    delete assessment.id;
    delete assessment.disbursements;
    delete assessment.generateTransaction;

    if (assessment.return_uncashable_cert)
      assessment.return_uncashable_cert = cleanNumber(assessment.return_uncashable_cert);

    await db("sfa.assessment").where({ id: assessment_id }).update(assessment);
    let transaction_number = undefined;

    if (generateTransactions === true) {
      transaction_number = (await db.raw(`select next value for sfa.csl_transaction_seq as nextval`))[0].nextval;
    }

    let fundingRequest = await db("sfa.funding_request").where({ id: funding_request_id }).first();

    if (fundingRequest && fundingRequest.request_type_id == CSLPT_REQUEST_TYPE_ID) {
      if (generateTransactions === true) {
        let childDisbursements = await db("sfa.funding_request")
          .join("sfa.disbursement", "funding_request.id", "disbursement.funding_request_id")
          .select("disbursement.*")
          .where({ application_id })
          .whereIn("request_type_id", [CSGPT_REQUEST_TYPE_ID, CSGD_REQUEST_TYPE_ID, CSPTDEP_REQUEST_TYPE_ID])
          .whereRaw(`(disbursement.transaction_number IS NULL OR disbursement.transaction_number = '')`);

        for (let cd of childDisbursements) {
          await db("sfa.disbursement").where({ id: cd.id }).update({ transaction_number });
        }

        await generateOrConnectMSFAA(fundingRequest, application_id);
      }
    }

    for (let disb of disbursements) {
      disb.assessment_id = assessment_id;
      disb.funding_request_id = funding_request_id;

      disb.disbursed_amount = cleanNumber(disb.disbursed_amount);

      delete disb.financial_batch_id; // not editable through the interface
      delete disb.csl_cert_seq_number;

      if (disb.id) {
        let id = disb.id;
        delete disb.id;

        await db("sfa.disbursement").where({ id }).update(disb);
      } else {
        disb.transaction_number = transaction_number;
        await db("sfa.disbursement").insert(disb);
      }
    }

    res.status(202).send();
  }
);

csgThresholdRouter.delete(
  "/csgftdep/:application_id/funding-request/:funding_request_id/disbursement/:disbursement_id",
  async (req: Request, res: Response) => {
    const { application_id, funding_request_id, disbursement_id } = req.params;

    await db("sfa.disbursement").where({ id: disbursement_id }).delete();

    res.status(202).send();
  }
);

async function generateOrConnectMSFAA(fundingRequest: any, application_id: number | string) {
  const relevantForMSFAA = [CSLPT_REQUEST_TYPE_ID, CSLFT_REQUEST_TYPE_ID];

  if (fundingRequest && relevantForMSFAA.includes(fundingRequest.request_type_id)) {
    const is_full_time = fundingRequest.request_type_id == CSLFT_REQUEST_TYPE_ID;
    let msfaaForApplication = await db("sfa.msfaa").where({ application_id, is_full_time });

    if (msfaaForApplication.length == 0) {
      let app = await db("sfa.application").where({ id: application_id }).select("student_id").first();

      if (app) {
        let msfaaForStudent = await db("sfa.msfaa")
          .where({ student_id: app.student_id, is_full_time })
          .whereNull("cancel_date");

        if (msfaaForStudent.length > 0) {
          let relevantIds = new Array<number>();

          for (let msfaa of msfaaForStudent) {
            let msfaaApp = await db("sfa.application").where({ id: msfaa.application_id }).first();

            if (msfaaApp) {
              if (moment(new Date()).diff(msfaaApp.classes_end_date, "year") > 2) {
                await db("sfa.msfaa").where({ id: msfaa.id }).update({
                  cancel_date: new Date(),
                  cancel_reason: "> 2 yrs out of school",
                  msfaa_status: "Cancelled",
                });
                console.log("CANCELLEING EXPIRED MSFAA", msfaa.id);
              } else {
                relevantIds.push(msfaa.id);
              }
            }
          }

          if (relevantIds.length > 0) {
            relevantIds = sortBy(relevantIds, "desc").reverse();
            let first = true;

            for (let relevantId of relevantIds) {
              if (first) {
                await db("sfa.msfaa").where({ id: relevantId }).update({
                  application_id,
                });
                console.log("MOVING MSFAA", relevantId, application_id);
              } else {
                await db("sfa.msfaa").where({ id: relevantId }).update({
                  cancel_date: new Date(),
                  cancel_reason: "Duplicate",
                  msfaa_status: "Cancelled",
                });
                console.log("CANCELLING DUP MSFAA", relevantId);
              }

              first = false;
            }
          }
        }

        msfaaForStudent = await db("sfa.msfaa")
          .where({ student_id: app.student_id, is_full_time })
          .whereNull("cancel_date");

        if (msfaaForStudent.length == 0) {
          await db("sfa.msfaa").insert({
            application_id,
            student_id: app.student_id,
            msfaa_status: "Pending",
            is_full_time,
          });
          console.log("ADDING NEW MSFAA", {
            application_id,
            student_id: app.student_id,
            msfaa_status: "Pending",
            is_full_time,
          });
        }
      }
    }
  }
}
