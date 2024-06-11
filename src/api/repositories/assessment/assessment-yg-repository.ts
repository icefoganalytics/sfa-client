import { Knex } from "knex";
import moment from "moment";
import { AssessmentDTO, ApplicationDTO, DisbursementDTO } from "models";
import { AssessmentBaseRepository } from "./assessment-base-repository";
import { ApplicationRepository } from "../application";
import { monthsBetween, weeksBetween } from "@/utils/date-utils";

export class AssessmentYukonGrant extends AssessmentBaseRepository {
  private applicationRepo: ApplicationRepository;
  private application: Partial<ApplicationDTO> = {};

  constructor(maindb: Knex<any, unknown>) {
    super(maindb);
    this.applicationRepo = new ApplicationRepository(maindb);
  }
  async getNewInfo(
    application_id: number,
    assessment_id: number,
    disbursementList: DisbursementDTO[]
  ): Promise<AssessmentDTO> {
    let assess: AssessmentDTO = {};

    this.application = await this.applicationRepo.getApplicationById(application_id);

    assess.assessed_date = moment().format("YYYY-MM-DD");
    assess.effective_rate_date = this.application.classes_start_date?.toISOString().slice(0, 10);
    assess.classes_end_date = this.application.classes_end_date?.toISOString().slice(0, 10);
    assess.classes_start_date = this.application.classes_start_date?.toISOString().slice(0, 10);
    assess.allowed_months = monthsBetween(assess.classes_start_date, assess.classes_end_date);
    assess.assessed_weeks = weeksBetween(assess.classes_start_date, assess.classes_end_date);

    assess.previous_weeks =
      (await this.getScalarValue<number>("fn_get_previous_weeks_yg", [
        this.application.student_id || 0,
        application_id,
      ])) ?? 0;

    if (assess.previous_weeks + assess.assessed_weeks > 170) {
      assess.weeks_allowed = 170 - assess.previous_weeks;
    } else {
      assess.weeks_allowed = assess.assessed_weeks;
    }

    assess.home_city_id = await this.getScalarValue<number>("fn_get_home_city", [this.application.student_id || 0]);

    assess.destination_city_id = await this.getScalarValue<number>("fn_get_institution_city", [application_id]);

    assess.travel_allowance =
      (await this.getScalarValue<number>("fn_get_travel_allowance", [
        assess.home_city_id || 0,
        assess.destination_city_id || 0,
      ])) || 0;

    assess.airfare_amount =
      (await this.getScalarValue<number>("fn_get_airfare_amount", [
        assess.home_city_id || 0,
        assess.destination_city_id || 0,
      ])) || 0;

    if (this.application.is_correspondence) {
      assess.travel_allowance = 0;
      assess.airfare_amount = 0;
    }

    const yg_cost_sel = this.mainDb("sfa.yg_cost").where({
      academic_year_id: this.application.academic_year_id,
      allowed_percent: 100,
    });

    if (this.application.program_division == 1) {
      yg_cost_sel.select(
        "weekly_amount",
        "quarter_tuition_amount as tuition",
        "quarter_living_amount as living",
        "quarter_book_amount as book"
      );
    } else {
      yg_cost_sel.select(
        "weekly_amount",
        "semester_tuition_amount as tuition",
        "semester_living_amount as living",
        "semester_book_amount as book"
      );
    }

    let yg_cost = await yg_cost_sel.first();

    assess.living_costs = 0;
    assess.allowed_tuition = 0;
    assess.allowed_books = 0;

    if (yg_cost) {
      assess.living_costs = yg_cost.living || 0;
      assess.allowed_tuition = yg_cost.tuition || 0;
      assess.allowed_books = yg_cost.book || 0;
      assess.weekly_amount = yg_cost.weekly_amount || 0;
    }

    /*  const disburse_required = await this.getScalarValue<number>("fn_disbursments_required", [
      application_id,
      assessment_id || 0,
      "NULL",
    ]); */

    let disbursed_amt = null;

    if (disbursementList?.length) {
      let disbursedAmounts = disbursementList.map((d) => {
        return Number(d.disbursed_amount) ?? 0;
      });

      disbursed_amt = disbursedAmounts.reduce((a, b) => a + b, 0);
    }

    if (disbursed_amt) {
      assess.previous_disbursement = disbursed_amt;

      /*    if (disburse_required > 0 && disburse_required < 1) {
        assess.disbursements_required = 1;
      } else {
        assess.disbursements_required = Math.floor(disburse_required);
      } */
    } else {
      assess.previous_disbursement = 0;
      //assess.disbursements_required = Math.floor(disburse_required);
    }

    assess.over_award = 0;
    assess.assessment_adj_amount = 0;
    assess.over_award_disbursement_period = 0;
    assess.years_funded_equivalent = undefined;
    assess.over_award_applied_flg = "No";
    assess.air_travel_disbursement_period = undefined;

    assess.assessed_amount = await this.getScalarValue<number>("fn_get_total", [
      "1", //String(assess.disbursements_required),
      this.application.academic_year_id || 0,
      String(assess.living_costs),
      String(assess.allowed_tuition),
      String(assess.allowed_books),
      String(assess.travel_allowance),
      String(assess.airfare_amount),
      String(assess.weekly_amount),
      String(assess.weeks_allowed),
      String(assess.assessment_adj_amount || 0),
    ]);

    assess.pre_leg_amount = await this.getScalarValue<number>("fn_get_old_total", [
      "1", //String(assess.disbursements_required),
      String(this.application.academic_year_id),
      String(assess.living_costs),
      String(assess.allowed_tuition),
      String(assess.allowed_books),
      String(assess.travel_allowance),
      String(assess.airfare_amount),
    ]);

    assess.net_amount = (assess.assessed_amount || 0) - (assess.previous_disbursement || 0) - (assess.over_award || 0);

    assess.years_funded = await this.getScalarValue<number>("fn_get_total_funded_years", [
      this.application.student_id || 0,
      application_id,
    ]);

    return assess;
  }

