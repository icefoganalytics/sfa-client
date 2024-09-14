import axios from "axios";
import moment from "moment";
import { isNumber, isUndefined } from "lodash";
import { parse } from "vue-currency-input";
import { APPLICATION_URL, CSG_THRESHOLD_URL } from "@/urls";

const state = {
  csgThresholds: [],
  fundingRequest: {},
  assessment: {},

  disbursements: [],
  parentAssessment: {},
  parentDisbursements: [],
  baseRate: 200, // hardcoded as it is not stored in the database yet

  services: [],
  equipment: [],
};
const getters = {
  disbursements(state) {
    return state.disbursements;
  },
  previousDisbursements(state) {
    let amounts = state.disbursements.map((d) => d.disbursed_amount ?? 0);
    let total = amounts.reduce((t, a) => {
      return t + a;
    }, 0);

    return formatMoney(total);
  },
  assessedAmount(state) {
    let totalEquipment = 0;
    for (let item of state.equipment) {
      totalEquipment += item.approve_amount;
    }

    let totalServices = 0;
    for (let item of state.services) {
      totalServices += item.approve_amount;
    }

    return formatMoney(totalEquipment + totalServices);
  },
  netAmount(state, getters) {
    return formatMoney(getters.netAmountRaw);
  },
  netAmountRaw(state, getters) {
    let rawVal =
      parse(getters.assessedAmount, { currency: "usd" }) - parse(getters.previousDisbursements, { currency: "usd" });
    if (rawVal > 0 && rawVal < 100) return 100.0;
    return Object.is(Math.round(rawVal), -0) ? 0 : Math.round(rawVal);
  },
};
const mutations = {
  SET_FUNDINGREQUEST(state, value) {
    state.fundingRequest = value;
  },
  SET_ASSESSMENT(state, value) {
    state.assessment = value;
  },
  SET_DISBURSEMENTS(state, value) {
    for (let v of value) {
      v.due_date = v.due_date ? moment.utc(v.due_date).format("YYYY-MM-DD") : undefined;
      v.issue_date = v.issue_date ? moment.utc(v.issue_date).format("YYYY-MM-DD") : undefined;
    }

    state.disbursements = value;
  },
  SET_EQUIPMENT(state, value) {
    state.equipment = value ?? [];
  },
  SET_SERVICES(state, value) {
    state.services = value ?? [];
  },
};
const actions = {
  async initialize(store, app) {
    console.log("Initializing CSGDSE Store");
    store.dispatch("loadCSGDSEAssessment", { id: app.id, refreshChild: true });

    store.commit(
      "SET_EQUIPMENT",
      (app.disability_equipments ?? []).filter((e) => e.verified_equipment_need)
    );
    store.commit(
      "SET_SERVICES",
      (app.disability_services ?? []).filter((s) => s.verified_service_need)
    );
  },

  loadCSGDSEAssessment({ commit, state }, { id }) {
    axios.get(`${CSG_THRESHOLD_URL}/csgdse/${id}`).then((resp) => {
      commit("SET_FUNDINGREQUEST", resp.data.data.funding_request);
      commit("SET_DISBURSEMENTS", resp.data.data.disbursements);

      if (resp.data.data.assessment) {
        let assessment = resp.data.data.assessment;
        assessment.assessed_date = moment.utc(assessment.assessed_date).format("YYYY-MM-DD");

        commit("SET_ASSESSMENT", resp.data.data.assessment);
      } else {
        let assessment = {
          assessed_date: moment().format("YYYY-MM-DD"),
          student_contrib_exempt: false,
          spouse_contrib_exempt: false,
          student_contribution_review: false,
          spouse_contribution_review: false,
          parent_contribution_review: false,
        };
        commit("SET_ASSESSMENT", assessment);
      }
    });
  },

  async recalculate({ state, dispatch, commit }) {
    dispatch("loadCSGDSEAssessment", { id: state.fundingRequest.application_id, refreshChild: false }).then(() => {
      let assessment = {
        id: state.assessment.id,
        assessed_date: moment().format("YYYY-MM-DD"),
      };

      commit("SET_ASSESSMENT", assessment);
      dispatch("save");
    });
  },

  async makeDisbursements({ getters, commit, state, dispatch }, numberOfDisbursements) {
    let parts = getters.netAmountRaw / numberOfDisbursements;
    let disbursedValues = [];

    let total = 0;

    for (let i = 0; i < numberOfDisbursements - 1; i++) {
      let amount = parse(formatMoney(parts), { currency: "usd" });
      total += amount;

      disbursedValues.push({
        disbursed_amount: amount,
        disbursement_type_id: 1,
        issue_date: moment().format("YYYY-MM-DD"), // today
      });
    }

    let remainder = parse(formatMoney(getters.netAmountRaw - total), { currency: "usd" });

    disbursedValues.push({
      disbursed_amount: remainder,
      disbursement_type_id: 1,
      issue_date: moment().format("YYYY-MM-DD"),
    });

    commit("SET_DISBURSEMENTS", [...state.disbursements, ...disbursedValues]);

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
      disbursement_type_id: 1,
      issue_date: moment().format("YYYY-MM-DD"), // today
    });
  },

  async save({ state, dispatch }) {
    state.assessment.disbursements = state.disbursements;

    if (state.fundingRequest.id) {
      if (state.assessment.id) {
        return axios
          .put(
            `${CSG_THRESHOLD_URL}/csgftdep/${state.fundingRequest.application_id}/funding-request/${state.fundingRequest.id}/assessment/${state.assessment.id}`,
            state.assessment
          )
          .then((resp) => {
            dispatch("loadCSGDSEAssessment", { id: state.fundingRequest.application_id });
          });
      } else {
        return axios
          .post(
            `${CSG_THRESHOLD_URL}/csgftdep/${state.fundingRequest.application_id}/funding-request/${state.fundingRequest.id}/assessment`,
            state.assessment
          )
          .then((resp) => {
            dispatch("loadCSGDSEAssessment", { id: state.fundingRequest.application_id });
          });
      }
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

function formatMoney(input) {
  if (isNumber(input)) {
    return Intl.NumberFormat("en", {
      currency: "USD",
      style: "currency",
    }).format(input);
  }

  return "";
}
