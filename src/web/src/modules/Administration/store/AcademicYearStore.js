import axios from "axios";
import moment from "moment";
import { ACADEMIC_YEAR_URL } from "@/urls";
import { clone, isArray, isEmpty } from "lodash";

const state = {
  academicYears: [],
  academicYear: null,
  currentAcademicYear: null,
};

const mutations = {
  SET_ACADEMICYEARS(state, value) {
    if (value && isArray(value)) {
      value.map((v) => {
        v.start_date = formatDate(v.start_date);
        v.end_date = formatDate(v.end_date);
      });
    }

    state.academicYears = value;

    state.currentAcademicYear = state.academicYears.find((y) => {
      return moment().isBetween(moment.utc(y.start_date), moment.utc(y.end_date));
    }).id;
  },
  SET_ACADEMICYEAR(state, value) {
    state.academicYear = value;
  },
};

const actions = {
  async loadAcademicYears({ commit }) {
    return axios.get(`${ACADEMIC_YEAR_URL}?filter=All`).then((resp) => {
      commit("SET_ACADEMICYEARS", resp.data.data);
    });
  },

  async select({ commit }, year) {
    commit("SET_ACADEMICYEAR", clone(year));
  },

  async save({ state, dispatch }) {
    return axios.put(`${ACADEMIC_YEAR_URL}/${state.academicYear.id}`, state.academicYear).then((resp) => {
      dispatch("loadAcademicYears");
      return resp.data;
    });
  },

  getContainingYear({ state }, input) {
    if (input && state.academicYears && isArray(state.academicYears)) {
      return state.academicYears.find((y) => moment.utc(input).isBetween(y.start_date, y.end_date, "day", "[]"));
    }
    return null;
  },
};

function formatDate(input) {
  if (isEmpty(input)) return "";
  return moment.utc(input).format("YYYY-MM-DD");
}

export default {
  state,
  mutations,
  actions,
  namespaced: true,
};