  async getRefreshAssessmentData(
    assessment: AssessmentDTO,
    disburseAmountList: number[],
    student_id: number,
    application_id: number,
    program_division: number
  ): Promise<AssessmentDTO | undefined> {
    let assess: AssessmentDTO = { ...assessment };

    this.application = await this.applicationRepo.getApplicationById(application_id);

    assess.classes_end_date = assessment.classes_end_date?.toString().slice(0, 10);
    assess.classes_start_date = assessment.classes_start_date?.toString().slice(0, 10);
    assess.allowed_months = monthsBetween(assess.classes_start_date, assess.classes_end_date);
    assess.assessed_weeks = weeksBetween(assess.classes_start_date, assess.classes_end_date);

    if ((assess.previous_weeks || 0) + assess.assessed_weeks > 170) {
      assess.weeks_allowed = 170 - (assess.previous_weeks || 0);
    } else {
      assess.weeks_allowed = assess.assessed_weeks;
    }

    assess.travel_allowance = await this.getScalarValue<number>("fn_get_travel_allowance", [
      assessment.home_city_id || 0,
      assessment.destination_city_id || 0,
    ]);

    assess.airfare_amount = await this.getScalarValue<number>("fn_get_airfare_amount", [
      assessment.home_city_id || 0,
      assessment.destination_city_id || 0,
    ]);

    if (this.application.is_correspondence) {
      assess.travel_allowance = 0;
      assess.airfare_amount = 0;
    }

    /* const disburse_required = await this.getScalarValue<number>("fn_disbursments_required", [
      application_id,
      assessment?.id || 0,
      program_division || 0,
    ]); */

    let disbursed_amt = null;

    if (disburseAmountList.length) {
      disbursed_amt = disburseAmountList.reduce((partialSum, a) => partialSum + a, 0);
    }

    if (disbursed_amt) {
      assess.previous_disbursement = disbursed_amt;

      /* if (disburse_required > 0 && disburse_required < 1) {
        assess.disbursements_required = 1;
      } else {
        assess.disbursements_required = Math.floor(disburse_required);
      } */
    } else {
      assess.previous_disbursement = 0;
      //assess.disbursements_required = Math.floor(disburse_required);
    }

    assess.assessed_amount = await this.getScalarValue<number>("fn_get_total", [
      "1", //assess.disbursements_required || 0,
      this.application.academic_year_id || 0,
      String(assess.living_costs),
      String(assess.allowed_tuition),
      String(assess.allowed_books),
      String(assess.travel_allowance),
      String(assess.airfare_amount),
      String(assess.weekly_amount),
      String(assess.weeks_allowed),
      String(assess.assessment_adj_amount || 0),
    ]);

    assess.pre_leg_amount = await this.getScalarValue<number>("fn_get_old_total", [
      "1", //assess.disbursements_required || 0,
      String(this.application.academic_year_id),
      String(assessment.living_costs),
      String(assessment.allowed_tuition),
      String(assessment.allowed_books),
      String(assessment.travel_allowance),
      String(assessment.airfare_amount),
    ]);

    assess.net_amount = (assess.assessed_amount || 0) - (assess.previous_disbursement || 0) - (assess.over_award || 0);

    assess.years_funded = await this.getScalarValue<number>("fn_get_total_funded_years", [student_id, application_id]);

    return assess;
  }
  /* If an assessment does not exists, save the assessment and then save the disburse list */
  async saveAssessmentYG(dataAssessment: any, disbursementList: DisbursementDTO[]): Promise<any> {
    const assessmentToInsert: any = { ...dataAssessment };

    //removing fields that are not in sfa.assessment
    delete assessmentToInsert.read_only_data;
    delete assessmentToInsert.id;
    delete assessmentToInsert.assessment_id;
    delete assessmentToInsert.program_division;

    const insertedAssessment: any = await this.mainDb("sfa.assessment")
      .insert({ ...assessmentToInsert })
      .returning("*");

    if (insertedAssessment?.id && disbursementList.length) {
      // Insert the disbursement list
      for (const item of disbursementList) {
        const resInsert = await this.mainDb("sfa.disbursement")
          .insert({
            assessment_id: insertedAssessment.id,
            funding_request_id: insertedAssessment.funding_request_id,
            disbursement_type_id: item.disbursement_type_id,
            disbursed_amount: item.disbursed_amount,
            due_date: item.due_date,
            tax_year: item.tax_year,
            issue_date: item.issue_date,
            transaction_number: item.transaction_number,
            change_reason_id: item.change_reason_id,
            financial_batch_id: item.financial_batch_id,
          })
          .returning("*");
      }
    }

    return insertedAssessment || null;
  }

