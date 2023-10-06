import axios from "axios";
import { MARITAL_STATUS } from "@/urls";

const state = {
  maritalStatusList: [],
};
const getters = {
  maritalStatusList(state) {
    return state.maritalStatusList;
  },
};
const mutations = {
  async SET_MARITAL_STATUS_LIST(state, value) {
    state.maritalStatusList = value;
  },
};
const actions = {
  async setMaritalStatusList(state, value = true) {
    axios.get(MARITAL_STATUS + "?filter=" + value).then((res) => {
      state.commit("SET_MARITAL_STATUS_LIST", [...res.data.data]);
    });
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
};
