import { Knex } from "knex";
import { AssessmentBaseRepository } from "./assessment-base-repository";
import { ApplicationDTO, AssessmentDTO, CsgLookupDTO, CsgftGlobalDTO, CsgftResultDTO, DisbursementDTO, FundingRequestDTO, PersonAddressDTO, StudentDTO } from "models";
import { NumbersHelper } from "../../utils/NumbersHelper";
import moment from "moment";
import { ApplicationRepository } from "../application";
import { StudentRepository } from "../student";
import { FundingRequestRepository } from "../funding_request";
import { DisbursementRepository } from "../disbursement";
import { DependentRepository } from "../dependent";
import { CslLookupRepository } from "../csl_lookup";
import { PersonRepository } from "../person";
import { StandardOfLivingRepository } from "../standard_of_living";
import { ParentRepository } from "../parent";
import { CsgLookupRepository } from "../csg_lookup";
import { CsgThresholdRepository } from "../csg_threshold";
import { weeksBetween } from "@/utils/date-utils";

export class AssessmentCsgftRepository extends AssessmentBaseRepository {

    // Repos
    private applicationRepo: ApplicationRepository;
    private studentRepo: StudentRepository;
    private fundingRequestRepo: FundingRequestRepository;
    private disbursementRepo: DisbursementRepository;
    private dependentRepo: DependentRepository;
    private clsLookupRepo: CslLookupRepository;
    private personRepo: PersonRepository;
    private standardLivingRepo: StandardOfLivingRepository;
    private parentRepo: ParentRepository;
    private csgLookupRepo: CsgLookupRepository;
    private csgThresholdRepo: CsgThresholdRepository;

    private numHelper: NumbersHelper;
    private assessment: Partial<AssessmentDTO> = {};
    private application: Partial<ApplicationDTO> = {};
    private student: Partial<StudentDTO> = {};
    private funding_request: Partial<FundingRequestDTO> = {};
    private disbursement: Partial<DisbursementDTO> = {};
    private disbursements: Array<Partial<DisbursementDTO>> = [];
    private resultDto: Partial<CsgftResultDTO> = {};
    
    // Globals
    private global: Partial<CsgftGlobalDTO> = {};

    constructor(maindb: Knex<any, unknown>) {
        super(maindb);
        this.numHelper = new NumbersHelper();
        this.applicationRepo = new ApplicationRepository(maindb);
        this.studentRepo = new StudentRepository(maindb);
        this.fundingRequestRepo = new FundingRequestRepository(maindb);
        this.disbursementRepo = new DisbursementRepository(maindb);
        this.dependentRepo = new DependentRepository(maindb);
        this.clsLookupRepo = new CslLookupRepository(maindb);
        this.personRepo = new PersonRepository(maindb);
        this.standardLivingRepo = new StandardOfLivingRepository(maindb);
        this.parentRepo = new ParentRepository(maindb);
        this.csgLookupRepo = new CsgLookupRepository(maindb);
        this.csgThresholdRepo = new CsgThresholdRepository(maindb);
    }

    async getPreviousAssessment(assessment_id?: number): Promise<void> {
        let previous_assessment = undefined;

        if (assessment_id) {
            previous_assessment = await this.mainDb.raw(`EXEC sfa.sp_get_previous_assessment ${assessment_id};`) as AssessmentDTO;
            this.assessment = { ...this.assessment, ...previous_assessment };
        }
    }

    async getCslFundingRequestId(application_id?: number): Promise<number> {
        let result = 0;

        if (application_id) {
            const query = await this.mainDb("sfa.funding_request")
                                .where("application_id", "=", application_id)
                                .andWhere("request_type_id", "=", 4);
            
            if (query.length > 0) {
                result = query[0].id;
            }
        }

        return result;
    }

