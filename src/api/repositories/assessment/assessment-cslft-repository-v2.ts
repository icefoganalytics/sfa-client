import { cleanNumber } from "@/models";
import { monthsBetween, weeksBetween } from "@/utils/date-utils";
import logger from "@/utils/logger";
import { Knex } from "knex";
import { clone, sumBy } from "lodash";
import moment from "moment";

export class AssessmentCslftRepositoryV2 {
  readonly db;

  fundingRequest: any;
  application: any;
  student: any;
  assessments: any[] = [];
  dependents: any[] = [];
  expenses: any[] = [];
  incomes: any[] = [];
  disbursements: any[] = [];
  otherFunds: any[] = [];
  csgThreshold: any[] = [];
  csgLookup: any;
  cslLookup: any;
  childcareCeiling: any;
  livingAllowance: any;
  dependentAllowance: any;
  sdaAllowance: any;
  studentCategories: any[] = [];

  constructor(db: Knex) {
    this.db = db;
  }

  async insert(value: CSLFTAssessmentBase): Promise<CSLFTAssessmentBase> {
    delete (value as any).id;
    return (await this.db("sfa.assessment").insert(value).returning("*"))[0];
  }

  async load(fundingRequestId: number) {
    this.fundingRequest = await this.db("sfa.funding_request").where({ id: fundingRequestId }).first();
    await this.loadApplication(this.fundingRequest.application_id);
    await this.loadLookups();

    //this.application = await this.db("sfa.application").where({ id: this.fundingRequest.application_id }).first();
    this.student = await this.db("sfa.student").where({ id: this.application.student_id }).first();

    this.assessments = await this.db("sfa.assessment")
      .where({ funding_request_id: fundingRequestId })
      .orderBy("assessed_date");

    this.dependents = await this.db("sfa.dependent")
      .innerJoin("sfa.dependent_eligibility", "dependent.id", "dependent_eligibility.dependent_id")
      .innerJoin("sfa.application", "application.id", "dependent_eligibility.application_id")
      .select([
        "dependent.id",
        "is_disability",
        "is_sta_eligible",
        "is_post_secondary",
        "is_csl_eligible",
        "is_csg_eligible",
      ])
      .select(
        this.db.raw(
          "(0 + FORMAT(COALESCE(application.classes_start_date, GETDATE()),'yyyyMMdd') - FORMAT(birth_date,'yyyyMMdd') ) / 10000 age"
        )
      )
      .where({ "dependent_eligibility.application_id": this.application.id });

    this.expenses = await this.db("sfa.expense")
      .innerJoin("sfa.expense_category", "expense_category.id", "expense.category_id")
      .select("expense.*", "expense_category.description as categoryName")
      .where({ application_id: this.application.id });

    this.incomes = await this.db("sfa.income")
      .innerJoin("sfa.income_type", "income.income_type_id", "income_type.id")
      .select("income.*", "income_type.assess_as_asset")
      .where({ application_id: this.application.id });
    this.disbursements = await this.db("sfa.disbursement").where({ funding_request_id: this.fundingRequest.id });

    this.otherFunds = await this.db("sfa.funding_request")
      .where({ application_id: this.application.id })
      .join("sfa.disbursement", "disbursement.funding_request_id", "funding_request.id")
      .select("request_type_id")
      .groupBy("request_type_id")
      .sum("disbursed_amount as disbursed_amount");

    /* let ftLoan = otherFunds.find((f) => f.request_type_id == 4);
    let ftGrant = otherFunds.find((f) => f.request_type_id == 35);
    let ftDepGrant = otherFunds.find((f) => f.request_type_id == 32);
    let disGrant = otherFunds.find((f) => f.request_type_id == 29);
    let disSEGrant = otherFunds.find((f) => f.request_type_id == 30);
    let topup = otherFunds.find((f) => f.request_type_id == 28); */

    let depCategory = this.studentCategories.find((c) => c.code == "DEP");

    this.dependentAllowance = await this.db("sfa.student_living_allowance")
      .where({
        academic_year_id: this.application.academic_year_id,
        province_id: this.application.study_province_id,
        student_category_id: depCategory.id,
      })
      .first();

    let sdaCategory = this.studentCategories.find((c) => c.code == "SDA");

    this.sdaAllowance = await this.db("sfa.student_living_allowance")
      .where({
        academic_year_id: this.application.academic_year_id,
        province_id: this.application.study_province_id,
        student_category_id: sdaCategory.id,
      })
      .first();
  }

  async create(
    fundingRequestId: number | string,
    assessmentId: number | string = 9999999
  ): Promise<CSLFTAssessmentBase | undefined> {
    await this.load(parseInt(`${fundingRequestId}`));

    let assess = await this.calculateBase();
    assess.id = parseInt(`${assessmentId}`);

    await this.calculateCosts(assess);
    await this.calculateContribution(assess);
    await this.calculateParental(assess);

    let full = await this.postLoad(assess, this.application.id);

    assess.csl_assessed_need = full.csl_assessed_need;

    await this.calculateAward(assess);
    return assess;
  }

  async loadExisting(
    input: CSLFTAssessmentBase,
    applicationId: number | string
  ): Promise<CSLFTAssessmentFull | undefined> {
    await this.load(input.funding_request_id);
    let full = await this.postLoad(input, applicationId);
    return full;
  }

