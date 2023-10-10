import axios from "axios";
import { STUDY_AREA } from "@/urls";

const state = {
  studyAreas: [],
};
const getters = {
  studyAreas(state) {
    return state.studyAreas;
  },
};
const mutations = {
  async SET_STUDY_AREAS(state, value) {
    state.studyAreas = value;
  },
};
const actions = {
  async setStudyAreas(state, value = true) {
    await axios.get(STUDY_AREA + "?filter=" + value).then((res) => {
      state.commit("SET_STUDY_AREAS", [...res.data.data]);
    });
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
};