    async loadData(funding_request_id: number, loadAssessment: boolean = true): Promise<void> {
        if (funding_request_id) {
            this.funding_request = await this.fundingRequestRepo.getFundingRequestById(funding_request_id);
            this.application = await this.applicationRepo.getApplicationByFundingRequestId(funding_request_id);
            this.student = await this.studentRepo.getStudentById(this.application.student_id);
            if (loadAssessment) {
                this.assessment = await this.getAssessmentByFundingRequestId(funding_request_id);
                this.disbursements = await this.disbursementRepo.getByAssessmentId(this.assessment.id);                
                this.disbursement = this.disbursements[0] ?? {};
            }                        
        }
    }

    async getAssessedNeed(assessment: Partial<AssessmentDTO>, global: Partial<CsgftGlobalDTO>, application: Partial<ApplicationDTO>, student: Partial<StudentDTO>): Promise<number> {
        let result = 0;

        if ((assessment.id ?? 0) === 0) {
            assessment = await this.getMaxAssessmentByFundingRequestId(global.csl_funding_request_id);
        }

        if ((assessment.id ?? 0) > 0) {
            const assessedResources: number = await this.getAssessedResources(assessment, application, student);
            const assessedCost: number = this.getAssessedCost(assessment);
            result = assessedCost - assessedResources;
        }
        
        if (result < 0) {
            result = 0;
        }

        return result;
    }

    async newFormInstance(funding_request_id: number): Promise<Partial<CsgftResultDTO>> {
        await this.loadData(funding_request_id, true);

        this.assessment.funding_request_id = funding_request_id;

        await this.getInitValues();        

        if (this.global.new_calc) {
            this.global.new_calc = false;  
        }

        this.resultDto.data = this.assessment;
        this.resultDto.disbursements = this.disbursements;
        this.resultDto.globals = this.global;

        return this.resultDto;
    }

    async getInitValues(): Promise<void> {

        this.global.csl_funding_request_id = await this.getCslFundingRequestId(this.application.id);
        
        if ((this.assessment.id ?? 0) === 0) {
            await this.getAssessInfo();
        }
        else {
            await this.getScreenValues();
        }

        let disbursed_amt = 0;
        if (this.disbursements.length == 0) {
            disbursed_amt = await this.disbursementRepo.getDisbursedAmount(this.funding_request.id, this.assessment.id);
        }
        else {
            this.disbursements.forEach((x) => {
                disbursed_amt += parseInt((x.disbursed_amount?.toString() ?? '0'));
            });
        }
        
        this.assessment.previous_disbursement = disbursed_amt > 0 ? disbursed_amt : 0;
        this.assessment.net_amount = this.getNetAmount(this.assessment.assessed_amount, this.assessment.previous_disbursement);         

    }

    getNetAmount(assessed_amount: number | undefined, previous_disbursement: number | undefined): number | undefined {
        return this.numHelper.getNum(assessed_amount ?? 0) - this.numHelper.getNum(previous_disbursement ?? 0);
    }

    async getAssessInfo(): Promise<void> { 
        const assess_count = await this.getAssessmentCount(this.funding_request.id);

        if (assess_count > 0) {
            const assess_id = await this.getAssessmentInfoPrc(this.funding_request.id);

            this.assessment.assessment_type_id = 2;

            await this.getPreviousAssessment(assess_id);

            this.assessment.net_amount = this.getNetAmount(this.assessment.assessed_amount, this.assessment.previous_disbursement);

            await this.getScreenValues();
        }
        else {
            await this.getNewInfo();
        }
    }

    async getFamilySize(csl_classification?: number, application_id?: number): Promise<number> {

        let result = 1;

        if (csl_classification && application_id) {
            if (csl_classification === 1) {
                result = await this.getParentFamilySize(application_id);
                result += 1;
            }
            else if (csl_classification === 4) {
                result = await this.dependentRepo.getCslDependentCount(application_id);
                result += 1;
            }
            else if (csl_classification === 3) {
                result = await this.dependentRepo.getCslDependentCount(application_id);
                result += 2;
            }
            else {
                result = 1;
            }
        }

        return result;
    }