  async updateAssessmentYG(
    dataAssessment: any,
    disbursementList: DisbursementDTO[],
    assessment_id: number,
    funding_request_id: number
  ): Promise<any> {
    const assessmentToUpdate: any = { ...dataAssessment };

    //removing fields that are not in sfa.assessment
    delete assessmentToUpdate.read_only_data;
    delete assessmentToUpdate.assessment_id;
    delete assessmentToUpdate.id;
    delete assessmentToUpdate.funding_request_id;
    delete assessmentToUpdate.program_division;
    delete assessmentToUpdate.yea_used;
    delete assessmentToUpdate.yea_earned;
    delete assessmentToUpdate.yea_balance;
    delete assessmentToUpdate.yea_net_amount;
    delete assessmentToUpdate.unused_receipts;

    const updatedAssessment: any = await this.mainDb("sfa.assessment")
      .where({ id: assessment_id })
      .update({ ...assessmentToUpdate });

    if (disbursementList.length) {
      const student = await this.mainDb("sfa.assessment AS a")
        .select("s.vendor_id AS vendor_id")
        .innerJoin("sfa.funding_request AS fr", "fr.id", "a.funding_request_id")
        .innerJoin("sfa.application AS app", "app.id", "fr.application_id")
        .innerJoin("sfa.student AS s", "s.id", "app.student_id")
        .where("a.id", assessment_id)
        .first();

      if (student.vendor_id) {
        // Insert the disbursement list
        for (const item of disbursementList) {
          if (item?.id && item?.assessment_id === assessment_id && item?.funding_request_id === funding_request_id) {
            const resUpdate = await this.mainDb("sfa.disbursement")
              .update({
                disbursement_type_id: item.disbursement_type_id,
                disbursed_amount: item.disbursed_amount,
                due_date: item.due_date,
                tax_year: item.tax_year,
                issue_date: item.issue_date,
                transaction_number: item.transaction_number,
                change_reason_id: item.change_reason_id,
                financial_batch_id: item.financial_batch_id,
              })
              .where({ id: item.id });
          } else {
            const resInsert: any = await this.mainDb("sfa.disbursement")
              .insert({
                assessment_id: assessment_id,
                funding_request_id: funding_request_id,
                disbursement_type_id: item.disbursement_type_id,
                disbursed_amount: item.disbursed_amount,
                due_date: item.due_date,
                tax_year: item.tax_year,
                issue_date: item.issue_date,
                transaction_number: item.transaction_number,
                change_reason_id: item.change_reason_id,
                financial_batch_id: item.financial_batch_id,
              })
              .returning("*");
          }
        }

        const updateStatusFundingRequest = await this.mainDb("sfa.funding_request")
          .where({ id: funding_request_id })
          .update({ status_id: 7 });

        return { text: "Assessment created", variant: "success" };
      } else {
        return { text: "Saved, but student must have a Vendor ID to create disbursements", variant: "success" };
      }
    }

    return { text: "Assessment created", variant: "success" };
  }
}
