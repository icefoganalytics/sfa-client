import express, { Request, Response } from "express";
import { ReferenceService } from "../../services/portal/reference-service";

export const portalReferenceRouter = express.Router();

const db = new ReferenceService();

portalReferenceRouter.get("/city", async (req: Request, res: Response) => {
  res.json({ data: await db.getCities() });
});

portalReferenceRouter.get("/province", async (req: Request, res: Response) => {
  res.json({ data: await db.getProvinces() });
});

portalReferenceRouter.get("/country", async (req: Request, res: Response) => {
  res.json({ data: await db.getCountries() });
});

portalReferenceRouter.get("/institution", async (req: Request, res: Response) => {
  res.json({ data: await db.getInstitutions() });
});

portalReferenceRouter.get("/education-level", async (req: Request, res: Response) => {
  res.json({ data: await db.getEducationLevels() });
});

portalReferenceRouter.get("/relationship", async (req: Request, res: Response) => {
  res.json({ data: await db.getRelationships() });
});

portalReferenceRouter.get("/first-nation", async (req: Request, res: Response) => {
  res.json({ data: await db.getFirstNations() });
});

portalReferenceRouter.get("/student-category", async (req: Request, res: Response) => {
  res.json({ data: await db.getStudentCategories() });
});

portalReferenceRouter.get("/high-school/:provinceId", async (req: Request, res: Response) => {
  const { provinceId } = req.params;
  res.json({ data: await db.getHighSchools(provinceId) });
});

portalReferenceRouter.get("/marital-status", async (req: Request, res: Response) => {
  res.json({ data: await db.getMaritalStatus() });
});

portalReferenceRouter.get("/aboriginal-status", async (req: Request, res: Response) => {
  res.json({ data: await db.getAboriginalStatus() });
});

portalReferenceRouter.get("/citizenship", async (req: Request, res: Response) => {
  res.json({ data: await db.getCitizenship() });
});

portalReferenceRouter.get("/income-type", async (req: Request, res: Response) => {
  res.json({ data: await db.getIncomeTypes() });
});

portalReferenceRouter.get("/study-area", async (req: Request, res: Response) => {
  res.json({ data: await db.getStudyAreas() });
});

portalReferenceRouter.get("/program", async (req: Request, res: Response) => {
  res.json({ data: await db.getPrograms() });
});

portalReferenceRouter.get("/agency", async (req: Request, res: Response) => {
  res.json({ data: await db.getAgencies() });
});

portalReferenceRouter.get("/expense-category", async (req: Request, res: Response) => {
  res.json({ data: await db.getExpenseCategories() });
});

portalReferenceRouter.get("/academic-year", async (req: Request, res: Response) => {
  res.json({ data: await db.getAcademicYears() });
});