    async getScreenValues(): Promise<void> {

        // Calculate family income
        if (this.assessment.csl_classification === 1) {
            this.assessment.family_income = (this.assessment.parent1_income ?? 0) + (this.assessment.parent2_income ?? 0);
            this.assessment.student_ln150_income = 0;
            this.assessment.spouse_ln150_income = 0;
        }
        else if (this.assessment.csl_classification === 3) {
            this.assessment.family_income = (this.assessment.student_ln150_income ?? 0) + (this.assessment.spouse_ln150_income ?? 0);
            this.assessment.parent1_income = 0;
            this.assessment.parent2_income = 0;
        }
        else {
            this.assessment.family_income = (this.assessment.student_ln150_income ?? 0);
            this.assessment.parent1_income = 0;
            this.assessment.parent2_income = 0;
            this.assessment.spouse_ln150_income = 0;
        }

        this.assessment.csl_assessed_need = Math.ceil(await this.getAssessedNeed({}, this.global, this.application, this.student));

        // Calculate weekly rate
        const csgLookupRow: CsgLookupDTO = await this.csgLookupRepo.getCsgLookupByYear(this.application.academic_year_id);

        let max_weekly_rate = 0;
        if (csgLookupRow) {
            max_weekly_rate = ((csgLookupRow.csg_8_month_amount ?? 0)/8*12/52) ?? 0;
        }
        
        let family_lookup = this.assessment.family_size ?? 0;
        if (family_lookup > 7) {
            family_lookup = 7;
        }

        // For maximum
        let family_count = await this.csgThresholdRepo.getFamilySizeCount(this.assessment.family_income, family_lookup, this.application.academic_year_id);
        let income_threshold = 0;
        let calc_weekly_rate = 0;

        if (family_count === 1) {
            this.assessment.weekly_rate = max_weekly_rate;
            this.assessment.phase_out_rate = 0;
            this.assessment.weekly_phase_out_rate = 0;
        }
        else {
            family_count = await this.csgThresholdRepo.getFamilySizeCountCutOff(this.assessment.family_income, family_lookup, this.application.academic_year_id);

            if (family_count === 0) {
                this.assessment.weekly_rate = 0;
                this.assessment.phase_out_rate = 0;
                this.assessment.weekly_phase_out_rate = 0;
            }
            else {
                const csgThresholdRow = await this.csgThresholdRepo.getIncomeThresholdCutoff(this.assessment.family_income, family_lookup, this.application.academic_year_id);

                this.assessment.phase_out_rate = 0;
                if (csgThresholdRow) {
                    income_threshold = csgThresholdRow.income_threshold ?? 0;
                    this.assessment.phase_out_rate = csgThresholdRow.phase_out_rate ?? 0;
                }
                
                this.assessment.weekly_phase_out_rate = (this.assessment.phase_out_rate/8*12/52) ?? 0;

                // Divide phase out by 100 for percentage.
                calc_weekly_rate = max_weekly_rate - (this.assessment.weekly_phase_out_rate/100) * (this.assessment.family_income - income_threshold);                
                this.assessment.weekly_rate = calc_weekly_rate < 0 ? 0 : calc_weekly_rate;
            }
        }

        // Calculate assessed weeks (allowing for a max of 52 weeks)
        const assessed_weeks_diff = moment.utc(this.assessment.classes_end_date).diff(moment(this.assessment.effective_rate_date), "day");
        const assessed_weeks_calc = Math.trunc((assessed_weeks_diff + 1)/7 + .9999);
        this.assessment.assessed_weeks = Math.min(52, assessed_weeks_calc);

        const top_disbursements = await this.disbursementRepo.getTopDisbursements(this.application.id);

        if (top_disbursements.length > 0) {
            if (top_disbursements[0]) {
                this.assessment.last_issue_date = top_disbursements[0].issue_date as Date ?? undefined;
                this.assessment.last_due_date = top_disbursements[0].due_date as Date ?? undefined;
            }

            if (top_disbursements[1]) {
                this.assessment.second_last_issue_date = top_disbursements[1].issue_date as Date ?? undefined;
                this.assessment.second_last_due_date = top_disbursements[1].due_date as Date ?? undefined;
            }
        }

        let category_desc = "";
        switch(this.assessment.csl_classification) {
            case 1:
                category_desc = "Single Dependent"
                break;
            case 2:
                category_desc = "Single Independent-2yr WF";
                break;
            case 3:
                category_desc = "Married/Common Law";
                break;
            case 4:
                category_desc = "Single Parent";
                break;
            case 5:
                category_desc = "Single Independent-4yr HS";
                break;
            default:
                category_desc = "Unknown";
                break;
        }

        this.assessment.category_desc = category_desc;
        
    }