  async postLoad(base: CSLFTAssessmentBase, applicationId: number | string): Promise<CSLFTAssessmentFull> {
    let input = clone(base) as CSLFTAssessmentFull;

    input.cslft_scholastic_total = 0;
    input.shelter_total = 0;
    input.p_trans_total = 0;
    input.day_care_total = 0;
    input.depend_food_total = 0;
    input.depend_tran_total = 0;
    input.discretionary_cost_total = 0;

    input.cslft_scholastic_total = cleanDollars(input.tuition_estimate + input.books_supplies_cost);

    input.shelter_total = cleanDollars(
      (this.livingAllowance.shelter_amount + this.livingAllowance.food_amount + this.livingAllowance.misc_amount) *
        input.study_months
    );

    input.p_trans_total = cleanDollars(
      (this.application.study_bus ? this.livingAllowance.public_tranport_amount : 0) * input.study_months
    );

    input.family_income = 0;

    if (this.application.csl_classification == 1) {
      input.family_income = cleanDollars(
        (this.application.parent1_income ?? 0) + (this.application.parent2_income ?? 0)
      );
    }
    // single parent is 1 + eligible dependent count
    else if (this.application.csl_classification == 4) {
      input.family_income = cleanDollars(this.application.student_ln150_income ?? 0);
    }
    // married is 2 + eligible dependent count
    else if (this.application.csl_classification == 3) {
      input.family_income = cleanDollars(
        (this.application.student_ln150_income ?? 0) + (this.application.spouse_ln150_income ?? 0)
      );
    }
    // single independent is always 1
    else {
      input.family_income = cleanDollars(this.application.student_ln150_income ?? 0);
    }

    input.pstudy_weeks = weeksBetween(input.pstudy_start_date, input.pstudy_end_date);
    input.pstudy_months = monthsBetween(input.pstudy_start_date, input.pstudy_end_date);

    input.cslft_scholastic_total = cleanDollars(input.tuition_estimate + input.books_supplies_cost);

    input.shelter_total = cleanDollars(input.study_months * input.shelter_month);
    input.p_trans_total = cleanDollars(input.study_months * input.p_trans_month);
    input.r_trans_total = cleanDollars(input.r_trans_16wk * (input.study_weeks > 16 ? 2 : 1));
    input.day_care_total = cleanDollars(input.study_months * Math.min(input.day_care_allowable, input.day_care_actual));
    input.depend_food_total = cleanDollars(input.study_months * input.depend_food_allowable);
    input.depend_tran_total = cleanDollars(input.study_months * input.depend_tran_allowable);
    input.discretionary_cost_total = cleanDollars(Math.min(input.discretionary_cost, input.discretionary_cost_actual));

    let expensesToSkip = [3, 11, 15, 16]; // daycare, discretionary, tuition, books

    let uncapped = await this.db("sfa.expense")
      .innerJoin("sfa.expense_category", "expense_category.id", "expense.category_id")
      .select("expense.*", "expense_category.description as categoryName")
      .where({ application_id: applicationId, period_id: 2 })
      .whereNotIn("category_id", expensesToSkip);

    let uncapped_expenses = uncapped.map((u) => {
      return { category: u.categoryName, description: u.description, amount: u.amount };
    });

    input.total_costs =
      input.cslft_scholastic_total +
      input.shelter_total +
      input.p_trans_total +
      input.x_trans_total +
      input.r_trans_total +
      input.relocation_total +
      input.day_care_total +
      input.depend_food_total +
      input.depend_tran_total +
      input.discretionary_cost_total +
      uncapped_expenses.reduce((a: number, i: any) => a + i.amount, 0);

    input.parent_income_total = input.parent1_income + input.parent2_income;
    input.parent_tax_total = input.parent1_tax_paid + input.parent2_tax_paid;
    input.parent_net_income_total = input.parent_income_total - input.parent_tax_total;

    if (this.application.csl_classification == 1) {
      // if no parent address, fall back to home
      let parentAddress = await this.db("sfa.person_address")
        .where({
          person_id: this.student.person_id,
          is_active: true,
        })
        .whereIn("address_type_id", [1, 4])
        .orderBy("address_type_id", "desc")
        .first();

      if (parentAddress && parentAddress.province_id) {
        if (input.family_size == 1) {
          input.family_size = 2;

          logger.error(`${this.application.id} - Family size of 1 is being set to 2 to avoid an error`);
        }

        let parentMsol = await this.db("sfa.standard_of_living")
          .where({
            academic_year_id: this.application.academic_year_id,
            province_id: parentAddress.province_id,
            family_size: input.family_size,
          })
          .first();

        if (!parentMsol) {
          console.log(
            "PARENTMSOL NOT FOUND",
            this.application.academic_year_id,
            parentAddress.province_id,
            input.family_size
          );

          logger.error(
            `${this.application.id} - Cannot find Parent Moderate Standard of living for province: ${parentAddress.province_id} and family size: ${input.family_size}`
          );

          /* throw Error(
            `Cannot find Parent Moderate Standard of living for province: ${parentAddress.province_id} and family size: ${input.family_size}`
          ); */
        }
        input.parent_msol = parentMsol.standard_living_amount ?? 0;
        input.parent_discretionary_income = Math.round(input.parent_net_income_total - input.parent_msol);

        if (input.parent_discretionary_income > 0) {
          let contribution = await this.db("sfa.parent_contribution_formula")
            .where({ academic_year_id: this.application.academic_year_id })
            .where("income_from_amount", "<=", input.parent_discretionary_income)
            .where("income_to_amount", ">=", input.parent_discretionary_income)
            .first();

          if (contribution) {
            input.parent_weekly_contrib =
              (contribution.add_amount +
                (input.parent_discretionary_income - contribution.subtract_amount) * (contribution.percentage / 100)) /
              contribution.divide_by;

            input.parent_contribution = input.parent_weekly_contrib * input.study_weeks;
          } else {
            console.log(
              "Contribution Formula not found for ",
              this.application.academic_year_id,
              input.parent_discretionary_income
            );

            logger.error(
              `${this.application.id} - Contribution Formula not found for parent discretionary income: ${input.parent_discretionary_income}`
            );

            /* throw Error(
              `Contribution Formula not found for parent discretionary income: ${input.parent_discretionary_income}`
            ); */

            contribution = await this.db("sfa.parent_contribution_formula")
              .where({ academic_year_id: this.application.academic_year_id })
              .first();

            input.parent_weekly_contrib =
              (contribution.add_amount +
                (input.parent_discretionary_income - contribution.subtract_amount) * (contribution.percentage / 100)) /
              contribution.divide_by;

            input.parent_contribution = input.parent_weekly_contrib * input.study_weeks;

            console.log("INSTEAD USING BASIC: ", contribution);
          }
        } else {
          input.parent_contribution = 0;
        }
      }
    }

    let meritBased = this.incomes.filter((i) => i.income_type_id == 16);
    let meritBasedAmount = sumBy(meritBased, "amount");
    let meritExemption = this.cslLookup.merit_exempt_amount;
    let meritNet = Math.max(meritBasedAmount - meritExemption, 0);
    let otherIncomes = this.incomes.filter((i) => i.assess_as_asset && i.income_type_id != 16);
    let otherSum = sumBy(otherIncomes, "amount");

    input.student_other_resources = otherSum + meritNet;

    let total_contribution = 0;
    input.student_contrib_exempt_reason = "";
    input.spouse_contrib_exempt_reason = "";

    if (input.csl_classification == 3) {
      // married - use student and spouse
      if (input.student_contrib_exempt == "NO") {
        input.student_contrib_exempt_reason = "Not Exempt";

        if (input.student_contribution_override) {
          total_contribution += input.student_contribution_override;
        } else {
          //input.student_previous_contribution = 0; // not sure what to do with this???
          //input.student_contrib_exempt_reason = "";
          total_contribution += input.student_contribution; // + input.student_other_resources;
        }
      } else {
        input.student_contrib_exempt_reason = "Exempt: ";
        total_contribution += input.student_other_resources;

        if (this.student.is_crown_ward) input.student_contrib_exempt_reason += "Student is crown ward";
        else if (this.application.is_disabled || this.application.is_perm_disabled)
          input.student_contrib_exempt_reason += "Student is disabled";
        else if (input.dependent_count > 0) input.student_contrib_exempt_reason += "Student has dependents";
        else input.student_contrib_exempt_reason += "Student has aboriginal status";
      }

      if (input.spouse_contrib_exempt == "NO") {
        input.spouse_contrib_exempt_reason = "Not Exempt";

        if (input.spouse_contribution_override) {
          total_contribution += input.spouse_contribution_override;
        } else {
          //input.spouse_previous_contribution = 0; // again not sure about this
          total_contribution += input.spouse_contribution;
        }
      } else {
        input.spouse_contrib_exempt_reason = "Exempt: ";

        if (this.application.spouse_study_emp_status_id != 4) input.spouse_contrib_exempt_reason += "Not employed";
        else if (this.spouseIsFullTimeStudent()) input.spouse_contrib_exempt_reason += "Full-time student";
        else input.spouse_contrib_exempt_reason += "Family income threshold not met";
      }
    } else if (input.csl_classification == 1) {
      input.student_contrib_exempt_reason = "Not Applicable";
      input.spouse_contrib_exempt_reason = "Not Applicable";

      //input.parent_contribution_override = 0;

      if (input.student_contrib_exempt == "NO") {
        if (input.student_contribution_override) {
          total_contribution += input.student_contribution_override;
        } else {
          //input.student_previous_contribution = 0; // not sure what to do with this???
          total_contribution += input.student_contribution /* + input.student_other_resources */;
        }
      }

      if (input.parent_contribution_override) {
        total_contribution += input.parent_contribution_override;
      } else {
        total_contribution += input.parent_contribution;
      }
    } else {
      // single
      input.spouse_contrib_exempt_reason = "Not Applicable";

      if (input.student_contrib_exempt == "NO") {
        input.student_contrib_exempt_reason = "Not Exempt";

        if (input.student_contribution_override) {
          total_contribution += input.student_contribution_override;
        } else {
          //input.student_previous_contribution = 0; // not sure what to do with this???
          total_contribution += input.student_contribution /* + input.student_other_resources */;
        }
      } else {
        input.student_contrib_exempt_reason = "Exempt: ";

        if (this.student.is_crown_ward) input.student_contrib_exempt_reason += "Student is crown ward";
        else if (this.application.is_disabled || this.application.is_perm_disabled)
          input.student_contrib_exempt_reason += "Student is disabled";
        else if (input.dependent_count > 0) input.student_contrib_exempt_reason += "Student has dependents";
        else input.student_contrib_exempt_reason += "Student has aboriginal status";

        if (input.student_contribution_override) {
          total_contribution += input.student_contribution_override;
        }
      }
    }
    input.total_contribution = total_contribution;
    input.total_resources = input.total_contribution;
    input.csl_assessed_need = input.total_costs - input.total_resources;
    input.csl_assessed_need_pct = input.csl_assessed_need * 0.6;

    input.max_allowable = 0;

    if (this.cslLookup) {
      input.max_allowable = (this.cslLookup.allowable_weekly_amount ?? 0) * input.study_weeks;
    }

    const minVal = Math.min(
      input.csl_assessed_need_pct - input.total_grant_awarded /* - input.total_contribution */,
      input.max_allowable
    );
    input.calculated_award = Math.max(0, minVal);

    let prev = await this.db("sfa.disbursement")
      .where({ funding_request_id: input.funding_request_id })
      .where("assessment_id", "<", input.id)
      .select(this.db.raw("SUM(COALESCE(disbursed_amount, 0)) AS sum"))
      .first();

    input.previous_cert = prev.sum ?? 0;

    input.previous_disbursement = sumBy(
      this.disbursements.filter((d) => d.assessment_id == input.id),
      "disbursed_amount"
    );

    //over_award can only be as big as the calculated = clear partial

    input.net_amount =
      input.assessed_amount /* -
      (input.over_award ?? 0) */ -
      input.previous_cert -
      input.previous_disbursement /* -
      (input.return_uncashable_cert ?? 0) */;

    input.net_amount = Math.round(input.net_amount * 100) / 100;
    input.net_amount = input.net_amount == -0 ? 0 : input.net_amount;
    return input;
  }

