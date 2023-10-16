import axios from "axios";
import moment from "moment";
import _, { isEmpty } from "lodash";
import { DISBURSEMENT, APPLICATION_URL } from "@/urls";

const state = {
  disbursements: [],
  previewDisbursementList: [],
  isPreviewCharged: false,
};
const getters = {
  disbursements: (state) => state.disbursements,
  isPreviewCharged: (state) => state.isPreviewCharged,
  previewDisbursementList: (state) => state.previewDisbursementList,
};
const mutations = {
  SET_DISBURSEMENTS(state, value) {
    for (let item of value) {
      if (!isEmpty(item.due_date)) item.due_date = moment.utc(item.due_date).format("YYYY-MM-DD");
      if (!isEmpty(item.issue_date)) item.issue_date = moment.utc(item.issue_date).format("YYYY-MM-DD");
    }

    state.disbursements = value;
  },
  SET_IS_PREVIEW_CHARGED(state, value) {
    state.isPreviewCharged = value;
  },
  SET_PREVIEW_DISBURSEMENT_LIST(state, value) {
    state.previewDisbursementList = value;
  },
};

const actions = {
  setIsPreviewCharged(state, vals) {
    state.commit("SET_IS_PREVIEW_CHARGED", vals);
    state.commit("SET_PREVIEW_DISBURSEMENT_LIST", []);
  },
  addItemPreviewDisbursementList(state, vals) {
    state.commit("SET_PREVIEW_DISBURSEMENT_LIST", [
      ...state.state.previewDisbursementList,
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
    state.commit("SET_IS_PREVIEW_CHARGED", true);
  },
  cancelItemPreviewDisbursementList(state, vals) {
    const previewList = [...state.state.previewDisbursementList];

    if (vals?.index > -1) {
      previewList.splice(vals.index, 1);
    }
    if (!previewList.length) {
      this.dispatch("setIsPreviewCharged", false);
    } else {
      state.commit("SET_PREVIEW_DISBURSEMENT_LIST", [...previewList]);
    }
  },
  async backDisbursement(state, list) {
    try {
      state.commit("SET_DISBURSEMENTS", list);
    } catch (error) {
      console.log("Error to set disbursements", error);
    } finally {
    }
  },
  async getDisbursements(state, vals) {
    try {
      if (!vals?.funding_request_id) {
        return;
      }

      const res = await axios.get(DISBURSEMENT + `/funding-request/${vals.funding_request_id}/`);

      if (res?.data?.success) {
        const data = res?.data?.data || [];
        state.commit("SET_DISBURSEMENTS", data);
      } else {
        console.log("Error to get disbursements");
      }
    } catch (error) {
      console.log("Error to get disbursements", error);
    } finally {
      this.dispatch("getAssessments", {
        application_id: vals?.application_id,
        funding_request_id: vals.funding_request_id,
      });
    }
  },
  async previewYEADisbursements(state, vals) {
    try {
      const thisVal = vals?.thisVal || {};

      if (!vals?.data && !vals.application_id && !vals?.assessment_id) {
        return;
      }
      const assessmentData = {};

      for (const key in vals?.data) {
        if (!vals.data[key] && vals.data[key] !== 0) {
          assessmentData[key] = null;
        } else {
          assessmentData[key] = vals.data[key];
        }
      }

      const res = await axios.post(
        APPLICATION_URL + `/${vals.application_id}/assessment/${vals.assessment_id}/disburse-yea`,
        { data: { ...assessmentData } }
      );

      const message = res?.data?.messages[0];

      if (message?.variant === "success") {
        const data = res?.data?.data || [];
        state.commit("SET_PREVIEW_DISBURSEMENT_LIST", [...data]);
        state.commit("SET_IS_PREVIEW_CHARGED", true);
        thisVal?.$emit("showSuccess", "Correct Disburse");
        console.log("🚀 ~ file: disbursement.js:168 ~ previewDisbursements ~ thisVal:", thisVal);
        thisVal?.refreshData();
      } else {
        thisVal?.$emit("showError", message.text || "Error to get Disburse");
      }
    } catch (error) {
      console.log("Error to get disbursements", error);
    } finally {
    }
  },
  async previewDisbursements(state, vals) {
    try {
      const thisVal = vals?.thisVal || {};
      if (!vals?.data && !vals.application_id && !vals?.assessment_id) {
        return;
      }
      const assessmentData = {};

      for (const key in vals?.data) {
        if (!vals.data[key] && vals.data[key] !== 0) {
          assessmentData[key] = null;
        } else {
          assessmentData[key] = vals.data[key];
        }
      }

      const over_award_flag =
        !!assessmentData?.over_award_applied_flg === false || assessmentData?.over_award_applied_flg === "No"
          ? "No"
          : "Yes";

      const res = await axios.post(
        APPLICATION_URL + `/${vals.application_id}/assessment/${vals.assessment_id}/disburse`,
        { data: { ...assessmentData, over_award_applied_flg: over_award_flag } }
      );

      const message = res?.data?.messages[0];

      if (message?.variant === "success") {
        const data = res?.data?.data || [];

        state.commit("SET_PREVIEW_DISBURSEMENT_LIST", [...data, ...state.getters.previewDisbursementList]);
        state.commit("SET_IS_PREVIEW_CHARGED", true);
        thisVal?.$emit("showSuccess", "Correct Disburse");
        thisVal?.refreshData();
      } else {
        thisVal?.$emit("showError", message.text || "Error to get Disburse");
      }
    } catch (error) {
      console.log("Error to get disbursements", error);
    } finally {
    }
  },
  async postDisbursement(state, vals) {
    const emiter = vals?.emiter || {};
    try {
      if (!vals?.data) {
        return;
      }

      if (vals?.isList === "disburseList" && vals.data) {
        const data = vals.data.map((d) => {
          delete d.issue_date_menu;
          delete d.due_date_menu;
          return { ...d, funding_request_id: vals.funding_request_id };
        });
        const res = await axios.post(DISBURSEMENT, {
          data: [...data],
          isList: vals.isList,
        });

        if (res?.data?.success) {
          emiter?.$emit("showSuccess", "Added!");
          emiter?.setShow(false);
          emiter.$emit("blockDisburse", false);
        } else {
          emiter?.$emit("showError", res.data?.message || "Fail to added");
        }
      } else {
        const data = vals.data;
        delete data.issue_date_menu;
        delete data.due_date_menu;
        const res = await axios.post(DISBURSEMENT, { data: data });

        if (res?.data?.success) {
          emiter?.$emit("showSuccess", "Added!");
          emiter?.setShow(false);
        } else {
          emiter?.$emit("showError", res.data?.message || "Fail to added");
        }
      }
    } catch (error) {
      console.log("Error to insert disbursement", error);
    } finally {
      if (Array.isArray(vals.data)) {
        this.dispatch("setIsPreviewCharged", false);
        this.dispatch("getDisbursements", {
          application_id: vals?.application_id,
          funding_request_id: vals?.funding_request_id,
        });
      }
      if (!vals?.data?.funding_request_id) {
        return;
      }
      this.dispatch("getDisbursements", {
        application_id: vals?.application_id,
        funding_request_id: vals?.data?.funding_request_id,
      });
    }
  },
  async updateDisbursement(state, vals) {
    try {
      const emiter = vals?.emiter || {};

      if (!vals?.data) {
        return;
      }
      if (!vals?.disbursement_id) {
        return;
      }

      const data = vals.data;
      delete data.issue_date_menu;
      delete data.due_date_menu;

      const res = await axios.patch(DISBURSEMENT + "/" + vals.disbursement_id, { data });

      if (res?.data?.success) {
        emiter.$emit("showSuccess", "Added!");
        emiter.currentEditing = null;
        emiter.$emit("blockDisburse", false);
      } else {
        emiter.$emit("showError", res.data?.message || "Fail to added");
      }
    } catch (error) {
      console.log("Error to insert disbursement", error);
    } finally {
      const emiter = vals?.emiter || {};
      if (!vals?.funding_request_id) {
        return;
      }
      this.dispatch("getDisbursements", vals);
    }
  },
  async removeDisbursement(state, vals) {
    try {
      const emiter = vals?.emiter || {};

      if (!vals?.disbursement_id) {
        return;
      }

      const res = await axios.delete(DISBURSEMENT + "/" + vals.disbursement_id);

      if (res?.data?.success) {
        emiter.$emit("showSuccess", "Deleted!");
        emiter.currentEditing = null;
        emiter.$emit("blockDisburse", false);
      } else {
        emiter.$emit("showError", res.data?.message || "Fail to delete");
      }
    } catch (error) {
      console.log("Error to delete disbursement", error);
    } finally {
      const emiter = vals?.emiter || {};
      if (!vals?.funding_request_id) {
        return;
      }
      this.dispatch("getDisbursements", vals);
    }
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
};