    async getNewInfo(): Promise<void> {

        if ((this.assessment.id ?? 0) === 0) {
            this.global.new_calc = true;
            this.assessment.assessment_type_id = 1;
            this.assessment.effective_rate_date = this.application.classes_start_date;
        }

        this.assessment.assessed_date = moment.utc().toDate();

        this.assessment.student_contrib_exempt = "NO";
        this.assessment.spouse_contrib_exempt = "NO";
    
        this.assessment.dependent_count = await this.getDependentCount(this.application.id);
        this.assessment.classes_start_date = this.application.classes_start_date;
        this.assessment.classes_end_date = this.application.classes_end_date;
        this.assessment.csl_classification = this.application.csl_classification;
        this.assessment.study_weeks = weeksBetween(this.assessment.classes_start_date, this.assessment.classes_end_date)

        this.assessment.parent1_income = this.application.parent1_income;
        this.assessment.parent2_income = this.application.parent2_income;
        this.assessment.student_ln150_income = this.application.student_ln150_income;
        this.assessment.spouse_ln150_income = this.application.spouse_ln150_income;

        this.assessment.family_size = await this.getFamilySize(this.assessment.csl_classification, this.application.id);

        await this.getScreenValues();

        if ((this.assessment.csl_assessed_need ?? 0) > 0) {
            const assess_amount = Math.ceil((this.assessment.weekly_rate ?? 0) * (this.assessment.assessed_weeks ?? 0));

            this.assessment.assessed_amount = assess_amount;
            if (assess_amount > 0 && assess_amount < 100) {
                this.assessment.assessed_amount = 100;
            }
        }
        else {
            this.assessment.assessed_amount = 0;
        }

        let disbursed_amt = 0;
        if (this.disbursements.length == 0) {
            disbursed_amt = await this.disbursementRepo.getDisbursedAmount(this.funding_request.id, this.assessment.id);
        }
        else {
            this.disbursements.forEach((x) => {
                disbursed_amt += parseInt((x.disbursed_amount?.toString() ?? '0'));
            });
        }
        
        this.assessment.previous_disbursement = disbursed_amt > 0 ? disbursed_amt : 0;
        this.assessment.net_amount = this.getNetAmount(this.assessment.assessed_amount, this.assessment.previous_disbursement);

        if (this.assessment.study_weeks > 17) {
            this.assessment.disbursements_required = 2;
        }
        else {
            this.assessment.disbursements_required = 1;
        }
            
        this.assessment.student_contribution_review = this.assessment.assessment_type_id === 2 ? "YES" : "NO";
        this.assessment.spouse_contribution_review = this.assessment.assessment_type_id === 2 ? "YES" : "NO";
        this.assessment.parent_contribution_review = this.assessment.assessment_type_id === 2 ? "YES" : "NO";
    }

    getAssessedCost(assessment: Partial<AssessmentDTO>): number {
        let result = 0;

        const multiplier = (weeks: number): number => {
            if (weeks >= 1 && weeks < 24) {
                return 1;
            }
            else if (weeks >= 24) {
                return 2;
            }
            else {
                return 0
            }
        };

        const tuition = (assessment.tuition_estimate ?? 0);
        const books = (assessment.books_supplies_cost ?? 0);
        const shelter = this.numHelper.round((assessment.shelter_month ?? 0) * (assessment.study_months ?? 0));
        const p_trans = this.numHelper.round((assessment.p_trans_month ?? 0) * (assessment.study_months ?? 0));
        const x_trans = assessment.x_trans_total ?? 0;
        const relocation = assessment.relocation_total ?? 0;
        const r_trans = this.numHelper.round((assessment.r_trans_16wk ?? 0) * multiplier(assessment.study_weeks ?? 0));
        const d_food = this.numHelper.round((assessment.depend_food_allowable ?? 0) * (assessment.study_months ?? 0));
        const d_trans = this.numHelper.round((assessment.depend_tran_allowable ?? 0) * (assessment.study_months ?? 0));
        const day_care = this.numHelper.round(Math.min((assessment.day_care_actual ?? 0), (assessment.day_care_allowable ?? 0)) * (assessment.study_months ?? 0));
        const discretionary = this.numHelper.round(Math.min((assessment.discretionary_cost_actual ?? 0), (assessment.discretionary_cost ?? 0)));
        const uncapped = (assessment.uncapped_costs_total ?? 0);

        result = tuition + books + shelter + p_trans + x_trans + relocation + r_trans + d_food + d_trans + day_care + discretionary + uncapped;

        return result;
    }

