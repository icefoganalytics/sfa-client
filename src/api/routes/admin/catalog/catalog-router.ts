import knex from "knex";
import express, { Request, Response } from "express";

import { DB_CONFIG } from "@/config";
import { RequireAdmin } from "@/routes/auth";
import { CatalogPolicy } from "./catalog-policy";

const db = knex(DB_CONFIG);
const policies = new CatalogPolicy();

export const catalogRouter = express.Router();
catalogRouter.use(RequireAdmin);

catalogRouter.get("/rate_tables/:academic_year_id", async (req: Request, res: Response) => {
  const { academic_year_id } = req.params;

  const csg_lookup = await db("csg_lookup").withSchema("sfa").where({ academic_year_id }).orderBy("id");
  const csl_lookup = await db("csl_lookup").withSchema("sfa").where({ academic_year_id }).orderBy("id");
  const sta_lookup = await db("sta_lookup").withSchema("sfa").where({ academic_year_id }).orderBy("id");
  const yg_cost = await db("yg_cost").withSchema("sfa").where({ academic_year_id }).orderBy("id");
  const parent_contribution_formula = await db("parent_contribution_formula")
    .withSchema("sfa")
    .where({ academic_year_id })
    .orderBy("id");
  const csg_threshold = await db("csg_threshold").withSchema("sfa").where({ academic_year_id }).orderBy("family_size");
  const child_care_ceiling = await db("child_care_ceiling").withSchema("sfa").where({ academic_year_id }).orderBy("id");
  const student_living_allowance = await db("student_living_allowance")
    .withSchema("sfa")
    .where({ academic_year_id })
    .orderBy("id");
  const standard_of_living = await db("standard_of_living").withSchema("sfa").where({ academic_year_id }).orderBy("id");

  res.json({
    data: {
      csg_lookup,
      csl_lookup,
      sta_lookup,
      yg_cost,
      parent_contribution_formula,
      csg_threshold,
      child_care_ceiling,
      student_living_allowance,
      standard_of_living,
    },
  });
});

catalogRouter.post("/rate_tables/:academic_year_id", async (req: Request, res: Response) => {
  const { academic_year_id } = req.params;

  await db("csg_lookup").withSchema("sfa").insert({
    academic_year_id,
    csg_8_month_amount: 0,
    csg_dep_monthly_amount: 0,
    csg_pd_yearly_amount: 0,
    csg_pdse_yearly_amount: 0,
    csgpt_yearly_amount: 0,
    csgpt_dep_max_amount: 0,
    csgpt_dep_1_2_weekly_amount: 0,
    csgpt_dep_3_weekly_amount: 0,
  });

  await db("csl_lookup").withSchema("sfa").insert({
    academic_year_id,
    return_transport_max_amount: 0,
    allowable_weekly_amount: 0,
    student_exempt_amount: 0,
    vehicle_deduction_amount: 0,
    rrsp_deduction_yearly_amount: 0,
    relocation_max_amount: 0,
    mileage_rate: 0,
    discretionary_costs_max_amount: 0,
    merit_exempt_amount: 0,
    books_max_amount: 0,
    student_contrib_percent: 0,
    spouse_contrib_percent: 0,
    csg_8_month_amount: 0,
    csg_pt_yearly_amount: 0,
    low_income_student_contrib_amount: 0,
    student_contrib_max_amount: 0,
    csl_pt_max_amount: 0,
    csl_pt_wk_misc_amount: 0,
  });

  await db("sta_lookup").withSchema("sfa").insert({
    academic_year_id,
    dependent_0_amount: 0,
    dependent_1_amount: 0,
    dependent_2_amount: 0,
    dependent_3_amount: 0,
    dependent_4_amount: 0,
    second_residence_amount: 0,
  });

  await db("yg_cost").withSchema("sfa").insert({
    academic_year_id,
    effective_date: null,
    expiry_date: null,
    semester_living_amount: 0,
    semester_tuition_amount: 0,
    semester_book_amount: 0,
    quarter_living_amount: 0,
    quarter_tuition_amount: 0,
    quarter_book_amount: 0,
    weekly_amount: 0,
    allowed_percent: 100,
  });

  const incomeRanges = [
    { from: 1, to: 7000 },
    { from: 7000.01, to: 14000 },
    { from: 14000.01, to: 999999 },
  ];

  incomeRanges.forEach(async (range) => {
    await db("parent_contribution_formula").withSchema("sfa").insert({
      academic_year_id,
      income_from_amount: range.from,
      income_to_amount: range.to,
      add_amount: 0,
      percentage: 0,
      subtract_amount: 0,
      divide_by: 0,
    });
  });

  const familySizes = [1, 2, 3, 4, 5, 6, 7];

  familySizes.forEach(async (family_size) => {
    await db("csg_threshold").withSchema("sfa").insert({
      academic_year_id,
      family_size,
      income_threshold: 0,
      income_cutoff: 0,
      phase_out_rate: 0,
      low_income_threshold: 0,
      middle_income_threshold: 0,
      csgpt_phase_out_rate: 0,
      csgpt_dep2_phase_out_rate: 0,
      csgpt_dep3_phase_out_rate: 0,
      csgft_dep_phase_out_rate: 0,
    });
  });

  const provinces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  provinces.forEach(async (province_id) => {
    await db("child_care_ceiling").withSchema("sfa").insert({ academic_year_id, province_id, max_amount: 0 });
  });

  const studentCategories = [1, 2, 4, 5, 6, 7, 8];

  provinces.forEach(async (province_id) => {
    studentCategories.forEach(async (student_category_id) => {
      await db("student_living_allowance").withSchema("sfa").insert({
        academic_year_id,
        province_id,
        student_category_id,
        shelter_amount: 0,
        food_amount: 0,
        misc_amount: 0,
        public_tranport_amount: 0,
      });
    });
  });

  const standardFamilySizes = [2, 3, 4, 5, 6, 7, 8, 9, 10];

  provinces.forEach(async (province_id) => {
    standardFamilySizes.forEach(async (family_size) => {
      await db("standard_of_living").withSchema("sfa").insert({
        academic_year_id,
        province_id,
        family_size,
        standard_living_amount: 0,
      });
    });
  });

  res.json({ data: {} });
});

catalogRouter.get("/:table", async (req: Request, res: Response) => {
  const { table } = req.params;
  const policy = policies.get(table);

  if (!policy) return res.status(400).send("Catalog not available");

  let items = await db(policy.tableName).withSchema(policy.schema).orderBy(policy.idColumn);

  res.json({ data: items });
});

catalogRouter.post("/:table", async (req: Request, res: Response) => {
  const { table } = req.params;
  const policy = policies.get(table);

  if (!policy) return res.status(400).json({ data: "Catalog not available" });
  if (policy.readonly) return res.status(400).json({ data: "Catalog readonly" });

  try {
    await db(policy.tableName).withSchema(policy.schema).insert(req.body);
  } catch (e) {
    return res.status(400).json({ data: "Save failed: " + e });
  }

  res.json({ success: true });
});

catalogRouter.put("/:table/:id", async (req: Request, res: Response) => {
  const { table, id } = req.params;
  const policy = policies.get(table);

  if (!policy) return res.status(400).json({ data: "Catalog not available" });
  if (policy.readonly) return res.status(400).json({ data: "Catalog readonly" });

  try {
    await db(policy.tableName).withSchema(policy.schema).where({ id }).update(req.body);
  } catch (e) {
    return res.status(400).json({ data: "Save failed: " + e });
  }

  res.json({ success: true });
});

catalogRouter.delete("/:table/:id", async (req: Request, res: Response) => {});