  async updateCalcs(assess: CSLFTAssessmentBase): Promise<CSLFTAssessmentBase> {
    await this.load(assess.funding_request_id);
    let sixty = assess.csl_assessed_need * 0.6;
    let max_allowable = (this.cslLookup.allowable_weekly_amount ?? 0) * assess.study_weeks;

    let total_contribution = 0;

    if (assess.csl_classification == 3) {
      // married - use student and spouse

      if (assess.student_contrib_exempt == "NO") {
        if (assess.student_contribution_override) {
          total_contribution += assess.student_contribution_override;
        } else {
          //input.student_previous_contribution = 0; // not sure what to do with this???
          total_contribution += assess.student_contribution;
        }
      } else {
      }

      if (assess.spouse_contrib_exempt == "NO") {
        if (assess.spouse_contribution_override) {
          total_contribution += assess.spouse_contribution_override;
        } else {
          //input.spouse_previous_contribution = 0; // again not sure about this
          total_contribution += assess.spouse_contribution;
        }
      }
    } else if (assess.csl_classification == 1) {
      assess.parent_contribution_override = 0;
    } else {
      // single

      if (assess.student_contrib_exempt == "NO") {
        if (assess.student_contribution_override) {
          total_contribution += assess.student_contribution_override;
        } else {
          //input.student_previous_contribution = 0; // not sure what to do with this???
          total_contribution += assess.student_contribution;
        }
      } else {
        if (assess.student_contribution_override) {
          total_contribution += assess.student_contribution_override;
        }
      }
    }

    const calculated_award_min = Math.min(
      sixty - (assess.total_grant_awarded ?? 0) /*  - total_contribution */,
      max_allowable ?? 0
    );
    const calculated_award: number = Math.max(0, Math.round(calculated_award_min));

    if (assess.csl_full_amt_flag == 0) {
      assess.assessed_amount = Math.max(
        Math.min(calculated_award, assess.csl_request_amount ?? 0) -
          (assess.over_award ?? 0) -
          (assess.return_uncashable_cert ?? 0),
        0
      );
    } else {
      assess.assessed_amount =
        Math.max((calculated_award ?? 0) - (assess.over_award ?? 0), 0) - (assess.return_uncashable_cert ?? 0);
    }

    let cslft_scholastic_total = cleanDollars(assess.tuition_estimate + assess.books_supplies_cost);

    let shelter_total = cleanDollars(assess.study_months * assess.shelter_month);
    let p_trans_total = cleanDollars(assess.study_months * assess.p_trans_month);
    let r_trans_total = cleanDollars(assess.r_trans_16wk * (assess.study_weeks > 16 ? 2 : 1));
    let day_care_total = cleanDollars(
      assess.study_months * Math.min(assess.day_care_allowable, assess.day_care_actual)
    );
    let depend_food_total = cleanDollars(assess.study_months * assess.depend_food_allowable);
    let depend_tran_total = cleanDollars(assess.study_months * assess.depend_tran_allowable);
    let discretionary_cost_total = cleanDollars(Math.min(assess.discretionary_cost, assess.discretionary_cost_actual));

    let expensesToSkip = [3, 11, 15, 16]; // daycare, discretionary, tuition, books

    let uncapped = await this.db("sfa.expense")
      .innerJoin("sfa.expense_category", "expense_category.id", "expense.category_id")
      .select("expense.*", "expense_category.description as categoryName")
      .where({ application_id: this.application.id, period_id: 2 })
      .whereNotIn("category_id", expensesToSkip);

    let uncapped_expenses = uncapped.map((u) => {
      return { category: u.categoryName, description: u.description, amount: u.amount };
    });

    let total_costs =
      cslft_scholastic_total +
      shelter_total +
      p_trans_total +
      assess.x_trans_total +
      r_trans_total +
      assess.relocation_total +
      day_care_total +
      depend_food_total +
      depend_tran_total +
      discretionary_cost_total +
      uncapped_expenses.reduce((a: number, i: any) => a + i.amount, 0);

    assess.csl_assessed_need = total_costs - total_contribution;

    //assess.total_contribution = total_contribution;
    //assess.total_resources = assess.total_contribution;

    return assess;
  }