    async getAssessedResources(assessment: Partial<AssessmentDTO>, application: Partial<ApplicationDTO>, student: Partial<StudentDTO>): Promise<number> {
        let result = 0;
        let ps_combined_net = 0;
        const grossCalc = (gross: number, rate: number): number => {
            return this.numHelper.round(gross - this.numHelper.round(gross * (rate/100)));
        }

        if (application.academic_year_id && application.academic_year_id < 2017) {


            if ((assessment.stud_pstudy_gross ?? 0) > 0) {
                ps_combined_net = grossCalc((assessment.stud_pstudy_gross ?? 0), (assessment.stud_pstudy_tax_rate ?? 0));
            }

            if ((assessment.spouse_pstudy_gross ?? 0) > 0) {
                ps_combined_net += grossCalc((assessment.spouse_pstudy_gross ?? 0), (assessment.spouse_pstudy_tax_rate ?? 0));
            }

            // Calculate the total allowable costs for the prestudy period.
            const calcWithMonths = (value: number, months: number): number => {
                return this.numHelper.round(value * months);
            }
            let ps_allowable_total = 0;
            ps_allowable_total = calcWithMonths((assessment.pstudy_shelter_month ?? 0), (assessment.pstudy_months ?? 0));
            ps_allowable_total += calcWithMonths((assessment.pstudy_p_trans_month ?? 0), (assessment.pstudy_months ?? 0));
            ps_allowable_total += this.numHelper.round((assessment.pstudy_x_trans_total ?? 0));
            ps_allowable_total += calcWithMonths((Math.min((assessment.pstudy_day_care_actual ?? 0), (assessment.day_care_allowable ?? 0))), (assessment.pstudy_months ?? 0));
            ps_allowable_total += calcWithMonths((assessment.pstudy_depend_food_allow ?? 0), (assessment.pstudy_months ?? 0));
            ps_allowable_total += calcWithMonths((assessment.pstudy_depend_tran_allow ?? 0), (assessment.pstudy_months ?? 0));

            const disc_cost = this.numHelper.round(ps_combined_net - (assessment.uncapped_pstudy_total ?? 0) - ps_allowable_total);
            const disc_80 = this.numHelper.round(Math.max(disc_cost, 0) * 0.8);

            const ps_contrib = (assessment.married_pstudy ?? this.numHelper.round(Math.max((assessment.pstudy_expected_contrib ?? 0), disc_80))); 

            // Calculate the combined net income for the study period.
            let combined_net = 0;
            let spouse_exempt_amt = 0;
            let exempt_amt = await this.clsLookupRepo.getStudentExemptAmount(application.academic_year_id);

            if (application.academic_year_id && application.academic_year_id > 2003) {
                exempt_amt = exempt_amt * (assessment.study_weeks ?? 0);
            }

            // Calculate the spouse exempt amount
            if (application.spouse_study_school_to && application.spouse_study_school_from) {
                
                spouse_exempt_amt = await this.clsLookupRepo.getStudentExemptAmount(application.academic_year_id);

                if (application.academic_year_id && application.academic_year_id > 2003) {
                    const spouse_school_diff = moment.utc(application.spouse_study_school_from).diff(moment(application.spouse_study_school_to), "day");
                    const spouse_school_weeks = Math.trunc((spouse_school_diff + 1)/7 + .9999);
                    spouse_exempt_amt = exempt_amt * Math.max((assessment.study_weeks ?? 0), spouse_school_weeks);
                }              
            }

            if ((assessment.student_gross_income ?? 0) > 0) {
                const s_gross = assessment.student_gross_income ?? 0;
                const s_tax = assessment.student_tax_rate ?? 0;
                combined_net = Math.max(0, this.numHelper.round(s_gross - this.numHelper.round(s_gross * (s_tax/100))));
            }

            if ((assessment.spouse_gross_income ?? 0) > 0) {
                const sp_gross = assessment.spouse_gross_income ?? 0;
                const sp_tax = assessment.spouse_tax_rate ?? 0;

                combined_net = combined_net + Math.max((this.numHelper.round(sp_gross - (sp_gross - (sp_tax/100)))), spouse_exempt_amt);
            }

            const contrib = (assessment.married_study ?? (this.numHelper.round(Math.max((assessment.spouse_expected_contribution ?? 0), combined_net))));
            
            let assets = 0;

            if ((assessment.vehicle_deduction ?? 0) > 0) {
                const v_deduction = await this.clsLookupRepo.getVehicleDeductionAmount(application.academic_year_id);
                assets = this.numHelper.round(Math.max(0, ((assessment.vehicle_deduction ?? 0) - v_deduction)));
            }

            if ((assessment.financial_investments ?? 0) > 0) {
                assets += assessment.financial_investments ?? 0;
            }

            if ((assessment.other_income ?? 0) > 0) {
                const other_income = assessment.other_income ?? 0;
                const asset_tax = assessment.asset_tax_rate ?? 0;
                assets += this.numHelper.round(other_income - (other_income * (asset_tax/100)));
            }
            
            const getYear = (year?: number, month?: number, sDate?: Date): number => {
                let result = 0;
                if (year && month && sDate) {
                    const date = moment().year(year).month(month - 1).endOf("month");
                    const diffDays = moment.utc(date).diff(sDate, "day");
                    result = Math.round(diffDays / 365.25 + 0.4999);
                }
                return result;
            };

            if ((assessment.rrsp_student_gross ?? 0) > 0) {
                const s_gross = assessment.rrsp_student_gross ?? 0;
                const s_year = getYear(student.high_school_left_year, student.high_school_left_month, assessment.pstudy_start_date);
                const s_deduct = await this.clsLookupRepo.getRRSPDeductionYearlyAmount(application.academic_year_id);
                assets += Math.max(0, (s_gross - (s_year * s_deduct)));
            }

            if ((assessment.rrsp_spouse_gross ?? 0) > 0) {
                const sp_gross = assessment.rrsp_spouse_gross ?? 0;
                const sp_year = getYear(application.spouse_hs_end_year, application.spouse_hs_end_month, assessment.pstudy_start_date);
                const sp_deduct = await this.clsLookupRepo.getRRSPDeductionYearlyAmount(application.academic_year_id);
                assets += Math.max(0, (sp_gross - (sp_year * sp_deduct)));
            }

            let parent_contrib = 0;
            const netIncome = (p1_income?: number, p2_income?: number, p1_tax?: number, p2_tax?: number): number => {
                return (p1_income ?? 0) + (p2_income ?? 0) - (p1_tax ?? 0) - (p2_tax ?? 0);
            };

            if ((assessment.csl_classification ?? 0) === 1)
            {
                let msol = 0;
                let parent_contribution = 0;
                if (!assessment.parent_contribution_override) {
                    const mailing_address: PersonAddressDTO = await this.personRepo.getPersonAddress(student.id, 4);
                    if (mailing_address && mailing_address.province_id) {
                        msol = await this.standardLivingRepo.getStandardLivingAmount(application.academic_year_id, mailing_address.province_id, assessment.family_size ?? 0);
                    }

                    const discretionary_income = netIncome(assessment.parent1_income, assessment.parent2_income, assessment.parent1_tax_paid, assessment.parent2_tax_paid) - msol;
                    parent_contribution = await this.parentRepo.getParentContributionAmount(application.academic_year_id, discretionary_income);
                    parent_contrib = Math.round(parent_contribution * (assessment.study_weeks ?? 0)/Math.max(assessment.parent_ps_depend_count ?? 0, 1));
                }
                else {
                    parent_contrib = assessment.parent_contribution_override ?? 0;
                }                
            }
            else {
                parent_contrib = 0;
            }
            
            assets = Math.max((assessment.married_assets ?? 0), (assets ?? 0));

            result = assets + contrib + ps_contrib + parent_contrib;
        }
        else {
            result = (assessment.student_contribution ?? 0) + (assessment.spouse_contribution ?? 0);
        }

        return result;
    }

