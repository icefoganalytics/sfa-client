import axios from "axios";
import moment from "moment";
import { isNumber, isUndefined, isArray } from "lodash";
import { parse } from "vue-currency-input";
import { APPLICATION_URL, CSG_THRESHOLD_URL } from "@/urls";
import store from "@/store";

const REQUEST_TYPE_ID = 33;

const state = {
  csgThresholds: [],
  fundingRequest: {},
  assessment: {},

  disbursements: [],
  parentAssessment: {},
  parentDisbursements: [],
  baseMiscAmount: 10,
  baseRate: {},
};
const getters = {
  dependentCount(state) {
    if (store.getters.selectedStudent && isArray(store.getters.selectedStudent.dependent_info)) {
      return store.getters.selectedStudent.dependent_info.filter(
        (d) => d.is_csg_eligible && d.application_id == state.fundingRequest.application_id
      ).length;
    }
    return 0;
  },

  disbursements(state) {
    return state.disbursements;
  },
  familyIncome(state) {
    let val = state.assessment
      ? (state.assessment.student_ln150_income || 0) +
        (state.assessment.spouse_ln150_income || 0) +
        (state.assessment.parent1_income || 0) +
        (state.assessment.parent2_income || 0)
      : 0;
    return val;
  },
  totalStudyCosts(state) {
    let total = (state.application?.tuition_estimate_amount ?? 0) + (state.application?.books_supplies_cost ?? 0);
    return total;
  },
  totalTransportation(state) {
    return state.assessment.p_trans_month * state.assessment.study_months;
  },
  totalDayCare(state) {
    return (
      Math.min(state.assessment.day_care_allowable, state.assessment.day_care_actual) * state.assessment.study_months
    );
  },
  maxMiscellaneous(state, getters) {
    return state.baseMiscAmount * state.application?.courses_per_week;
  },
  totalMiscellaneous(state, getters) {
    return getters.maxMiscellaneous * state.assessment.study_weeks;
  },
  totalCosts(state, getters) {
    return getters.totalStudyCosts + getters.totalTransportation + getters.totalDayCare + getters.totalMiscellaneous;
  },

  threshold(state) {
    if (state.assessment && state.csgThresholds && state.csgThresholds.length > 0) {
      let size = Math.min(state.assessment.family_size, 7);
      let val = state.csgThresholds.filter((f) => f.family_size == size)[0];
      return val || {};
    }
    return {};
  },

  pastThreshold(state, getters) {
    if (getters.threshold.middle_income_threshold <= getters.familyIncome) return "Past income threshold";
    return undefined;
  },

  phaseOutRate(state, getters) {
    let depCount = state.assessment?.dependent_count ?? 0;
    let income = getters.familyIncome;

    if (income >= getters.threshold.income_cutoff) return 0;
    else if (income > getters.threshold.income_threshold) {
      if (depCount == 1 || depCount == 2) return getters.threshold.csgpt_dep2_phase_out_rate;
      else if (depCount > 2) return getters.threshold.csgpt_dep3_phase_out_rate;
      else return 0;
    } else return 0;
  },

  assessedAmount(state, getters) {
    if (isUndefined(state.assessment.study_weeks)) return 0;
    if (getters.pastThreshold) return 0;
    if (!(state.fundingRequest && [6, 7].includes(state.fundingRequest.status_id))) return 0;

    return Math.min(getters.needRemaining, state.assessment.study_weeks * getters.weeklyRate);
  },
  previousDisbursements(state) {
    let amounts = state.disbursements.map((d) => d.disbursed_amount);
    let total = amounts.reduce((t, a) => {
      return t + a;
    }, 0);

    return total;
  },
  netAmount(state, getters) {
    let rawVal = getters.assessedAmount - getters.previousDisbursements;
    if (rawVal > 0 && rawVal < 100) return 100.0;
    return Object.is(Math.round(rawVal), -0) ? 0 : Math.round(rawVal);
  },

  weeklyRate(state, getters) {
    let depCount = state.assessment?.dependent_count ?? 0;
    let rate = 0;

    if (depCount == 1 || depCount == 2) rate = state.baseRate.csgpt_dep_1_2_weekly_amount;
    else if (depCount > 2) rate = state.baseRate.csgpt_dep_3_weekly_amount;

    let val = Math.max(
      0,
      Math.min(rate, rate - getters.phaseOutRate * (getters.familyIncome - getters.threshold.income_threshold))
    );

    return val;
  },
  needRemaining(state) {
    let totalNeed = store.getters["cslPartTimeStore/totalCosts"];
    return Math.max(
      0,
      totalNeed -
        store.getters["csgPartTimeDisabilityStore/assessedAmount"] -
        store.getters["csgPartTimeStore/assessedAmount"]
    );
  },
};
const mutations = {
  SET_THRESHOLDS(state, value) {
    state.csgThresholds = value;
  },
  SET_BASERATE(state, value) {
    state.baseRate = value;
  },
  SET_FUNDINGREQUEST(state, value) {
    state.fundingRequest = value;
  },
  SET_PARENTASSESSMENT(state, value) {
    state.parentAssessment = value;
  },
  SET_ASSESSMENT(state, value) {
    state.assessment = value;
  },
  SET_PARENTDISBURSEMENTS(state, value) {
    state.parentDisbursements = value;
  },
  SET_DISBURSEMENTS(state, value) {
    for (let v of value) {
      v.due_date = v.due_date ? moment.utc(v.due_date).format("YYYY-MM-DD") : undefined;
      v.issue_date = v.issue_date ? moment.utc(v.issue_date).format("YYYY-MM-DD") : undefined;
    }

    state.disbursements = value;
  },
};
const actions = {
  async initialize(store, { app, assessment }) {
    console.log("Initializing CSGPTDEP");
    store.state.application = app;
    store.state.parentAssessment = assessment;

    store.dispatch("loadThresholds", app.academic_year_id);
    store.dispatch("loadAssessment", app.id);
  },

  async loadThresholds({ commit }, academicYear) {
    axios.get(`${CSG_THRESHOLD_URL}/${academicYear}`).then((resp) => {
      commit("SET_THRESHOLDS", resp.data.data);
      commit("SET_BASERATE", resp.data.rates);
    });
  },

  loadAssessment({ commit, state }, applicationId) {
    axios
      .get(`${CSG_THRESHOLD_URL}/csgptdep/${applicationId}`)
      .then((resp) => {
        commit("SET_FUNDINGREQUEST", resp.data.data.funding_request);
        commit("SET_DISBURSEMENTS", resp.data.data.disbursements);

        if (resp.data.data.assessment) {
          let assessment = resp.data.data.assessment;
          assessment.assessed_date = moment.utc(assessment.assessed_date).format("YYYY-MM-DD");
          assessment.classes_start_date = moment.utc(assessment.classes_start_date).format("YYYY-MM-DD");
          assessment.classes_end_date = moment.utc(assessment.classes_end_date).format("YYYY-MM-DD");

          commit("SET_ASSESSMENT", resp.data.data.assessment);
        } else {
          let dependentCount = 0;
          let familySize = 1;

          // Common-law or Married
          if ([3].includes(state.application.csl_classification)) familySize++;

          if (store.getters.selectedStudent && isArray(store.getters.selectedStudent.dependent_info)) {
            dependentCount = store.getters.selectedStudent.dependent_info.filter(
              (d) => d.is_csg_eligible && d.application_id == state.fundingRequest.application_id
            ).length;

            familySize += store.getters.selectedStudent.dependent_info.filter(
              (d) => d.is_csl_eligible && d.application_id == state.fundingRequest.application_id
            ).length;
          }

          let parent = state.parentAssessment;
          let assessment = {
            assessed_date: moment().format("YYYY-MM-DD"),
            study_weeks: parent.study_weeks,
            classes_start_date: moment.utc(parent.classes_start_date).format("YYYY-MM-DD"),
            classes_end_date: moment.utc(parent.classes_end_date).format("YYYY-MM-DD"),
            study_months: parent.study_months,
            family_size: familySize,
            dependent_count: dependentCount,
            student_ln150_income: parent.student_ln150_income,
            spouse_ln150_income: parent.spouse_ln150_income,
            parent1_income: parent.parent1_income,
            parent2_income: parent.parent2_income,
            relocation_total: parent.relocation_total,
            discretionary_cost: parent.discretionary_cost,
            discretionary_cost_actual: parent.discretionary_cost_actual,
            tuition_estimate: parent.tuition_estimate,
            books_supplies_cost: parent.books_supplies_cost,
            r_trans_16wk: parent.r_trans_16wk,
            shelter_month: parent.shelter_month,
            p_trans_month: parent.p_trans_month,
            day_care_allowable: parent.day_care_allowable,
            day_care_actual: parent.day_care_actual,
            depend_food_allowable: parent.depend_food_allowable,
            depend_tran_allowable: parent.depend_tran_allowable,
            spouse_expected_contribution: parent.spouse_expected_contribution,
            student_expected_contribution: parent.student_expected_contribution,
            student_contrib_exempt: parent.student_contrib_exempt,
            spouse_contrib_exempt: parent.spouse_contrib_exempt,
            student_contribution_review: parent.student_contribution_review,
            spouse_contribution_review: parent.spouse_contribution_review,
            parent_contribution_review: parent.parent_contribution_review,
          };

          commit("SET_ASSESSMENT", assessment);
        }
      })
      .catch((e) => {
        commit("SET_FUNDINGREQUEST", undefined);
        commit("SET_DISBURSEMENTS", []);
        commit("SET_ASSESSMENT", {});
      });
  },

  async recalculate({ state, dispatch, commit }) {
    dispatch("loadAssessment", state.fundingRequest.application_id).then(() => {
      let parent = state.parentAssessment;
      let dependentCount = 0;
      let familySize = 1;

      // Common-law or Married
      if ([3].includes(state.application.csl_classification)) familySize++;

      if (store.getters.selectedStudent && isArray(store.getters.selectedStudent.dependent_info)) {
        dependentCount = store.getters.selectedStudent.dependent_info.filter(
          (d) => d.is_csg_eligible && d.application_id == state.fundingRequest.application_id
        ).length;

        familySize += store.getters.selectedStudent.dependent_info.filter(
          (d) => d.is_csl_eligible && d.application_id == state.fundingRequest.application_id
        ).length;
      }

      let assessment = {
        id: state.assessment.id,
        assessed_date: moment().format("YYYY-MM-DD"),
        study_weeks: parent.study_weeks,
        classes_start_date: moment.utc(parent.classes_start_date).format("YYYY-MM-DD"),
        classes_end_date: moment.utc(parent.classes_end_date).format("YYYY-MM-DD"),
        study_months: parent.study_months,
        family_size: familySize,
        dependent_count: dependentCount,
        student_ln150_income: parent.student_ln150_income,
        spouse_ln150_income: parent.spouse_ln150_income,
        parent1_income: parent.parent1_income,
        parent2_income: parent.parent2_income,
        relocation_total: parent.relocation_total,
        discretionary_cost: parent.discretionary_cost,
        discretionary_cost_actual: parent.discretionary_cost_actual,
        tuition_estimate: parent.tuition_estimate,
        books_supplies_cost: parent.books_supplies_cost,
        r_trans_16wk: parent.r_trans_16wk,
        shelter_month: parent.shelter_month,
        p_trans_month: parent.p_trans_month,
        day_care_allowable: parent.day_care_allowable,
        day_care_actual: parent.day_care_actual,
        depend_food_allowable: parent.depend_food_allowable,
        depend_tran_allowable: parent.depend_tran_allowable,
        spouse_expected_contribution: parent.spouse_expected_contribution,
        student_expected_contribution: parent.student_expected_contribution,
        student_contrib_exempt: parent.student_contrib_exempt,
        spouse_contrib_exempt: parent.spouse_contrib_exempt,
        student_contribution_review: parent.student_contribution_review,
        spouse_contribution_review: parent.spouse_contribution_review,
        parent_contribution_review: parent.parent_contribution_review,
      };

      commit("SET_ASSESSMENT", assessment);
      dispatch("save");
    });
  },

  async makeDisbursements({ getters, commit, state, dispatch }, numberOfDisbursements) {
    let parts = Math.ceil(getters.netAmount / numberOfDisbursements);
    let disbursedValues = [];

    let total = 0;

    for (let i = 0; i < numberOfDisbursements - 1; i++) {
      let amount = parse(formatMoney(parts), { currency: "usd" });
      total += amount;

      disbursedValues.push({
        disbursed_amount: amount,
        disbursement_type_id: 3,
        issue_date: moment().format("YYYY-MM-DD"), // today
      });
    }

    let remainder = parse(formatMoney(getters.netAmount - total), { currency: "usd" });

    disbursedValues.push({
      disbursed_amount: remainder,
      disbursement_type_id: 3,
      issue_date: moment().format("YYYY-MM-DD"),
    });

    await commit("SET_DISBURSEMENTS", [...state.disbursements, ...disbursedValues]);

    await axios.put(`${APPLICATION_URL}/${state.fundingRequest.application_id}/status/${state.fundingRequest.id}`, {
      data: { status_id: 7 }, // Awarded
    });

    dispatch("save");
  },

  async removeDisbursement({ state }, { item, index }) {
    if (item.id) {
      state.disbursements.splice(index, 1);
      await axios.delete(
        `${CSG_THRESHOLD_URL}/csgftdep/${state.fundingRequest.application_id}/funding-request/${state.fundingRequest.id}/disbursement/${item.id}`
      );
    } else {
      state.disbursements.splice(index, 1);
    }
  },

  async addDisbursement({ state }) {
    state.disbursements.push({
      disbursement_type_id: 3,
      issue_date: moment().format("YYYY-MM-DD"), // today
    });
  },

  async save({ state, dispatch }) {
    state.assessment.disbursements = state.disbursements;

    if (state.assessment.id) {
      axios
        .put(
          `${CSG_THRESHOLD_URL}/csgftdep/${state.fundingRequest.application_id}/funding-request/${state.fundingRequest.id}/assessment/${state.assessment.id}`,
          state.assessment
        )
        .then((resp) => {
          dispatch("loadAssessment", state.fundingRequest.application_id);
        });
    } else {
      axios
        .post(
          `${CSG_THRESHOLD_URL}/csgftdep/${state.fundingRequest.application_id}/funding-request/${state.fundingRequest.id}/assessment`,
          state.assessment
        )
        .then((resp) => {
          dispatch("loadAssessment", state.fundingRequest.application_id);
        });
    }
  },

  async createFundingRequest({ state, dispatch }) {
    return await axios
      .post(`${APPLICATION_URL}/${state.application.id}/status`, {
        request_type_id: REQUEST_TYPE_ID,
        received_date: new Date(),
      })
      .then((resp) => {
        dispatch("loadAssessment", state.application.id);
      });
  },
  async updateFundingRequest({ state, dispatch }) {
    return await axios
      .put(`${APPLICATION_URL}/${state.application.id}/status/${state.fundingRequest.id}`, {
        data: {
          status_id: state.fundingRequest.status_id,
          status_date: new Date(),
          status_reason_id: state.fundingRequest.status_reason_id,
        },
      })
      .then((resp) => {
        dispatch("loadAssessment", state.application.id);
      });
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
  namespaced: true,
};

function formatMoney(input) {
  if (isNumber(input)) {
    return Intl.NumberFormat("en", {
      currency: "USD",
      style: "currency",
    }).format(input);
  }

  return "";
}