  async loadApplication(id: string | number) {
    this.application = await this.db("sfa.application").where({ id }).first();

    this.studentCategories = await this.db("sfa.student_category");

    this.application.category_id = this.determineCategoryId(
      this.application.csl_classification,
      this.application.study_accom_code
    );

    if (this.application.category_id == -1) {
      logger.error(
        `${this.application.id} - Cannot determine student category for csl: ${this.application.csl_classification}, study accomodation: ${this.application.study_accom_code}`
      );
      throw Error(
        `Cannot determine student category for csl: ${this.application.csl_classification}, study accomodation: ${this.application.study_accom_code}`
      );
    }
  }

  async loadLookups() {
    this.csgThreshold = await this.db("sfa.csg_threshold").where({
      academic_year_id: this.application.academic_year_id,
    });
    this.csgLookup = await this.db("sfa.csg_lookup")
      .where({ academic_year_id: this.application.academic_year_id })
      .first();
    this.cslLookup = await this.db("sfa.csl_lookup")
      .where({ academic_year_id: this.application.academic_year_id })
      .first();
    this.childcareCeiling = await this.db("sfa.child_care_ceiling")
      .where({
        academic_year_id: this.application.academic_year_id,
        province_id: this.application.study_province_id,
      })
      .first();

    this.livingAllowance = await this.db("sfa.student_living_allowance")
      .where({
        academic_year_id: this.application.academic_year_id,
        province_id: this.application.study_province_id,
        student_category_id: this.application.category_id,
      })
      .first();
  }

  async calculateBase(): Promise<CSLFTAssessmentBase> {
    let assess = clone(DEFAULT_BASE);

    assess.assessment_type_id = this.assessments.length > 0 ? 2 : 1;
    assess.funding_request_id = this.fundingRequest.id;
    assess.classes_start_date = this.application.classes_start_date;
    assess.classes_end_date = this.application.classes_end_date;
    assess.program_id = this.application.program_id;
    assess.study_area_id = this.application.study_area_id;

    assess.pstudy_end_date = new Date(
      moment.utc(assess.classes_start_date).add(-1, "month").endOf("month").format("YYYY-MM-DD")
    );
    assess.pstudy_start_date = new Date(
      moment.utc(assess.pstudy_end_date).add(-3, "month").startOf("month").format("YYYY-MM-DD")
    );

    assess.study_weeks = weeksBetween(assess.classes_start_date, assess.classes_end_date);
    assess.study_months = monthsBetween(assess.classes_start_date, assess.classes_end_date);
    assess.prestudy_province_id = this.application.prestudy_province_id;
    assess.study_province_id = this.application.study_province_id;

    assess.prestudy_accom_code = this.application.prestudy_accom_code;
    assess.study_accom_code = this.application.study_accom_code;
    assess.csl_classification = this.application.csl_classification;
    assess.prestudy_csl_classification = this.application.csl_classification;
    assess.study_distance = this.application.study_distance;

    assess.marital_status_id = this.application.marital_status_id;
    assess.study_living_w_spouse_flag = this.application.study_living_w_spouse;
    assess.study_bus_flag = this.application.study_bus;

    assess.period = assess.study_months <= 4 ? "S" : "P";

    assess.csl_request_amount = this.fundingRequest.csl_request_amount;
    assess.csl_full_amt_flag = this.fundingRequest.is_csl_full_amount == true ? 1 : 0;

    let family = await calculateFamilySize(this.db, this.application.csl_classification, this.application.id);

    assess.student_contribution_review = assess.assessment_type_id === 2 ? "YES" : "NO";
    assess.spouse_contribution_review = assess.assessment_type_id === 2 ? "YES" : "NO";
    assess.parent_contribution_review = assess.assessment_type_id === 2 ? "YES" : "NO";

    assess.prestudy_bus_flag = this.application.prestudy_bus;
    assess.study_living_w_spouse_flag = this.application.study_living_w_spouse;

    if ([3, 4].includes(assess.marital_status_id ?? 0)) {
      if (assess.study_living_w_spouse_flag) {
        assess.spouse_province_id = this.application.study_province_id;
      } else {
        assess.spouse_province_id = this.application.prestudy_province_id;
      }
    }

    let parentDeps = await this.db("sfa.parent_dependent")
      .where({ application_id: this.application.id, is_eligible: 1, is_attend_post_secondary: 1 })
      .count("id as count")
      .first();

    assess.parent_ps_depend_count = 1 + (parentDeps ? parseInt(`${parentDeps.count}`) : 0);
    assess.dependent_count = family.csl_dependants;
    assess.family_size = family.family_size;
    assess.student_family_size = family.family_size;
    return assess;
  }

