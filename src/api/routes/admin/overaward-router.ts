import express, { Request, Response } from "express";
import knex from "knex";
import { DB_CONFIG } from "../../config";
import { RequireAdmin } from "../auth";
import { cleanNumber } from "@/models";
import { create } from "lodash";

const db = knex(DB_CONFIG);

export const overawardRouter = express.Router();

overawardRouter.use(RequireAdmin);

overawardRouter.get("/:studentId", async (req: Request, res: Response) => {
  const { studentId } = req.params;

  if (!studentId) return res.status(404).json({ success: false, message: "Student Id no provided" });

  try {
    const student = await db("sfa.student").where({ id: studentId }).first();
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const overaward = await db("sfa.overaward").where({ student_id: studentId }).orderBy("create_date", "asc");

    res.json({ success: true, data: overaward, netOveraward: overaward.reduce((acc, curr) => acc + curr.amount, 0) });
  } catch (error: any) {
    console.log(error);
    return res.status(500).send();
  }
});

overawardRouter.post("/:studentId", async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { academic_year_id, amount, note } = req.body;

  if (!studentId) return res.status(404).json({ success: false, message: "Student Id no provided" });

  try {
    const student = await db("sfa.student").where({ id: studentId }).first();
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const roundedAmount = Math.round(cleanNumber(amount) * 100) / 100;

    await db("sfa.overaward").insert({
      student_id: studentId,
      academic_year_id,
      amount: roundedAmount,
      note,
      created_by: req.user.email,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.log(error);
    return res.status(500).send();
  }
});

overawardRouter.put("/:studentId/:overawardId", async (req: Request, res: Response) => {
  const { studentId, overawardId } = req.params;
  const { academic_year_id, amount, note } = req.body;

  if (!studentId) return res.status(404).json({ success: false, message: "Student Id no provided" });

  try {
    const student = await db("sfa.student").where({ id: studentId }).first();
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const overaward = await db("sfa.overaward").where({ id: overawardId }).first();
    if (!overaward) return res.status(404).json({ success: false, message: "Overaward not found" });

    const roundedAmount = Math.round(cleanNumber(amount) * 100) / 100;

    await db("sfa.overaward").where({ id: overawardId }).update({
      academic_year_id,
      amount: roundedAmount,
      note,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.log(error);
    return res.status(500).send();
  }
});

overawardRouter.delete("/:studentId/:overawardId", async (req: Request, res: Response) => {
  const { studentId, overawardId } = req.params;

  if (!studentId) return res.status(404).json({ success: false, message: "Student Id no provided" });

  try {
    const student = await db("sfa.student").where({ id: studentId }).first();
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const overaward = await db("sfa.overaward").where({ id: overawardId }).first();
    if (!overaward) return res.status(404).json({ success: false, message: "Overaward not found" });

    await db("sfa.overaward").where({ id: overawardId }).delete();

    res.json({ success: true });
  } catch (error: any) {
    console.log(error);
    return res.status(500).send();
  }
});
