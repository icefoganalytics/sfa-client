import express, { Request, Response } from "express";
import { body, param } from "express-validator";
import knex from "knex";
import { ReturnValidationErrors } from "../../middleware";
import { DB_CONFIG } from "../../config";
import { AssessmentCslftRepository, AssessmentSTA } from "../../repositories/assessment";
import { AssessmentDTO, AssessmentTable, DisbursementDTO } from "../../models";
import { assessmentRouter } from "./assessment-router";
import axios from "axios";

const db = knex(DB_CONFIG);
export const assessmentSTARouter = express.Router();
const mainTable = "sfa.assessment";

assessmentSTARouter.get(
  "/assess-info/:id",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const assessmentSTARepo = new AssessmentSTA(db);
    const { id = undefined } = req.params;
    let results: Partial<AssessmentDTO> = {};

    try {
      const verifyFundingRequest = await db("sfa.funding_request").where({ id }).first();

      if (verifyFundingRequest && verifyFundingRequest?.request_type_id === 1) {
        const getAssessment = await db(mainTable).where("funding_request_id", verifyFundingRequest.id).first();

        if (getAssessment) {
          results = await assessmentSTARepo.getAssessInfo(
            parseInt(verifyFundingRequest.application_id),
            parseInt(verifyFundingRequest.id),
            getAssessment
          );
        } else {
          results = await assessmentSTARepo.getNewInfo(
            parseInt(verifyFundingRequest.application_id),
            parseInt(verifyFundingRequest.id),
            0,
            []
          );
        }
      }

      if (Object.keys(results).length > 0) {
        return res.status(200).json({ success: true, data: results });
      } else {
        return res.status(404).send();
      }
    } catch (error: any) {
      console.log(error);
      return res.status(404).send();
    }
  }
);
assessmentSTARouter.post(
  "/:funding_request_id/recalc",
  [param("funding_request_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const assessmentSTARepo = new AssessmentSTA(db);
    const { funding_request_id = undefined } = req.params;
    const { disbursementList = undefined, assessment_id = 0 } = req.body;

    let results: Partial<AssessmentDTO> = {};

    try {
      const verifyFundingRequest = await db("sfa.funding_request").where({ id: funding_request_id }).first();

      if (verifyFundingRequest && verifyFundingRequest?.request_type_id === 1) {
        console.log("HERE", verifyFundingRequest);

        results = await assessmentSTARepo.getNewInfo(
          parseInt(verifyFundingRequest.application_id),
          parseInt(verifyFundingRequest.id),
          parseInt(assessment_id),
          disbursementList ?? []
        );
      }

      if (Object.keys(results).length > 0) {
        return res.status(200).json({ success: true, data: results });
      } else {
        return res.status(404).send();
      }
    } catch (error: any) {
      console.log(error);
      return res.status(404).send();
    }
  }
);
assessmentSTARouter.post("/refreshdata", async (req: Request, res: Response) => {
  try {
    const assessmentSTARepo = new AssessmentSTA(db);
    const { application_id = 0, disbursementList = [], assessmentData = {} } = req.body;

    if (!application_id || !Object.keys(assessmentData)?.length) {
      return res.status(404).send();
    }

    let results: Partial<AssessmentDTO> = {};

    results = await assessmentSTARepo.refreshAssessmentData(assessmentData, disbursementList, parseInt(application_id));

    if (Object.keys(results).length > 0) {
      return res.status(200).json({ success: true, data: results });
    } else {
      return res.status(404).send();
    }
  } catch (error: any) {
    console.log(error);
    return res.status(404).send();
  }
});
assessmentSTARouter.post("/", async (req: Request, res: Response) => {
  try {
    const { assessment = undefined, disbursementList = [] } = req.body;

    const assessmentRepo = new AssessmentSTA(db);

    const notNullValues = {
      student_contrib_exempt: "No",
      spouse_contrib_exempt: "No",
      student_contribution_review: "No",
      spouse_contribution_review: "No",
      parent_contribution_review: "No",
    };

    let newApp: AssessmentDTO = {
      ...assessment,
      ...notNullValues,
    };

    const result = await assessmentRepo.newAssessment(newApp, disbursementList);

    if (result) {
      return res.json({ messages: [result] });
    }

    return res.status(404).send();
  } catch (err) {
    console.log(err);
    return res.json({ messages: [{ text: `Saved failed`, variant: "error" }] });
  }
});
assessmentSTARouter.put(
  "/:id",
  [param("id").isInt().notEmpty(), body("assessment").notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { assessment, disbursementList = undefined } = req.body;
    const id: number = parseInt(req.params.id);

    const assessmentRepo = new AssessmentSTA(db);

    let newApp: AssessmentDTO = {
      ...assessment,
    };

    try {
      const result = await assessmentRepo.saveAssessment(id, newApp, disbursementList ?? []);

      if (result) {
        return res.json({ messages: [result] });
      }

      return res.status(404).send();
    } catch (err) {
      console.log(err);
      return res.json({ messages: [{ text: `Saved failed`, variant: "error" }] });
    }
  }
);
assessmentSTARouter.post("/disburse", async (req: Request, res: Response) => {
  try {
    const { assessment = {}, application_id = null } = req.body;
    const assessmentSTARepo = new AssessmentSTA(db);

    if (!Object.keys(assessment)?.length && !application_id) {
      return res.status(404).send();
    }

    let results: Partial<DisbursementDTO[] | any[]> = [];

    results = await assessmentSTARepo.disburseAssessment(assessment, application_id);

    if (Object.keys(results).length > 0) {
      return res.status(200).json({ success: true, data: [...results] });
    } else {
      return res.status(404).send();
    }
  } catch (error: any) {
    console.log(error);
    return res.status(404).send();
  }
});
assessmentSTARouter.get(
  "/disbursements/:assessment_id",
  [param("assessment_id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { assessment_id = undefined } = req.params;

    let results: DisbursementDTO[] | undefined = undefined;

    try {
      const verifyAssessment = await db(mainTable).where({ id: assessment_id }).first();

      if (verifyAssessment) {
        results = await db("sfa.disbursement").where({ assessment_id });
      }

      if (results) {
        return res.status(200).json({ success: true, data: results });
      } else {
        return res.status(404).send();
      }
    } catch (error: any) {
      console.log(error);
      return res.status(404).send();
    }
  }
);
assessmentSTARouter.delete(
  "/disbursements/:id",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const verify: any = await db("sfa.disbursement").where({ id });

      if (!verify.length) return res.json({ success: false, message: `Disbursement not founded` });

      const resDelete = await db("sfa.disbursement").where({ id }).del();

      if (resDelete) {
        const updateStatusFundingRequest = await db("sfa.funding_request")
          .where({ id: verify[0].funding_request_id })
          .update({ status_id: 7 });

        return res.json({ success: true, message: `Deleted!` });
      } else {
        return res.json({ success: false, message: `Some failed` });
      }
    } catch (err) {
      console.log(err);
      return res.status(400).send(err);
    }
  }
);
