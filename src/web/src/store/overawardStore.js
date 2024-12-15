import axios from "axios";
import { OVERAWARD_URL } from "@/urls";

const state = {
  studentId: 0,
  overawards: [],
  netOveraward: 0,
};
const getters = {
  flaggedCount: (state) => state.communication.filter((f) => f.show_alert).length,
  activeOnly: (state) => state.activeOnly,
};
const actions = {
  async load({ state, commit }, { studentId }) {
    state.studentId = studentId;
    axios
      .get(`${OVERAWARD_URL}/${studentId}`)
      .then((resp) => {
        commit("SET_OVERAWARDS", resp.data);
      })
      .catch(() => {
        commit("SET_OVERAWARDS", []);
      });
  },
  add({ state }, { amount, academic_year_id, note }) {
    return axios
      .post(`${OVERAWARD_URL}/${state.studentId}`, { amount, academic_year_id, note })
      .then(() => {})
      .catch(() => {});
  },
  update({ state, dispatch }, overaward) {
    return axios
      .put(`${OVERAWARD_URL}/${state.studentId}/${overaward.id}`, overaward)
      .then(() => {})
      .catch(() => {});
  },

  delete({ state, dispatch }, { id }) {
    return axios
      .delete(`${OVERAWARD_URL}/${state.studentId}/${id}`)
      .then(() => {})
      .catch(() => {
        commit("SET_OVERAWARDS", []);
      });
  },
};
const mutations = {
  SET_OVERAWARDS(state, data) {
    state.overawards = data.data;
    state.netOveraward = data.netOveraward;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
