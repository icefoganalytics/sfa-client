import axios from "axios";
import { ADMIN_CATALOG_URL } from "@/urls";

const state = {
  catalogOptions: [
    {
      text: "CSG Lookup",
      url: `${ADMIN_CATALOG_URL}/csg_lookup`,
      headers: [
        { text: "Id", value: "id", type: "text" },
        { text: "academic_year_id", value: "academic_year_id" },
        { text: "csg_8_month_amount", value: "csg_8_month_amount", type: "text" },
        { text: "csg_dep_monthly_amount", value: "csg_dep_monthly_amount", type: "text" },
        { text: "csg_pd_yearly_amount", value: "csg_pd_yearly_amount", type: "text" },
        { text: "csg_pdse_yearly_amount", value: "csg_pdse_yearly_amount", type: "text" },
        { text: "csgpt_yearly_amount", value: "csgpt_yearly_amount", type: "text" },
        { text: "csgpt_dep_max_amount", value: "csgpt_dep_max_amount", type: "text" },
        { text: "csgpt_dep_1_2_weekly_amount", value: "csgpt_dep_1_2_weekly_amount", type: "text" },
        { text: "csgpt_dep_3_weekly_amount", value: "csgpt_dep_3_weekly_amount", type: "text" },
      ],
    },
    {
      text: "CSG Threshold",
      url: `${ADMIN_CATALOG_URL}/csg_threshold`,
      headers: [
        { text: "id", value: "id" },
        { text: "academic_year_id", value: "academic_year_id" },
        { text: "family_size", value: "family_size" },
        { text: "income_threshold", value: "income_threshold" },
        { text: "income_cutoff", value: "income_cutoff" },
        { text: "phase_out_rate", value: "phase_out_rate" },
        { text: "low_income_threshold", value: "low_income_threshold" },
        { text: "middle_income_threshold", value: "middle_income_threshold" },
        { text: "csgpt_phase_out_rate", value: "csgpt_phase_out_rate" },
        { text: "csgpt_dep2_phase_out_rate", value: "csgpt_dep2_phase_out_rate" },
        { text: "csgpt_dep3_phase_out_rate", value: "csgpt_dep3_phase_out_rate" },
        { text: "csgft_dep_phase_out_rate", value: "csgft_dep_phase_out_rate" },
      ],
    },
    {
      text: "CSL Lookup",
      url: `${ADMIN_CATALOG_URL}/csl_lookup`,
      headers: [
        { text: "id", value: "id" },
        { text: "academic_year_id", value: "academic_year_id" },
        { text: "return_transport_max_amount", value: "return_transport_max_amount" },
        { text: "allowable_weekly_amount", value: "allowable_weekly_amount" },
        { text: "student_exempt_amount", value: "student_exempt_amount" },
        { text: "vehicle_deduction_amount", value: "vehicle_deduction_amount" },
        { text: "rrsp_deduction_yearly_amount", value: "rrsp_deduction_yearly_amount" },
        { text: "relocation_max_amount", value: "relocation_max_amount" },
        { text: "mileage_rate", value: "mileage_rate" },
        { text: "discretionary_costs_max_amount", value: "discretionary_costs_max_amount" },
        { text: "merit_exempt_amount", value: "merit_exempt_amount" },
        { text: "books_max_amount", value: "books_max_amount" },
        { text: "student_contrib_percent", value: "student_contrib_percent" },
        { text: "spouse_contrib_percent", value: "spouse_contrib_percent" },
        { text: "csg_8_month_amount", value: "csg_8_month_amount" },
        { text: "csg_pt_yearly_amount", value: "csg_pt_yearly_amount" },
        { text: "low_income_student_contrib_amount", value: "low_income_student_contrib_amount" },
        { text: "student_contrib_max_amount", value: "student_contrib_max_amount" },
        { text: "csl_pt_max_amount", value: "csl_pt_max_amount" },
        { text: "csl_pt_wk_misc_amount", value: "csl_pt_wk_misc_amount" },
      ],
    },
    {
      text: "Standard of Living",
      url: `${ADMIN_CATALOG_URL}/standard_of_living`,
      headers: [
        { text: "id", value: "id" },
        { text: "academic_year_id", value: "academic_year_id" },
        { text: "province_id", value: "province_id" },
        { text: "family_size", value: "family_size" },
        { text: "standard_living_amount", value: "standard_living_amount" },
      ],
    },
    {
      text: "Student Living Allowance",
      url: `${ADMIN_CATALOG_URL}/student_living_allowance`,
      headers: [
        { text: "id", value: "id" },
        { text: "academic_year_id", value: "academic_year_id" },
        { text: "province_id", value: "province_id" },
        { text: "student_category_id", value: "student_category_id" },
        { text: "shelter_amount", value: "shelter_amount" },
        { text: "food_amount", value: "food_amount" },
        { text: "misc_amount", value: "misc_amount" },
        { text: "public_tranport_amount", value: "public_tranport_amount" },
      ],
    },
    {
      text: "Child Care Ceiling",
      url: `${ADMIN_CATALOG_URL}/child_care_ceiling`,
      headers: [
        { text: "id", value: "id" },
        { text: "academic_year_id", value: "academic_year_id" },
        { text: "province_id", value: "province_id" },
        { text: "max_amount", value: "max_amount" },
      ],
    },
  ],
  selectedCatalog: undefined,
  selectedCatalogResults: undefined,
};
const getters = {};
const mutations = {
  SET_SELECTEDCATALOG(state, value) {
    if (state.selectedCatalog && state.selectedCatalog.text != value.text) {
      state.selectedCatalogResults = [];
    }

    state.selectedCatalog = value;
  },
  SET_CATALOGRESULTS(state, value) {
    state.selectedCatalogResults = value;
  },
};
const actions = {
  async setCatalog({ commit, dispatch }, value) {
    commit("SET_SELECTEDCATALOG", value);
    dispatch("loadCatalog");
  },
  async loadCatalog({ commit, state }) {
    if (state.selectedCatalog) {
      let url = state.selectedCatalog.url;

      if (url) {
        axios.get(`${url}`).then((resp) => {
          commit("SET_CATALOGRESULTS", resp.data.data);
        });
      }
    }
  },
  async saveCatalog({ commit, state, dispatch }, item) {
    if (state.selectedCatalog) {
      let url = state.selectedCatalog.url;

      if (url) {
        if (item.id && item.id > -1) {
          const id = item.id;
          delete item.id;

          return axios
            .put(`${url}/${id}`, item)
            .then((resp) => {
              dispatch("loadCatalog");
              return resp.data;
            })
            .catch((resp) => {
              console.log("CATCH", resp.response.data);
              return resp.response.data.data;
            });
        } else {
          delete item.id;
          return axios
            .post(`${url}`, item)
            .then((resp) => {
              dispatch("loadCatalog");
              return resp.data;
            })
            .catch((resp) => {
              console.log("CATCH", resp.response.data);
              return resp.response.data.data;
            });
        }
      }
    }

    return "Problem";
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