  async calculateCosts(assess: CSLFTAssessmentBase): Promise<CSLFTAssessmentBase> {
    assess.tuition_estimate = cleanDollars(this.application.tuition_estimate_amount);
    assess.books_supplies_cost = cleanDollars(this.application.books_supplies_cost);

    let returnTrans = 0;
    let returnTransTot = 0;
    let relocation = 0;

    if (this.application.study_province_id != this.application.prestudy_province_id) {
      relocation = this.cslLookup.relocation_max_amount;
    }
    assess.relocation_total = relocation;

    this.application.study_living_w_spouse = this.application.study_living_w_spouse ?? false;
    this.application.prestudy_accom_code = this.application.prestudy_accom_code ?? 0;

    // if you are married and not living with your spouse, you get return trans
    if (this.application.csl_classification == 3 && this.application.study_living_w_spouse == false) {
      returnTrans = this.cslLookup.return_transport_max_amount;
      assess.r_trans_16wk = returnTrans;
      returnTransTot = returnTrans;

      if (assess.study_weeks >= 16) returnTransTot = returnTrans * 2;
    }

    // if you are living with your parents and
    if (this.application.prestudy_accom_code == 1 && this.application.study_accom_code != 1) {
      returnTrans = this.cslLookup.return_transport_max_amount;
      assess.r_trans_16wk = returnTrans;
      returnTransTot = returnTrans;

      if (assess.study_weeks >= 16) returnTransTot = returnTrans * 2;
    }

    // if study and prestudy are the same place, you don't get the return trans
    if (this.application.prestudy_city_id == this.application.study_city_id) {
      assess.r_trans_16wk = 0;
      returnTrans = 0;
      returnTransTot = 0;
    }

    let costsCapped = [];
    assess.shelter_month =
      this.livingAllowance.shelter_amount + this.livingAllowance.food_amount + this.livingAllowance.misc_amount;

    /* costsCapped.push({
      name: "shelter",
      allowable: cleanDollars(
        this.livingAllowance.shelter_amount + this.livingAllowance.food_amount + this.livingAllowance.misc_amount
      ),
      actual: 0,
      total: assess.shelter_total,
    }); */

    assess.p_trans_month = this.application.study_bus ? this.livingAllowance.public_tranport_amount : 0;
    /* costsCapped.push({
      name: "publicTrans",
      allowable: cleanDollars(this.application.study_bus ? this.livingAllowance.public_tranport_amount : 0),
      actual: 0,
      total: assess.p_trans_total,
    }); */

    let extTransTot = 0;

    if (this.application.study_distance ?? 0 > 0) {
      let max_x_trans = this.sdaAllowance.shelter_amount * assess.study_months;
      let calc_x_trans = this.application.study_distance * 2 * this.cslLookup.mileage_rate * assess.study_weeks * 5;
      extTransTot = cleanDollars(Math.min(max_x_trans, calc_x_trans));
    }
    assess.x_trans_total = extTransTot;

    costsCapped.push({ name: "extTrans", allowable: 0, actual: 0, total: extTransTot });

    costsCapped.push({
      name: "returnTrans",
      allowable: cleanDollars(returnTrans),
      actual: 0,
      total: cleanDollars(returnTransTot),
    });

    costsCapped.push({ name: "relocation", allowable: 0, actual: 0, total: cleanDollars(relocation) });

    let dayCareActual = 0;
    let dayCareAllowable = 0;
    let dayCareTot = 0;
    let depFood = 0;
    let depPTrans = 0;

    if (assess.dependent_count > 0) {
      dayCareActual = this.expenses
        .filter((f) => f.category_id == 3 && f.period_id == 2) // monthly daycare during study
        .reduce((a: number, i: any) => {
          return a + i.amount;
        }, 0);

      dayCareAllowable = this.childcareCeiling.max_amount * assess.dependent_count;
      dayCareTot = Math.min(dayCareAllowable, dayCareActual) * assess.study_months;

      depFood =
        assess.dependent_count *
        (this.dependentAllowance.shelter_amount +
          this.dependentAllowance.food_amount +
          this.dependentAllowance.misc_amount);

      depPTrans =
        assess.dependent_count * (this.application.study_bus ? this.dependentAllowance.public_tranport_amount : 0);

      /*     this.assessment.depend_food_allowable =
        (
          this.livingAllowance.shel
          
          await this.studentLivingAllowanceRepo.getShelterFoodMisc(
          this.application.academic_year_id,
          study_prov,
          studyCodes.DEP
        )) * assess.dependent_count; */
    }

    assess.day_care_allowable = dayCareAllowable;
    assess.day_care_actual = dayCareActual;

    assess.depend_food_allowable = depFood;
    assess.depend_tran_allowable = depPTrans;

    let discretionaryActual = this.expenses
      .filter((e) => e.category_id == 11 && e.period_id == 2)
      .reduce((a: number, i: any) => {
        return a + i.amount;
      }, 0);

    costsCapped.push({
      name: "dayCare",
      allowable: cleanDollars(dayCareAllowable),
      actual: cleanDollars(dayCareActual),
      total: cleanNumber(dayCareTot),
    });
    costsCapped.push({
      name: "dependentShelter",
      allowable: cleanDollars(depFood),
      actual: 0,
      total: cleanDollars(depFood * assess.study_months),
    });
    costsCapped.push({
      name: "dependentPTrans",
      allowable: cleanDollars(depPTrans),
      actual: 0,
      total: cleanDollars(depPTrans * assess.study_months),
    });
    costsCapped.push({
      name: "discretionary",
      allowable: cleanDollars(this.cslLookup.discretionary_costs_max_amount),
      actual: cleanDollars(discretionaryActual),
      total: cleanDollars(Math.min(discretionaryActual, this.cslLookup.discretionary_costs_max_amount)),
    });

    assess.discretionary_cost = this.cslLookup.discretionary_costs_max_amount;
    assess.discretionary_cost_actual = discretionaryActual;

    let costsUncapped = [] as any[];

    let skippedExpenses = [11, 3];
    for (let expense of this.expenses.filter((e) => e.period_id == 2 && skippedExpenses.indexOf(e.category_id) == -1)) {
      costsUncapped.push({
        type: expense.categoryName,
        desciption: expense.description,
        amount: expense.amount,
        total: expense.amount,
      });
    }

    assess.uncapped_costs_total = cleanDollars(
      costsUncapped.reduce((a: number, i: any) => {
        return a + i.total;
      }, 0)
    );

    assess.csl_assessed_need =
      assess.tuition_estimate +
      assess.books_supplies_cost +
      assess.shelter_month * assess.study_months +
      assess.p_trans_month +
      assess.study_months +
      assess.x_trans_total +
      returnTransTot +
      relocation +
      dayCareTot +
      depFood * assess.study_months +
      depPTrans * assess.study_months +
      Math.min(discretionaryActual, this.cslLookup.discretionary_costs_max_amount) +
      assess.uncapped_costs_total;

    return assess;
  }

