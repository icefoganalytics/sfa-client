import axios from "axios";
import { ADMIN_REPORT_URL } from "@/urls";

const state = {
  reportOptions: [
    {
      text: "STA Report - Yukon University",
      url: "/staYukonUniversity/:academic_year_id",
      parameters: [
        {
          name: "Academic year",
          field: "academic_year_id",
          options: "academicYears",
          required: true,
          itemText: "year",
          itemValue: "year",
        },
      ],
      downloadFormat: [".pdf"],
      headers: [
        { text: "Name", value: "name" },
        { text: "SIN", value: "sin" },
        { text: "Effective Date", value: "effectiveDate" },
        { text: "Week", value: "weeks" },
        { text: "Rate/Week", value: "weeklyAmount" },
        { text: "Travel", value: "travelAllowance" },
        { text: "Net", value: "net" },
        { text: "Comment", value: "comment" },
      ],
    },
    {
      text: "Funding Status Report",
      url: "/fundingStatus/:academic_year_id",
      parameters: [
        {
          name: "Academic year",
          field: "academic_year_id",
          options: "academicYears",
          required: true,
          itemText: "year",
          itemValue: "year",
        },
      ],
      downloadFormat: [".csv"],
      headers: [
        { text: "First name", value: "firstName" },
        { text: "Last name", value: "lastName" },
        { text: "Status", value: "applicationStatus" },
        { text: "Institution", value: "institutionName" },
        { text: "Received", value: "receivedDate" },
        { text: "Grant", value: "grantType" },
        { text: "Reason", value: "statusReason" },
      ],
    },
    {
      text: "Scholarship Qualified Report",
      url: "/scholarshipQualified/:academic_year_id/",
      parameters: [
        {
          name: "Academic year",
          field: "academic_year_id",
          options: "academicYears",
          required: true,
          itemText: "year",
          itemValue: "year",
        },
      ],
      downloadFormat: [".csv"],
      headers: [
        { text: "Scholarship", value: "scholarship" },
        { text: "First name", value: "firstName" },
        { text: "Last name", value: "lastName" },
        { text: "Program", value: "program" },
        { text: "Academic Percentage", value: "academicPercent" },
      ],
    },
    {
      text: "NARS FT 2022",
      url: "/nars2022",
      downloadFormat: [".csv", ".txt"],
      headers: [
        { text: "loanyear", value: "loanyear" },
        { text: "prov_issue", value: "prov_issue" },
        { text: "app_number", value: "app_number" },
        { text: "version_num", value: "version_num" },
        { text: "app_status", value: "app_status" },
        { text: "assess_date", value: "assess_date" },
        { text: "reasess_indicator", value: "reasess_indicator" },
        { text: "csl_auth_date", value: "csl_auth_date" },
        { text: "sin", value: "sin" },
        { text: "dob", value: "dob" },
        { text: "sex_code", value: "sex_code" },
        { text: "cat_code", value: "cat_code" },
        { text: "single_ind_stat_reas", value: "single_ind_stat_reas" },
        { text: "social_assist_flag", value: "social_assist_flag" },
        { text: "disab_flag", value: "disab_flag" },
        { text: "disab_sr_status", value: "disab_sr_status" },
        { text: "indigenous_flag", value: "indigenous_flag" },
        { text: "indigenous_cat", value: "indigenous_cat" },
        { text: "visible_ind", value: "visible_ind" },
        { text: "parent1_postal", value: "parent1_postal" },
        { text: "parent2_postal", value: "parent2_postal" },
        { text: "spouse_sin", value: "spouse_sin" },
        { text: "spouse_student", value: "spouse_student" },
        { text: "spouse_num_sp_weeks", value: "spouse_num_sp_weeks" },
        { text: "family_size", value: "family_size" },
        { text: "num_dep_child_pse", value: "num_dep_child_pse" },
        { text: "depchild_to_11_and_dis_12over", value: "depchild_to_11_and_dis_12over" },
        { text: "depchild_12over_ndis_andothdep", value: "depchild_12over_ndis_andothdep" },
        { text: "res_postal", value: "res_postal" },
        { text: "sp_away_home", value: "sp_away_home" },
        { text: "ei_code", value: "ei_code" },
        { text: "pos", value: "pos" },
        { text: "pos2", value: "pos2" },
        { text: "program_type", value: "program_type" },
        { text: "year_study", value: "year_study" },
        { text: "year_in_program", value: "year_in_program" },
        { text: "program_duration", value: "program_duration" },
        { text: "pscd", value: "pscd" },
        { text: "psed", value: "psed" },
        { text: "num_sp_assess_weeks", value: "num_sp_assess_weeks" },
        { text: "perc_full_course_load", value: "perc_full_course_load" },
        { text: "early_withdrawal_ind", value: "early_withdrawal_ind" },
        { text: "date_left_high_school", value: "date_left_high_school" },
        { text: "stud_sp_inc_targ_fund_total", value: "stud_sp_inc_targ_fund_total" },
        { text: "stud_sp_inc_mbsa_tot", value: "stud_sp_inc_mbsa_tot" },
        { text: "stud_gross_annual_inc", value: "stud_gross_annual_inc" },
        { text: "stud_gross_annual_inc_reassess", value: "stud_gross_annual_inc_reassess" },
        { text: "parent1_gross_ann_inc", value: "parent1_gross_ann_inc" },
        { text: "parent1_net_ann_inc", value: "parent1_net_ann_inc" },
        { text: "parent1_cpp_cont", value: "parent1_cpp_cont" },
        { text: "parent1_ei_prem", value: "parent1_ei_prem" },
        { text: "parent1_inc_tax_paid", value: "parent1_inc_tax_paid" },
        { text: "parent1_tot_tax_inc", value: "parent1_tot_tax_inc" },
        { text: "parent1_gross_ann_inc_reassess", value: "parent1_gross_ann_inc_reassess" },
        { text: "parent1_net_ann_inc_reassess", value: "parent1_net_ann_inc_reassess" },
        { text: "parent2_gross_ann_inc", value: "parent2_gross_ann_inc" },
        { text: "parent2_net_ann_inc", value: "parent2_net_ann_inc" },
        { text: "parent2_cpp_cont", value: "parent2_cpp_cont" },
        { text: "parent2_ei_prem", value: "parent2_ei_prem" },
        { text: "parent2_inc_tax_paid", value: "parent2_inc_tax_paid" },
        { text: "parent2_tot_tax_inc", value: "parent2_tot_tax_inc" },
        { text: "parent2_gross_ann_inc_reassess", value: "parent2_gross_ann_inc_reassess" },
        { text: "parent2_net_ann_inc_reassess", value: "parent2_net_ann_inc_reassess" },
        { text: "spouse_gross_annual_inc", value: "spouse_gross_annual_inc" },
        { text: "spouse_gross_annual_inc_reassess", value: "spouse_gross_annual_inc_reassess" },
        { text: "stud_cont_targfund", value: "stud_cont_targfund" },
        { text: "stud_cont_bsa", value: "stud_cont_bsa" },
        { text: "fs_cont_amt", value: "fs_cont_amt" },
        { text: "parent_cont", value: "parent_cont" },
        { text: "frspousal_cont_amt", value: "frspousal_cont_amt" },
        { text: "other_resources", value: "other_resources" },
        { text: "tot_ass_res", value: "tot_ass_res" },
        { text: "fs_cont_exempt_indig", value: "fs_cont_exempt_indig" },
        { text: "fs_cont_exempt_pd", value: "fs_cont_exempt_pd" },
        { text: "fs_cont_exempt_dependant", value: "fs_cont_exempt_dependant" },
        { text: "fs_cont_exempt_crown", value: "fs_cont_exempt_crown" },
        { text: "frspouse_cont_exempt_stud", value: "frspouse_cont_exempt_stud" },
        { text: "frspouse_cont_exempt_ei", value: "frspouse_cont_exempt_ei" },
        { text: "frspouse_cont_exempt_sa", value: "frspouse_cont_exempt_sa" },
        { text: "frspouse_cont_exempt_db", value: "frspouse_cont_exempt_db" },
        { text: "fs_cont_review_flag", value: "fs_cont_review_flag" },
        { text: "parental_cont_review_flag", value: "parental_cont_review_flag" },
        { text: "frspouse_cont_review_flag", value: "frspouse_cont_review_flag" },
        { text: "stud_sp_cost_living_allow", value: "stud_sp_cost_living_allow" },
        { text: "stud_sp_cost_tuition", value: "stud_sp_cost_tuition" },
        { text: "stud_sp_cost_comp_fee", value: "stud_sp_cost_comp_fee" },
        { text: "stud_sp_cost_computers", value: "stud_sp_cost_computers" },
        { text: "stud_sp_cost_allow_book", value: "stud_sp_cost_allow_book" },
        { text: "stud_sp_cost_allow_child", value: "stud_sp_cost_allow_child" },
        { text: "stud_sp_cost_ret_transp", value: "stud_sp_cost_ret_transp" },
        { text: "stud_sp_cost_other_trans", value: "stud_sp_cost_other_trans" },
        { text: "stud_sp_cost_other", value: "stud_sp_cost_other" },
        { text: "tot_ass_cost", value: "tot_ass_cost" },
        { text: "req_need", value: "req_need" },
        { text: "tot_calc_need", value: "tot_calc_need" },
        { text: "ass_csl_bef_overa", value: "ass_csl_bef_overa" },
        { text: "ass_psl_bef_overa", value: "ass_psl_bef_overa" },
        { text: "csl_over_award_recovered", value: "csl_over_award_recovered" },
        { text: "psl_over_award_recovered", value: "psl_over_award_recovered" },
        { text: "auth_csl_amt", value: "auth_csl_amt" },
        { text: "auth_psl_amt", value: "auth_psl_amt" },
        { text: "csg_ft", value: "csg_ft" },
        { text: "csg_ftdep", value: "csg_ftdep" },
        { text: "csg_d", value: "csg_d" },
        { text: "csg_dse", value: "csg_dse" },
        { text: "topup_fund", value: "topup_fund" },
        { text: "prov_grant_burs_schol_amt", value: "prov_grant_burs_schol_amt" },
        { text: "prov_unmet_need_grant_auth_amt", value: "prov_unmet_need_grant_auth_amt" },
        { text: "other_prov_assist", value: "other_prov_assist" },
        { text: "tot_assist", value: "tot_assist" },
        { text: "unmet_need", value: "unmet_need" },
      ],
    },
    {
      text: "NARS PT 2022",
      url: "/nars2022pt",
      downloadFormat: [".csv", ".txt"],
      headers: [
        { text: "loanyear", value: "loanyear" },
        { text: "prov_issue", value: "prov_issue" },
        { text: "app_number", value: "app_number" },
        { text: "version_num", value: "version_num" },
        { text: "app_status", value: "app_status" },
        { text: "assess_date", value: "assess_date" },
        { text: "reasess_indicator", value: "reasess_indicator" },
        { text: "csl_auth_date", value: "csl_auth_date" },
        { text: "sin", value: "sin" },
        { text: "dob", value: "dob" },
        { text: "sex_code", value: "sex_code" },
        { text: "cat_code", value: "cat_code" },
        { text: "disab_flag", value: "disab_flag" },
        { text: "disab_sr_status", value: "disab_sr_status" },
        { text: "family_size", value: "family_size" },
        { text: "dep_under12_or_disabled", value: "dep_under12_or_disabled" },
        { text: "depchild_12over_ndis_andothdep", value: "depchild_12over_ndis_andothdep" },
        { text: "res_postal", value: "res_postal" },
        { text: "ei_code", value: "ei_code" },
        { text: "pos", value: "pos" },
        { text: "pos2", value: "pos2" },
        { text: "program_type", value: "program_type" },
        { text: "pscd", value: "pscd" },
        { text: "psed", value: "psed" },
        { text: "perc_full_course_load", value: "perc_full_course_load" },
        { text: "nr_of_courses", value: "nr_of_courses" },
        { text: "early_withdrawal_ind", value: "early_withdrawal_ind" },
        { text: "stud_gross_annual_inc", value: "stud_gross_annual_inc" },
        { text: "stud_gross_annual_inc_reassess", value: "stud_gross_annual_inc_reassess" },
        { text: "spouse_gross_annual_inc", value: "spouse_gross_annual_inc" },
        { text: "spouse_gross_annual_inc_reassess", value: "spouse_gross_annual_inc_reassess" },
        { text: "family_income", value: "family_income" },
        { text: "stud_sp_cost_tuition", value: "stud_sp_cost_tuition" },
        { text: "stud_sp_cost_allow_book", value: "stud_sp_cost_allow_book" },
        { text: "stud_sp_cost_allow_child", value: "stud_sp_cost_allow_child" },
        { text: "local_transport_allow", value: "local_transport_allow" },
        { text: "miscellaneous_allow", value: "miscellaneous_allow" },
        { text: "csl_pt_amt", value: "csl_pt_amt" },
        { text: "psl_pt_amt", value: "psl_pt_amt" },
        { text: "principal_outstanding", value: "principal_outstanding" },
        { text: "csg_pt_studies", value: "csg_pt_studies" },
        { text: "csg_ptdep", value: "csg_ptdep" },
        { text: "csg_d", value: "csg_d" },
        { text: "csg_dse", value: "csg_dse" },
        { text: "psg_pt_amt", value: "psg_pt_amt" },
      ],
    },
    {
      text: "NARS Disability FT & PT 2022",
      url: "/nars2022dis/:academic_year_id",
      downloadFormat: [".csv", ".txt"],
      parameters: [
        {
          name: "Academic year",
          field: "academic_year_id",
          options: "academicYears",
          required: true,
          itemText: "year",
          itemValue: "year",
        },
      ],
      headers: [
        { text: "sin", value: "sin" },
        { text: "last_name", value: "last_name" },
        { text: "first_name", value: "first_name" },
        { text: "loanyear", value: "loanyear" },
        { text: "loan_type", value: "loan_type" },
        { text: "prov_issue", value: "prov_issue" },
        { text: "csg_pd_auth", value: "csg_pd_auth" },
        { text: "csg_pd_disb", value: "csg_pd_disb" },
        { text: "csg_pd_authdate", value: "csg_pd_authdate" },
        { text: "csg_pd_disbdate", value: "csg_pd_disbdate" },
        { text: "csg_pdse_auth", value: "csg_pdse_auth" },
        { text: "csg_pdse_disb", value: "csg_pdse_disb" },
        { text: "csg_pdse_authdate", value: "csg_pdse_authdate" },
        { text: "csg_pdse_disbdate", value: "csg_pdse_disbdate" },
        { text: "disab_code1", value: "disab_code1" },
        { text: "disab_code2", value: "disab_code2" },
        { text: "disab_code3", value: "disab_code3" },
        { text: "type_serv_eqpt1", value: "type_serv_eqpt1" },
        { text: "type_serv_eqpt2", value: "type_serv_eqpt2" },
        { text: "type_serv_eqpt3", value: "type_serv_eqpt3" },
        { text: "type_serv_eqpt4", value: "type_serv_eqpt4" },
        { text: "type_serv_eqpt5", value: "type_serv_eqpt5" },
        { text: "type_serv_eqpt6", value: "type_serv_eqpt6" },
        { text: "type_serveqpt_desc1", value: "type_serveqpt_desc1" },
        { text: "type_serveqpt_desc2", value: "type_serveqpt_desc2" },
        { text: "type_serveqpt_desc3", value: "type_serveqpt_desc3" },
      ],
    },
    {
      text: "NARS Disability FT - Reduced Course Load 2022",
      url: "/nars2022disrcl/:academic_year_id",
      parameters: [
        {
          name: "Academic year",
          field: "academic_year_id",
          options: "academicYears",
          required: true,
          itemText: "year",
          itemValue: "year",
        },
      ],
      downloadFormat: [".csv", ".txt"],
      headers: [
        { text: "loanyear", value: "loanyear" },
        { text: "sin", value: "sin" },
        { text: "prov_issue", value: "prov_issue" },
        { text: "dob", value: "dob" },
        { text: "gender", value: "gender" },
        { text: "cat_code", value: "cat_code" },
        { text: "ei_code", value: "ei_code" },
        { text: "fos", value: "fos" },
        { text: "year_study", value: "year_study" },
        { text: "program_duration", value: "program_duration" },
        { text: "prog_changed_date", value: "prog_changed_date" },
        { text: "course_load_changed_date", value: "course_load_changed_date" },
        { text: "perc_full_course_load", value: "perc_full_course_load" },
        { text: "amt_disb", value: "amt_disb" },
        { text: "disb_date", value: "disb_date" },
        { text: "csgp_ft", value: "csgp_ft" },
        { text: "csgpft_disb_date", value: "csgpft_disb_date" },
        { text: "csgp_pd", value: "csgp_pd" },
        { text: "csgppd_disb_date", value: "csgppd_disb_date" },
        { text: "csgp_ftdep", value: "csgp_ftdep" },
        { text: "csgpftd_disb_date", value: "csgpftd_disb_date" },
      ],
    },
    {
      text: "STEP Report",
      url: "/step/:academic_year_id",
      parameters: [
        {
          name: "Academic year",
          field: "academic_year_id",
          options: "academicYears",
          required: true,
          itemText: "year",
          itemValue: "year",
        },
      ],
      downloadFormat: [".csv"],
      headers: [
        { text: "Last name", value: "lastName" },
        { text: "First name", value: "firstName" },
        { text: "Program name", value: "programName" },
        { text: "Program type", value: "programType" },
        { text: "Program year", value: "programYear" },
        { text: "Institution", value: "institutionName" },
        { text: "Email", value: "email" },
      ],
    },
    {
      text: "Approved Funding Report",
      url: "/approvedFunding/:academic_year_id",
      parameters: [
        {
          name: "Academic year",
          field: "academic_year_id",
          options: "academicYears",
          required: true,
          itemText: "year",
          itemValue: "year",
        },
      ],
      downloadFormat: [".csv"],
      headers: [
        { text: "academic_year", value: "academicYear" },
        { text: "sfa_id", value: "sfaId" },
        { text: "last_name", value: "lastName" },
        { text: "first_Name", value: "firstName" },
        { text: "gender", value: "gender" },
        { text: "age", value: "age" },
        { text: "ethnicity", value: "ethnicity" },
        { text: "first_nation", value: "firstNation" },
        { text: "marital_status", value: "maritalStatus" },
        { text: "yg_category", value: "ygCategory" },
        { text: "yukon_grant_amount", value: "yukon_grant_amount" },
        { text: "sta_amount", value: "sta_amount" },
        { text: "yea_amount", value: "yea_amount" },
        { text: "csl_ft_amount", value: "csl_ft_amount" },
        { text: "csg_ft_amount", value: "csg_ft_amount" },
        { text: "csg_tu_amount", value: "csg_tu_amount" },
        { text: "csg_ftdep_amount", value: "csg_ftdep_amount" },
        { text: "csg_disequp_amount", value: "csg_disequp_amount" },
        { text: "csg_ftdis_amount", value: "csg_ftdis_amount" },
        { text: "csl_pt_amount", value: "csl_pt_amount" },
        { text: "csg_pt_amount", value: "csg_pt_amount" },
        { text: "csg_ptdep_amount", value: "csg_ptdep_amount" },
        { text: "sfa_army_amount", value: "sfa_army_amount" },
        { text: "sfa_harach_amount", value: "sfa_harach_amount" },
        { text: "sfa_art_amount", value: "sfa_art_amount" },
        { text: "sfa_husky_amount", value: "sfa_husky_amount" },
        { text: "total_gov_amount", value: "total_gov_amount" },
        { text: "total_amount", value: "total_amount" },
        { text: "institution_name", value: "institutionName" },
        { text: "institution_country", value: "institutionCountry" },
        { text: "institution_province", value: "institutionProvince" },
        { text: "institution_level", value: "institutionLevel" },
        { text: "year_of_program", value: "yearOfProgram" },
        { text: "program_name", value: "programName" },
        { text: "programType", value: "programType" },
        { text: "study_field", value: "studyField" },
        { text: "yukon_resident_since", value: "yukonResidentSince" },
        { text: "left_high_school", value: "leftHighSchool" },
        { text: "sta_dependants", value: "sta_dependants" },
        { text: "csl_dependants_0_11", value: "csl_dependants_0_11" },
        { text: "csl_dependants_12_up", value: "csl_dependants_12_up" },
        { text: "csl_dependants_total", value: "csl_dependants_total" },

        { text: "csl_family_size", value: "familySize" },

        { text: "prestudy_csl_classification", value: "prestudyCslClassification" },
        { text: "prestudy_accomodation", value: "prestudyAccomodation" },
        { text: "study_csl_classification", value: "studyCslClassification" },
        { text: "study_accomodation", value: "studyAccomodation" },

        { text: "studentLn150Income", value: "studentLn150Income" },
        { text: "spouseLn150Income", value: "spouseLn150Income" },

        { text: "parent1Income", value: "parent1Income" },
        { text: "parent2Income", value: "parent2Income" },

        { text: "mailAddressLine1", value: "mailAddressLine1" },
        { text: "mailAddressLine2", value: "mailAddressLine2" },
        { text: "mailAddressCity", value: "mailAddressCity" },
        { text: "mailAddressProvince", value: "mailAddressProvince" },
        { text: "mailAddressCountry", value: "mailAddressCountry" },
        { text: "mailAddressPostalCode", value: "mailAddressPostalCode" },

        { text: "schoolEmail", value: "schoolEmail" },
        { text: "schoolTelephone", value: "schoolTelephone" },
      ],
    },
    {
      text: "T4A Report",
      url: "/t4a/:tax_year",
      parameters: [
        {
          name: "Tax year",
          field: "tax_year",
          options: "academicYears",
          required: true,
          itemText: "year",
          itemValue: "year",
        },
      ],
      downloadFormat: [".csv"],
      headers: [
        { text: "SIN", value: "sin" },
        { text: "Last name", value: "lastName" },
        { text: "First name", value: "firstName" },
        { text: "Initials", value: "initials" },
        { text: "Address1", value: "address1" },
        { text: "Address2", value: "address2" },
        { text: "City", value: "city" },
        { text: "Province", value: "province" },
        { text: "Country", value: "country" },
        { text: "Postal code", value: "postalCode" },
        { text: "Fund type", value: "description" },
        { text: "Amount", value: "amount" },
        { text: "Vendor ID", value: "vendorId" },
      ],
    },

    {
      text: "Vendor Update Report",
      url: "/vendor-update",
      parameters: [],
      downloadFormat: [".csv"],
      headers: [
        { text: "Student", value: "Business Name" },
        { text: "Address", value: "Street" },
        { text: "City", value: "City" },
        { text: "Province", value: "Province" },
        { text: "Vendor Id", value: "Existing Vendor id" },
      ],
    },
  ],
  selectedReport: undefined,
  reportResults: undefined,
};
const getters = {
  reportData(state) {
    return state.reportResults;
  },

  reportHeaders(state) {
    if (state.selectedReport) {
      return state.selectedReport.headers;
    }

    return [{ text: "Select a report above" }];
  },
};
const mutations = {
  SET_SELECTEDREPORT(state, value) {
    if (state.selectedReport && state.selectedReport.text != value.text) {
      state.reportResults = [];
    }

    state.selectedReport = value;
  },
  SET_REPORTDATA(state, value) {
    state.reportResults = value;
  },
  SET_REPORTHEADERS(state, value) {},
};
const actions = {
  async setReport({ commit, state }, value) {
    commit("SET_SELECTEDREPORT", value);
  },
  async runReport({ commit, state }) {
    if (state.selectedReport) {
      let url = makeUrl(state.selectedReport);

      if (url) {
        axios.get(`${ADMIN_REPORT_URL}${url}.json`).then((resp) => {
          commit("SET_REPORTDATA", resp.data);
        });
      }
    }
  },
  async downloadReport({ state }, format) {
    if (state.selectedReport) {
      let url = makeUrl(state.selectedReport);
      if (url) window.open(`${ADMIN_REPORT_URL}${url}${format}`);
    }
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
  namespaced: true,
};

function makeUrl(selectedReport) {
  let url = selectedReport.url;

  if (selectedReport.parameters) {
    for (let param of selectedReport.parameters) {
      if (param.required && !param.value) {
        alert(`${param.name} is required`);
        return;
      }

      url = url.replace(`:${param.field}`, param.value);
    }
  }

  return url;
}