    async executeRecalc(funding_request_id: number, assessment: Partial<AssessmentDTO> = {}, disbursements: Array<DisbursementDTO> = []): Promise<Partial<CsgftResultDTO>> {

        this.assessment = assessment;
        this.disbursements = disbursements;
        await this.loadData(funding_request_id, false);

        this.global.csl_funding_request_id = await this.getCslFundingRequestId(this.application.id);

        await this.getNewInfo();

        this.resultDto.data = this.assessment;
        this.resultDto.globals = this.global;
        this.resultDto.disbursements = this.disbursements;
        this.resultDto.funding_request = this.funding_request;        

        return this.resultDto;
    }
    
    async executeDisburse(funding_request_id: number, assessment: Partial<AssessmentDTO> = {}, disbursements: Array<DisbursementDTO> = []): Promise<Partial<CsgftResultDTO>> {
        
        disbursements = disbursements.filter((x) => x.transaction_number !== null);
        this.assessment = assessment;
        this.disbursements = disbursements;
        await this.loadData(funding_request_id, false);

        this.disbursement.disbursed_amount = this.assessment.net_amount;
        this.disbursement.paid_amount = this.disbursement.disbursed_amount;
        const local_disbursements: Array<DisbursementDTO> = [];
        const disbursement_required: number = this.numHelper.getNum(this.assessment.disbursements_required ?? 0);
        
        if ((this.assessment.net_amount ?? 0) > 0) {
            let amount_remaining = this.assessment.net_amount ?? 0;

            for (let i = disbursement_required; i > 0; i--) {
                const disbursement: Partial<DisbursementDTO> = {};
                disbursement.assessment_id = this.assessment.id;
                disbursement.funding_request_id = this.assessment.funding_request_id;
                disbursement.issue_date = new Date();
                
                if (!disbursement.financial_batch_id) {

                    if ((this.assessment.net_amount ?? 0) > 0 && (this.assessment.assessment_type_id ?? 0) === 3) {
                        disbursement.disbursed_amount = 0;
                        disbursement.paid_amount = 0;
                        disbursement.disbursement_type_id = 9;
                    }
                    else {
                        if (i === 1) {
                            disbursement.disbursed_amount = amount_remaining;
                        }
                        else {
                            disbursement.disbursed_amount = this.numHelper.round((this.assessment.net_amount ?? 0)/i);
                        }
                        disbursement.paid_amount = disbursement.disbursed_amount;
                        amount_remaining -= (disbursement.paid_amount ?? 0)
                    }
                }

                local_disbursements.push(disbursement);
                this.assessment.net_amount = amount_remaining;
            }

            if ((this.assessment.net_amount ?? 0) < 0) {
                this.disbursement.transaction_number = await this.disbursementRepo.getMaxTransaction(funding_request_id);
            }
            else {
                if ((this.assessment.net_amount ?? 0) > 0 && (this.assessment.assessment_type_id ?? 0) !== 3) {
                    this.funding_request.status_id = 7;
                    this.funding_request.status_date = new Date();

                    this.global.update_status = true;
                }
            }
        }
        else {
            this.disbursement.assessment_id = this.assessment.id;
            this.disbursement.funding_request_id = this.assessment.funding_request_id;
            this.disbursement.issue_date = new Date();
            this.disbursement.disbursed_amount = this.assessment.net_amount;
            this.disbursement.paid_amount = this.disbursement.disbursed_amount;
            local_disbursements.push(this.disbursement);
        }

        this.global.disbursement_flag = true;

        let disbursed_amt = 0;
        if (local_disbursements.length == 0) {
            disbursed_amt = await this.disbursementRepo.getDisbursedAmount(funding_request_id, this.assessment.id);
        }
        else {
            local_disbursements.forEach((x) => {
                disbursed_amt += parseInt((x.disbursed_amount?.toString() ?? '0'));
            });
        }
        
        this.assessment.previous_disbursement = disbursed_amt > 0 ? disbursed_amt : 0;
        this.assessment.net_amount = this.getNetAmount(this.assessment.assessed_amount, this.assessment.previous_disbursement);         

        this.disbursements = local_disbursements;

        this.disbursements.sort((x,y) => parseInt(x.transaction_number ?? '0') - parseInt(y.transaction_number ?? '0'));
                
        this.resultDto.data = this.assessment;
        this.resultDto.globals = this.global;        
        this.resultDto.disbursements = this.disbursements;
        this.resultDto.funding_request = this.funding_request;        
       
        return this.resultDto;
    }