  async calculateContribution(assess: CSLFTAssessmentBase): Promise<CSLFTAssessmentBase> {
    let aboriginalStatus = await this.db("sfa.aboriginal_status")
      .where({ is_active: true, id: this.application.aboriginal_status_id })
      .where("nars_status_id", ">", 0);

    if (
      aboriginalStatus.length > 0 ||
      this.student.is_crown_ward ||
      this.application.is_disabled ||
      this.application.is_perm_disabled ||
      assess.dependent_count > 0
    ) {
      assess.student_contrib_exempt = "YES";
    } else assess.student_contrib_exempt = "NO";

    assess.student_ln150_income = this.application.student_ln150_income;

    let family_income = 0;

    if (this.application.csl_classification == 1) {
      family_income = cleanDollars((this.application.parent1_income ?? 0) + (this.application.parent2_income ?? 0));
    }
    // single parent is 1 + eligible dependent count
    else if (this.application.csl_classification == 4) {
      family_income = cleanDollars(this.application.student_ln150_income ?? 0);
    }
    // married is 2 + eligible dependent count
    else if (this.application.csl_classification == 3) {
      family_income = cleanDollars(
        (this.application.student_ln150_income ?? 0) + (this.application.spouse_ln150_income ?? 0)
      );
    }
    // single independent is always 1
    else {
      family_income = cleanDollars(this.application.student_ln150_income ?? 0);
    }

    const e_month = (8 / 12) * 52;
    const max_weeks = (8 / 12) * 52;
    const income_threshold = this.csgThreshold.find(
      (t) => t.family_size == Math.min(assess.family_size, 7)
    ).income_threshold;

    if (family_income <= income_threshold) {
      assess.student_expected_contribution = this.cslLookup.low_income_student_contrib_amount;

      /*  Math.min(
        this.cslLookup.low_income_student_contrib_amount ?? 0,
        ((this.cslLookup.low_income_student_contrib_amount ?? 0) / e_month) * (assess.study_weeks ?? 0) 
      );*/
    } else {
      const weekly_student_contrib =
        (this.cslLookup.low_income_student_contrib_amount ?? 0) / e_month +
        ((family_income - income_threshold) / e_month) * ((this.cslLookup.student_contrib_percent ?? 0) / 100);

      const weekly_calc = weekly_student_contrib * Math.min(assess.study_weeks ?? 0, max_weeks) ?? 0;
      assess.student_expected_contribution = Math.min(weekly_calc, this.cslLookup.student_contrib_max_amount ?? 0);
    }

    let previousContributions = await this.db
      .raw(`SELECT d.assessment_id, SUM(d.disbursed_amount) disbursed, SUM(a.student_contribution) student_contribution, 
      SUM(a.spouse_contribution) spouse_contribution FROM sfa.disbursement d INNER JOIN sfa.assessment a ON d.assessment_id = a.id INNER JOIN sfa.funding_request 
      fr ON fr.id = d.funding_request_id INNER JOIN sfa.application ap on ap.id = fr.application_id WHERE ap.academic_year_id = ${this.application.academic_year_id} 
      AND fr.request_type_id IN (3,4) AND ap.id = ${this.application.id} AND a.id < ${assess.id} GROUP BY d.assessment_id HAVING SUM(d.disbursed_amount) > 0`);

    if (previousContributions && previousContributions.length > 0) {
      assess.student_previous_contribution = previousContributions.reduce((a: number, i: any) => {
        return a + i.student_contribution;
      }, 0);
      assess.spouse_previous_contribution = previousContributions.reduce((a: number, i: any) => {
        return a + i.spouse_contribution;
      }, 0);
    }

    let meritBased = this.incomes.filter((i) => i.income_type_id == 16);
    let meritBasedAmount = sumBy(meritBased, "amount");
    let meritExemption = this.cslLookup.merit_exempt_amount;
    let meritNet = Math.max(meritBasedAmount - meritExemption, 0);
    let otherIncomes = this.incomes.filter((i) => i.assess_as_asset && i.income_type_id != 16);
    let otherSum = sumBy(otherIncomes, "amount");

    let student_other_resources = otherSum + meritNet;

    //input.csl_assessed_need = input.total_costs - input.total_resources;

    assess.student_contribution =
      assess.student_contrib_exempt === "YES"
        ? 0
        : (assess.student_expected_contribution ?? 0) /* - assess.student_previous_contribution */ +
          student_other_resources;

    // if spouse is not employed or full time student
    if (this.application.spouse_study_emp_status_id != 4 || this.spouseIsFullTimeStudent())
      assess.spouse_contrib_exempt = "YES";
    else assess.spouse_contrib_exempt = "NO";

    assess.spouse_ln150_income = this.application.spouse_ln150_income;

    if (assess.csl_classification == 3 && family_income > income_threshold) {
      const weekly_spouse_contrib =
        (this.cslLookup.spouse_contrib_percent / 100) * ((family_income - income_threshold) / e_month);

      assess.spouse_expected_contribution = Math.round(
        weekly_spouse_contrib * Math.min(assess.study_weeks ?? 0, max_weeks)
      );

      assess.spouse_contribution =
        assess.spouse_contrib_exempt === "YES"
          ? 0
          : Math.round(assess.spouse_expected_contribution ?? 0 /* - assess.spouse_previous_contribution */);
    } else {
      assess.spouse_contrib_exempt = "YES";
      assess.spouse_expected_contribution = 0;
      assess.spouse_previous_contribution = 0;
      assess.spouse_contribution = 0;
    }

    return assess;
  }

  async calculateParental(assess: CSLFTAssessmentBase): Promise<CSLFTAssessmentBase> {
    assess.parent1_income = this.application.parent1_income ?? 0;
    assess.parent2_income = this.application.parent2_income ?? 0;
    assess.parent1_tax_paid = this.application.parent1_tax_paid ?? 0;
    assess.parent2_tax_paid = this.application.parent2_tax_paid ?? 0;
    assess.parent_province_id = 0; // look for an address with address_type = 4
    assess.parent_contribution_override = 0;

    return assess;
  }

  async calculateAward(assess: CSLFTAssessmentBase): Promise<CSLFTAssessmentBase> {
    let ftGrant = this.otherFunds.find((f) => f.request_type_id == 35);
    let ftDepGrant = this.otherFunds.find((f) => f.request_type_id == 32);
    let disGrant = this.otherFunds.find((f) => f.request_type_id == 29);
    let disSEGrant = this.otherFunds.find((f) => f.request_type_id == 30);
    let topup = this.otherFunds.find((f) => f.request_type_id == 28);

    let totalGrants =
      (ftGrant?.disbursed_amount ?? 0) +
      (ftDepGrant?.disbursed_amount ?? 0) +
      (disGrant?.disbursed_amount ?? 0) +
      (disSEGrant?.disbursed_amount ?? 0) +
      (topup?.disbursed_amount ?? 0);

    assess.total_grant_awarded = totalGrants;

    let sixty = assess.csl_assessed_need * 0.6;

    let max_allowable = (this.cslLookup.allowable_weekly_amount ?? 0) * assess.study_weeks;

    const calculated_award_min = Math.min(sixty - (assess.total_grant_awarded ?? 0), max_allowable ?? 0);
    const calculated_award: number = Math.max(0, Math.round(calculated_award_min));

    assess.over_award = this.student.pre_over_award_amount ?? 0;

    // Calculate the totaln_disbursments_required
    if (assess.csl_full_amt_flag == 0) {
      assess.assessed_amount = Math.max(
        Math.min(calculated_award, assess.csl_request_amount ?? 0) -
          (assess.over_award ?? 0) -
          (assess.return_uncashable_cert ?? 0),
        0
      );
    } else {
      assess.assessed_amount =
        Math.max((calculated_award ?? 0) - (assess.over_award ?? 0), 0) - (assess.return_uncashable_cert ?? 0);
    }

    return assess;
  }

