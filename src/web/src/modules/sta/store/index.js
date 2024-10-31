import axios from "axios";
import _ from "lodash";
import { ASSESSMENT } from "@/urls";

const state = {
  assessmentSTA: {},
  disbursementListSTA: [],
};
const getters = {
  assessmentSTA: (state) => state.assessmentSTA,
  disbursementListSTA: (state) => state.disbursementListSTA,
};
const mutations = {
  SET_ASSESSMENT_STA(state, value) {
    state.assessmentSTA = value;
  },
  SET_DISBURSEMENT_LIST_STA(state, value) {
    state.disbursementListSTA = value;
  },
};

const actions = {
  resetAssessmetSTA(state) {
    state.commit("SET_ASSESSMENT_STA", {});
    state.commit("SET_DISBURSEMENT_LIST_STA", []);
  },
  async staGetAssessment(state, vals) {
    try {
      if (!vals?.funding_request_id) {
        return;
      }

      const res = await axios.get(ASSESSMENT + `/sta/assess-info/${vals.funding_request_id}`);
      console.log("GET ASSSESS", res);
      const success = res?.data?.success;

      if (success) {
        const data = res?.data?.data || {};
        state.commit("SET_ASSESSMENT_STA", { ...data });
        if (data?.id) {
          state.dispatch("staGetDisbursements", { assessment_id: data.id });
        }
      } else {
        console.log("Error to get assessments");
      }
    } catch (error) {
      console.log("Error to get assessments", error);
    } finally {
    }
  },
  async staGetDisbursements(state, vals) {
    try {
      if (!vals?.assessment_id) {
        return;
      }

      const res = await axios.get(ASSESSMENT + `/sta/disbursements/${vals.assessment_id}`);
      console.log("GET disbursements", res);
      const success = res?.data?.success;

      if (success) {
        const data = res?.data?.data || [];
        state.commit("SET_DISBURSEMENT_LIST_STA", [...data]);
      } else {
        console.log("Error to get disbursements");
      }
    } catch (error) {
      console.log("Error to get disbursements", error);
    } finally {
    }
  },
  async recalcSTA({ commit, getters }, vals) {
    try {
      const assessment = getters.assessmentSTA;
      const disbursementList = getters.disbursementListSTA;

      if (!assessment?.funding_request_id) {
        return;
      }

      const res = await axios.post(`${ASSESSMENT}/sta/${assessment.funding_request_id}/recalc`, {
        disbursementList,
        assessment_id: assessment?.id,
      });
      console.log("GET recalc", res);
      const success = res?.data?.success;

      if (success) {
        const data = res?.data?.data || {};
        commit("SET_ASSESSMENT_STA", { ...assessment, ...data });
      } else {
        console.log("Error to get assessments");
      }
    } catch (error) {
      console.log("Error to get assessments", error);
    } finally {
    }
  },
  async refreshSTA({ commit, getters }, vals) {
    try {
      console.log("getters");
      const assessment = getters.assessmentSTA;
      const disbursementList = getters.disbursementListSTA;
      const application_id = getters?.selectedApplication?.id;

      const res = await axios.post(`${ASSESSMENT}/sta/refreshdata`, {
        disbursementList,
        assessmentData: assessment,
        application_id,
      });
      const success = res?.data?.success;

      if (success) {
        const data = res?.data?.data || {};
        commit("SET_ASSESSMENT_STA", { ...assessment, ...data });
      } else {
        console.log("Error to get assessments");
      }
    } catch (error) {
      console.log("Error to get assessments", error);
    } finally {
    }
  },
  async disburseSTA({ commit, getters, dispatch }, vals) {
    try {
      const assessment = getters.assessmentSTA;
      const disbursements = getters.disbursementListSTA;
      const application_id = getters.selectedApplication.id;

      const res = await axios.post(`${ASSESSMENT}/sta/disburse`, {
        assessment: assessment,
        application_id: application_id,
      });
      const success = res?.data?.success;

      if (success) {
        const data = res?.data?.data || [];
        if (data?.length > 0) {
          commit("SET_DISBURSEMENT_LIST_STA", [...disbursements, ...data]);
        }
        dispatch("refreshSTA");
      } else {
        console.log("Error to get disburse");
      }
    } catch (error) {
      console.log("Error to get disburse", error);
    }
  },
  addItemDisbursementListSTA({ commit, state }, vals) {
    commit("SET_DISBURSEMENT_LIST_STA", [
      ...state.disbursementListSTA,
      {
        disbursement_type_id: null,
        disbursed_amount: 0,
        due_date: null,
        tax_year: null,
        issue_date: null,
        transaction_number: null,
        change_reason_id: null,
        financial_batch_id: null,
      },
    ]);
  },
  cancelItemDisbursementListSTA({ commit, state, dispatch }, vals) {
    const previewList = [...state.disbursementListSTA];

    if (vals?.index > -1) {
      previewList.splice(vals.index, 1);
    }
    commit("SET_DISBURSEMENT_LIST_STA", [...previewList]);
    dispatch("refreshSTA");
  },
  async saveSTAAssessment({ getters, dispatch }, vm) {
    const assessment = getters.assessmentSTA;
    const disbursementList = getters.disbursementListSTA;

    const body = {
      assessment,
      disbursementList,
    };

    let resAction = undefined;

    if (assessment?.id) {
      resAction = await axios.put(`${ASSESSMENT}/sta/${assessment.id}`, body);
    } else {
      resAction = await axios.post(`${ASSESSMENT}/sta`, body);
    }

    const message = resAction?.data?.messages[0];

    if (message?.variant === "success") {
      vm.$emit("showSuccess", message.text);
      dispatch("staGetAssessment", { funding_request_id: assessment.funding_request_id });
      if (vm?.setClose && vm.showAdd) {
        vm.setClose();
      }
      if (!vm?.filteredList) {
        vm.newRecord = {};
      }
    } else {
      vm.$emit("showError", message.text);
      dispatch("staGetAssessment", { funding_request_id: assessment.funding_request_id });
      if (vm?.setClose && vm.showAdd) {
        vm.setClose();
      }
      if (!vm?.filteredList) {
        vm.newRecord = {};
      }
    }
  },
  async removeSTADisbursement({ getters }, vals) {
    try {
      const assessment = getters.assessmentSTA;

      const vm = vals?.vm || {};

      if (!vals?.disbursement_id) {
        return;
      }

      const res = await axios.delete(ASSESSMENT + "/sta/disbursements/" + vals.disbursement_id);

      if (res?.data?.success) {
        vm?.$emit("showSuccess", "Deleted!");
        this.dispatch("cancelItemDisbursementListSTA", { index: vals.index });
      } else {
        vm.$emit("showError", res.data?.message || "Fail to delete");
      }
    } catch (error) {
      console.log("Error to delete disbursement", error);
    }
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
};