    async insertUpdateAll(payload: Partial<CsgftResultDTO>): Promise<Partial<CsgftResultDTO>> {

        const result: Partial<CsgftResultDTO> = {};
        let assessment_id = undefined;

        if (payload.data) {
            
            if (payload.data.id && payload.data.id > 0)
            {
                result.data = await this.updateAssessment(payload.data.id, payload.data);
            }
            else
            {
                result.data = await this.insertAssessment(payload.data);
                if (Array.isArray(payload.disbursements))
                {
                    for (let idx in payload.disbursements) {
                        payload.disbursements[idx].assessment_id = result.data.id;
                    }
                }
            }
            assessment_id = result.data.id;
        }

        if (payload.disbursements)
        {            
            result.disbursements = await this.processDisbursements(payload.disbursements, assessment_id);
        }

        if (payload.funding_request)
        {
            if (payload.funding_request.id)
            {
                result.funding_request = await this.fundingRequestRepo.updateFundingRequest(payload.funding_request.id, payload.funding_request);
            }
        }

        return result;
    }
    
    async insertAssessment(assessment: AssessmentDTO): Promise<AssessmentDTO> {
        const filtered = this.getAssessmentTable(assessment);
        const result = await this.mainDb(this.mainTable).insert(filtered).returning("*");        
        return result[0];
    }