  determineCategoryId(cslClassification: number, accomodationCode: number): number {
    if (cslClassification == 1 && accomodationCode == 1) {
      return this.studentCategories.find((c: any) => c.code == "SDH")?.id || -1;
    } else if (cslClassification == 1 && accomodationCode == 2) {
      return this.studentCategories.find((c: any) => c.code == "SDA")?.id || -1;
    } else if ([2, 5].includes(cslClassification) && accomodationCode == 1) {
      return this.studentCategories.find((c: any) => c.code == "SIH")?.id || -1;
    } else if ([2, 5].includes(cslClassification ?? 0) && accomodationCode == 2) {
      return this.studentCategories.find((c: any) => c.code == "SIA")?.id || -1;
    } else if (cslClassification == 3) {
      return this.studentCategories.find((c: any) => c.code == "M")?.id || -1;
    } else if (cslClassification == 4) {
      return this.studentCategories.find((c: any) => c.code == "SP")?.id || -1;
    } else {
      return -1;
    }
  }

  spouseIsFullTimeStudent(): boolean {
    let result: boolean = false;

    const spouseStudyFrom = this.application.spouse_study_school_from
      ? moment(this.application.spouse_study_school_from)
      : undefined;
    const spouseStudyTo = this.application.spouse_study_school_to
      ? moment(this.application.spouse_study_school_to)
      : undefined;

    result = moment().isBetween(spouseStudyFrom, spouseStudyTo);

    return result;
  }
}

function cleanDollars(input: number | undefined) {
  if (!input) return 0;

  let value = Math.round(input * 100) / 100;
  return value;
}

async function calculateFamilySize(
  db: Knex,
  classification: number,
  applicationId: number
): Promise<{
  family_size: number;
  total_dependants: number;
  csl_dependants: number;
  csg_dependants: number;
  sta_dependants: number;
  post_secondary: number;
  narsCatCode: string;
  under12_or_disabled: number;
  over11: number;
}> {
  let family = {
    family_size: 0,
    total_dependants: 0,
    csl_dependants: 0,
    csg_dependants: 0,
    sta_dependants: 0,
    post_secondary: 1,
    narsCatCode: "1",
    under12_or_disabled: 0,
    over11: 0,
  };

  // Single Dependent
  if (classification == 1) {
    family.narsCatCode = "4";
  }
  // Single Independent - 2 year workforce
  else if (classification == 2) {
    family.narsCatCode = "3";
  }
  // Married / Common Law
  else if (classification == 3) {
    family.narsCatCode = "1";
  } // Single Parent
  else if (classification == 4) {
    family.narsCatCode = "2";
  }
  // Single Independent - 4 year high school
  else if (classification == 5) {
    family.narsCatCode = "3";
  }

  // Married / Common Law or Single Parent
  if ([3, 4].includes(classification)) {
    let deps = await db("sfa.dependent")
      .innerJoin("sfa.dependent_eligibility", "dependent.id", "dependent_eligibility.dependent_id")
      .innerJoin("sfa.application", "application.id", "dependent_eligibility.application_id")
      .select("dependent.*", "dependent_eligibility.*")
      .select(
        db.raw(
          "(0 + FORMAT(COALESCE(application.classes_start_date, GETDATE()),'yyyyMMdd') - FORMAT(birth_date,'yyyyMMdd') ) / 10000 age"
        )
      )
      .where({ "dependent_eligibility.application_id": applicationId });

    family.total_dependants = deps.length;
    family.csl_dependants = deps.filter((f: any) => f.is_csl_eligible).length;
    family.csg_dependants = deps.filter((f: any) => f.is_csg_eligible).length;
    family.sta_dependants = deps.filter((f: any) => f.is_sta_eligible).length;

    family.under12_or_disabled = deps.filter((f: any) => f.is_csl_eligible && (f.age < 11 || f.is_disability)).length;
    family.over11 = deps.filter((f: any) => f.is_csl_eligible && f.age >= 12).length;
    family.post_secondary = deps.filter((f: any) => f.is_post_secondary).length;
    family.family_size = classification == 3 ? 2 + family.csl_dependants : 1 + family.csl_dependants;
  }
  // Single Dependent
  else if (classification == 1) {
    let parentDeps = await db("sfa.parent_dependent")
      .innerJoin("sfa.application", "application.id", "parent_dependent.application_id")
      .select("parent_dependent.*")
      .select(
        db.raw(
          "(0 + FORMAT(COALESCE(application.classes_start_date, GETDATE()),'yyyyMMdd') - FORMAT(birth_date,'yyyyMMdd') ) / 10000 age"
        )
      )
      .where({ application_id: applicationId, is_eligible: true });

    let parentInfo = await db("sfa.application")
      .leftJoin("sfa.person as p1", "application.parent1_id", "p1.id")
      .leftJoin("sfa.person as p2", "application.parent2_id", "p2.id")
      .where("application.id", applicationId)
      .select(
        "application.id",
        "p1.first_name as p1f",
        "p1.last_name as p1l",
        "p2.first_name as p2f",
        "p2.last_name as p2l"
      )
      .first();

    let hasParent1 = false;
    let hasParent2 = false;

    if (parentInfo.p1f && parentInfo.p1l) {
      hasParent1 = true;
    }
    if (parentInfo.p2f && parentInfo.p2l) {
      hasParent2 = true;
    }

    logger.info(`PARENT INFO: ${hasParent1}, ${hasParent2}`);

    family.total_dependants = 1 + parentDeps.length;

    // this is different from NARS - it shouldn't include the student as a dependent because it increases the costs
    family.csl_dependants = 0;
    family.post_secondary = parentDeps.filter((f: any) => f.is_attend_post_secondary).length + 1;
    family.family_size = 1 + parentDeps.length + (hasParent1 ? 1 : 0) + (hasParent2 ? 1 : 0);

    family.under12_or_disabled = parentDeps.filter(
      (f: any) => f.is_csl_eligible && (f.age < 11 || f.is_disabled)
    ).length;
    family.over11 = parentDeps.filter((f: any) => f.is_csl_eligible && f.age >= 12).length;
  } else {
    family.family_size = 1;
  }

  logger.info(`FAMILY SIZE - ${family.family_size}`);

  return family;
}

