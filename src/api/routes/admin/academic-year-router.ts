import express, { Request, Response } from "express";
import { param, body } from "express-validator";
import knex from "knex";
import { ReturnValidationErrors } from "../../middleware";
import { DB_CONFIG } from "../../config";

const db = knex(DB_CONFIG);

export const academicYearRouter = express.Router();

const enum AcademicYearStatus {
  "Open",
  "Closed",
  "Archived",
}

academicYearRouter.get("/", async (req: Request, res: Response) => {
  const { filter = "Open" } = req.query;

  try {
    const query = db("sfa.academic_year").orderBy("sfa.academic_year.year", "desc");

    if (filter != "All") query.where("status", filter);

    return res.status(200).json({ success: true, data: await query });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json();
  }
});

academicYearRouter.put(
  "/:id",
  [param("id").isInt().notEmpty()],
  ReturnValidationErrors,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, is_open_in_portal } = req.body;

    db("sfa.academic_year")
      .where({ id })
      .update({ status, is_open_in_portal })
      .then(() => {
        res.json({ success: true });
      })
      .catch(function (e: any) {
        console.log(e);
        res.status(400).json({ wasUpdated: false, message: "Could Not Updated" });
      });
  }
);