    async updateAssessment(id: number, assessment: AssessmentDTO): Promise<AssessmentDTO> {
        const filtered = this.getAssessmentTable(assessment);
        const result = await this.mainDb(this.mainTable)
                                .update(filtered)
                                .where({
                                    id: id
                                })
                                .returning("*");
        return result[0];
    }

    async processDisbursements(disbursements: Array<DisbursementDTO>, assessment_id?: number): Promise<DisbursementDTO[]> {
        let result: Array<DisbursementDTO> = [];
        let stored: Array<DisbursementDTO> = [];
        if (assessment_id) {
            stored = await this.disbursementRepo.getByAssessmentId(assessment_id);            
        }

        disbursements.forEach(async (x: DisbursementDTO) => {
            const dis = this.disbursementRepo.getDisbursementTable(x);
            let record: DisbursementDTO;
            let query;

            if (x.id && x.id > 0)
            {
                query = await this.mainDb(this.disbursementRepo.getMainTable())
                                .update(dis)
                                .where({
                                    id: x.id
                                })
                                .returning("*");
            }
            else {
                if (dis.assessment_id && dis.funding_request_id) {
                    query = await this.mainDb(this.disbursementRepo.getMainTable()).insert(dis).returning("*");
                }                
            }
            
            if (query) {
                record = query[0];
                result.push(record);
            }
        });

        // Delete missing disbursements
        if (stored) {
            stored.forEach(async (x) => {
                let matched = disbursements.find((d) => d.id === x.id);
                if (!matched) {
                    await this.mainDb(this.disbursementRepo.getMainTable())
                            .where("id", x.id)
                            .del();
                }
            });
        }

        return result;
    }
}