const DEFAULT_BASE: CSLFTAssessmentBase = {
  id: 9999999,
  funding_request_id: 0,
  assessed_date: new Date(),
  classes_start_date: new Date(),
  classes_end_date: new Date(),
  pstudy_start_date: new Date(),
  pstudy_end_date: new Date(),
  assessment_type_id: 0,
  dependent_count: 0,
  study_weeks: 0,
  study_months: 0,
  study_province_id: 0,
  study_area_id: 0,
  program_id: 0,
  period: "",
  study_accom_code: 0,
  prestudy_csl_classification: 0,
  csl_classification: 0,
  family_size: 0,
  student_family_size: 0,
  prestudy_accom_code: 0,
  prestudy_province_id: 0,
  shelter_month: 0,
  p_trans_month: 0,
  r_trans_16wk: 0,
  day_care_allowable: 0,
  depend_food_allowable: 0,
  study_bus_flag: 0,
  prestudy_bus_flag: 0,
  depend_tran_allowable: 0,
  books_supplies_cost: 0,
  tuition_estimate: 0,
  uncapped_costs_total: 0,
  uncapped_pstudy_total: 0,
  day_care_actual: 0,
  discretionary_cost: 0,
  discretionary_cost_actual: 0,
  study_distance: 0,
  x_trans_total: 0,
  relocation_total: 0,
  pstudy_x_trans_total: 0,
  csl_assessed_need: 0,
  csl_full_amt_flag: 0,
  assessed_amount: 0,
  total_grant_awarded: 0,
  student_ln150_income: 0,
  student_contribution: 0,
  student_contrib_exempt: "NO",
  student_contribution_review: "NO",
  student_expected_contribution: 0,
  student_previous_contribution: 0,
  marital_status_id: 0,
  study_living_w_spouse_flag: 0,
  spouse_contrib_exempt: "NO",
  spouse_contribution_review: "NO",
  spouse_contribution: 0,
  spouse_ln150_income: 0,
  spouse_expected_contribution: 0,
  spouse_previous_contribution: 0,
  student_contribution_override: 0,
  spouse_contribution_override: 0,
  parent1_income: 0,
  parent2_income: 0,
  parent1_tax_paid: 0,
  parent2_tax_paid: 0,
  parent_contribution_review: "NO",
  parent_contribution_override: 0,
  parent_province_id: 0,
  parent_ps_depend_count: 0,
};

interface CSLFTAssessmentBase {
  id: number;
  funding_request_id: number;
  assessed_date: Date;
  classes_start_date: Date;
  classes_end_date: Date;
  pstudy_start_date: Date;
  pstudy_end_date: Date;
  assessment_type_id: number;

  dependent_count: number;

  study_weeks: number;
  study_months: number;

  study_province_id: number;
  study_area_id: number;
  program_id: number;
  period: string;

  study_accom_code: number;
  prestudy_csl_classification: number;
  csl_classification: number;
  family_size: number;
  student_family_size: number;
  prestudy_accom_code: number;
  prestudy_province_id: number;

  shelter_month: number;
  p_trans_month: number;
  r_trans_16wk: number;
  day_care_allowable: number;
  depend_food_allowable: number;
  study_bus_flag: number;
  depend_tran_allowable: number;
  books_supplies_cost: number;
  tuition_estimate: number;
  uncapped_costs_total: number;
  uncapped_pstudy_total: number;
  day_care_actual: number;
  discretionary_cost: number;
  discretionary_cost_actual: number;
  study_distance: number;
  x_trans_total: number;
  relocation_total: number;
  pstudy_x_trans_total: number;

  csl_assessed_need: number;
  csl_over_reason_id?: number;
  csl_non_reason_id?: number;
  csl_full_amt_flag?: number;
  assessed_amount: number;
  csl_request_amount?: number;
  return_uncashable_cert?: number;
  total_grant_awarded: number;
  over_award?: number;
  over_award_applied_flg?: number;

  student_ln150_income: number;
  student_contribution: number;
  student_contrib_exempt: string;
  student_contribution_review: string;
  student_expected_contribution: number;
  student_previous_contribution: number;

  marital_status_id: number;

  study_living_w_spouse_flag: number;
  spouse_province_id?: number;
  spouse_contrib_exempt: string;
  spouse_contribution_review: string;
  spouse_contribution: number;
  spouse_ln150_income: number;
  spouse_expected_contribution: number;
  spouse_previous_contribution: number;
  student_contribution_override: number;
  spouse_contribution_override: number;

  parent1_income: number;
  parent2_income: number;
  parent1_tax_paid: number;
  parent2_tax_paid: number;
  parent_contribution_review: string;
  parent_contribution_override: number;
  parent_province_id: number;

  prestudy_bus_flag: number;
  parent_ps_depend_count: number;
  /* 
  pstudy_shelter_month: number;
  pstudy_p_trans_month: number;
  pstudy_day_care_allow: number;
  pstudy_depend_food_allow: number;
  pstudy_depend_tran_allow: number;
  student_tax_rate: number;
  spouse_tax_rate: number;
  spouse_pstudy_tax_rate: number;
  stud_pstudy_tax_rate: number;
  stud_pstudy_gross: number;
  pstudy_day_care_actual: number;
  student_gross_income: number;
  prestudy_distance: number;
  study_bus_flag: number;
  pstudy_expected_contrib: number;
  spouse_expected_income: number;
  asset_tax_rate: number;
  married_assets: number;
  student_family_size: number;
   */
}

interface CSLFTAssessmentFull extends CSLFTAssessmentBase {
  family_income: number;
  pstudy_weeks: number;
  pstudy_months: number;
  cslft_scholastic_total: number;
  shelter_total: number;
  p_trans_total: number;
  r_trans_total: number;
  day_care_total: number;
  depend_food_total: number;
  depend_tran_total: number;
  discretionary_cost_total: number;
  uncapped_expenses: number;
  total_costs: number;
  parent_msol: number;
  parent_discretionary_income: number;
  parent_contribution: number;
  parent_weekly_contrib: number;
  parent_income_total: number;
  parent_tax_total: number;
  parent_net_income_total: number;
  csl_assessed_need_pct: number;
  max_allowable: number;
  calculated_award: number;
  previous_cert: number;
  total_contribution: number;
  total_resources: number;
  net_amount: number;
  previous_disbursement: number;
  student_other_resources: number;
  student_contrib_exempt_reason?: string;
  spouse_contrib_exempt_reason?: string;
}
