import Vue from "vue";
import Vuex from "vuex";
import moment from "moment";

// Stores
import auth from "./auth";
import profile from "./profile";
import institution from "./institution";

// Modules
import student from "@/modules/student/store";
import province from "@/modules/province/store";
import countries from "@/modules/countries/store";
import cities from "@/modules/cities/store";
import addressType from "@/modules/address-type/store";
import indigenousLearner from "@/modules/indigenous-learner/store";
import Language from "@/modules/language/store";
import maritalStatus from "@/modules/marital-status/store";
import studyField from "@/modules/study-field/store";
import parentalRelationship from "@/modules/parental-relationship/store";
import firstNation from "@/modules/first-nation/store";
import portalStatus from "@/modules/portal-status/store";
import sex from "@/modules/sex/store";
import studentCategory from "@/modules/student-category/store";
import institutionLevel from "@/modules/institution-level/store";
import ageDistribution from "@/modules/age-distribution/store";
import applicationType from "@/modules/application-type/store";
import highSchool from "@/modules/high-school/store";
import assessmentType from "@/modules/assessment-type/store";
import batchGroup from "@/modules/batch-group/store";
import educationLevel from "@/modules/education-level/store";
import reasonsForChange from "@/modules/reasons-for-change/store";
import disbursementType from "@/modules/disbursement-type/store";
import status from "@/modules/status/store";
import statusReason from "@/modules/status-reason/store";
import yukonGrantEligibility from "@/modules/yukon-grant-eligibility/store";
import fundingGroup from "@/modules/funding-group/store";
import disabilityType from "@/modules/disability-type/store";
import aboriginalStatus from "@/modules/aboriginal-status/store";
import disabilityService from "@/modules/disability-service/store";
import relationships from "@/modules/relationship/store";
import studyArea from "@/modules/study-area/store";
import program from "@/modules/program/store";
import cslClassification from "@/modules/csl-classification/store";
import cslCode from "@/modules/csl-code/store";
import cslCertificateExport from "@/modules/csl-certificate-export/store";
import cslMsfaaReceive from "@/modules/csl-msfaa-receive/store";
import cslReason from "@/modules/csl-reason/store";
import inSchoolStatus from "@/modules/in-school-status/store";
import communicationType from "@/modules/communication-type/store";
import requestType from "@/modules/request-type/store";
import accommodationType from "@/modules/accommodation-type/store";
import requirementType from "@/modules/requirement-type/store";
import citizenship from "@/modules/citizenship/store";
import prestudyEmploymentStatus from "@/modules/prestudy-employment-status/store";
import academicYear from "@/modules/academic-year/store";
import agency from "@/modules/agency/store";
import instructionType from "@/modules/instruction-type/store";
import attendance from "@/modules/attendance/store";
import programDivision from "@/modules/program-division/store";
import documentStatus from "@/modules/income-type/store";
import incomeType from "@/modules/document-status/store";
import expenseCategory from "@/modules/expense-category/store";
import equipmentCategory from "@/modules/equipment-category/store";
import changeReason from "@/modules/change-reason/store";
import chequeReqList from "@/modules/cheque-req-list/store";
import assessment from "./assessment";
import disbursement from "./disbursement";
import adminCrud from "./adminCrud";
import officers from "@/modules/officer/store";

// DTO Modules
import cslft from "@/modules/cslft/store";
import csgft from "@/modules/csgft/store";
import sta from "@/modules/sta/store";

// Assessment Stores
import csgDisabilityStore from "../components/application/assessments/store/csg-disability";
import csgDependentStore from "../components/application/assessments/store/csg-dependent";
import csgMatureStore from "../components/application/assessments/store/csg-mature";
import csgFullTimeStore from "../components/application/assessments/store/csg-full-time";
import csgDisabilitySEStore from "../components/application/assessments/store/csg-disability-se";
import cslPartTimeStore from "../components/application/assessments/store/csl-part-time";
import csgPartTimeStore from "../components/application/assessments/store/csg-part-time";
import csgPartTimeDependentStore from "../components/application/assessments/store/csg-part-time-dependent";
import csgPartTimeDisabilityStore from "../components/application/assessments/store/csg-part-time-disability";

import cslFullTimeStore from "../components/application/assessments/store/csl-full-time";

import sfaScholarshipArmyStore from "../components/application/assessments/store/sfa-scholarship-army";
import sfaScholarshipHarachStore from "../components/application/assessments/store/sfa-scholarship-harach";
import sfaScholarshipHuskysStore from "../components/application/assessments/store/sfa-scholarship-huskys";
// Administration Stores
import reportsStore from "@/modules/Administration/store/ReportsStore";
import academicYearStore from "@/modules/Administration/store/AcademicYearStore";

import communicationStore from "./communicationStore";

// Config
import axios from "axios";
import { APPLICATION_URL, STUDENT_URL } from "../urls";
import router from "@/router";
import { isEmpty, isUndefined } from "lodash";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    showAppSidebar: false,
    showSideBarAdmin: false,
    selectedStudentFullName: "",
    selectedStudentLocator: "",
    selectedStudent: { applications: [] },
    selectedStudentId: 0,
    selectedApplication: {},
    selectedApplicationId: 0,
    recentStudents: [],
    recentApplications: [],
    newApplications: [],
    yearOptions: [],
    monthOptions: [],
    flagOptions: [],
    flagMatches: [],
    documentation: [],
  },
  getters: {
    showAppSidebar: (state) => state.showAppSidebar,
    showSideBarAdmin: (state) => state.showSideBarAdmin,
    selectedStudent: (state) => state.selectedStudent,
    selectedApplication: (state) => state.selectedApplication,
    recentStudents: (state) => state.recentStudents,
    recentApplications: (state) => state.recentApplications,
    newApplications: (state) => state.newApplications,
    yearOptions: (state) => state.yearOptions,
    monthOptions: (state) => state.monthOptions,
    applicationFlags(state) {
      if (state.selectedApplication && !isEmpty(state.selectedApplication.flags))
        return state.selectedApplication.flags.split(",");
      return [];
    },
  },
  mutations: {
    SET_MONTH_OPTIONS(state, value) {
      state.monthOptions = value;
    },
    SET_YEAR_OPTIONS(state, value) {
      state.yearOptions = value;
    },
    SET_SIDEBAR(state, value) {
      state.showAppSidebar = value;
    },
    SET_SIDEBAR_ADMIN(state, value) {
      state.showSideBarAdmin = value;
    },
    SET_APPLICATION(state, value) {
      state.selectedApplication = value;
      state.selectedApplicationId = value.id;

      let currentRecentApplications = JSON.parse(localStorage.RECENT_APPLICATIONS ?? "[]");
      currentRecentApplications = currentRecentApplications.filter((r) => r.id != value.id); // take out current application
      currentRecentApplications = currentRecentApplications.slice(0, 9);
      localStorage.RECENT_APPLICATIONS = JSON.stringify([value, ...currentRecentApplications]);
    },
    SET_NEW_APPLICATIONS(state, value) {
      state.selectedApplication = value;
      state.selectedApplicationId = value.id;
    },
    CLEAR_APPLICATION(state) {
      state.selectedApplication = {};
      state.selectedApplicationId = 0;
    },
    SET_STUDENT(state, value) {
      state.selectedStudentFullName = `${value.first_name} ${value.last_name}`;
      state.selectedStudentLocator = value.locator_number;
      state.selectedStudentId = value.id;
      state.selectedStudent = value;

      if (!isUndefined(value)) {
        let currentRecentStudents = JSON.parse(localStorage.RECENT_STUDENTS ?? "[]");
        currentRecentStudents = currentRecentStudents.filter((r) => r.id != value.id); // take out current student
        currentRecentStudents = currentRecentStudents.slice(0, 9);
        localStorage.RECENT_STUDENTS = JSON.stringify([value, ...currentRecentStudents]);
      }

      let isRecent = state.recentStudents.filter((r) => r.id == value.id);

      if (isRecent.length == 0) {
        state.recentStudents.unshift(value);
      }
    },
    CLEAR_STUDENT(state) {
      state.selectedStudentFullName = "";
      state.selectedStudentLocator = "";
      state.selectedStudentId = 0;
      state.selectedStudent = {};
    },
    SET_FLAGOPTIONS(state, value) {
      state.flagOptions = value;
    },
    SET_FLAGMATCHES(state, value) {
      state.flagMatches = value;
    },
    SET_DOCUMENTATION(state, value) {
      if (value) {
        for (let doc of value) {
          doc.upload_date = !isEmpty(doc.upload_date)
            ? moment.utc(doc.upload_date).format("YYYY-MM-DD")
            : doc.upload_date;
          doc.status_date = !isEmpty(doc.status_date)
            ? moment.utc(doc.status_date).format("YYYY-MM-DD")
            : doc.status_date;
          doc.showThing = doc.status == "2";
        }
      }

      state.documentation = value;
    },
  },
  actions: {
    setAppSidebar(state, value) {
      state.commit("SET_SIDEBAR", value);
    },
    setAppSideBarAdmin(state, value) {
      state.commit("SET_SIDEBAR_ADMIN", value);
    },
    setYearOptions(state, value = 1950) {
      const options = [];
      const startYear = value;
      const currentYear = new Date().getFullYear();

      for (let i = currentYear; i >= startYear; i--) {
        options.push({ value: i, text: i.toString() });
      }

      state.commit("SET_YEAR_OPTIONS", options);
    },
    setMonthOptions(state) {
      const options = [];

      for (let i = 1; i <= 12; i++) {
        options.push({ value: i, text: i.toString() });
      }

      state.commit("SET_MONTH_OPTIONS", options);
    },
    setStudent(state, value) {
      state.commit("SET_STUDENT", value);
    },
    clearStudent(state) {
      state.commit("CLEAR_STUDENT");
      state.dispatch("communicationStore/clearStudentCommunication");
    },
    clearApplication(state) {
      state.commit("CLEAR_APPLICATION");
    },
    async loadApplication(state, id) {
      if (state.state.selectedApplicationId != id) state.commit("CLEAR_APPLICATION");

      return axios
        .get(`${APPLICATION_URL}/${id}`)
        .then((resp) => {
          if (!state.state.selectedStudent.id) {
            state.dispatch("loadStudent", resp.data.data.student_id);
          }
          state.commit("SET_APPLICATION", resp.data.data);
          //state.dispatch("loadDocumentation");
        })
        .catch((err) => {
          let recentList = JSON.parse(localStorage.RECENT_APPLICATIONS);
          recentList = recentList.filter((r) => r.id != id);
          localStorage.RECENT_APPLICATIONS = JSON.stringify(recentList);
          router.push("/dashboard");
        });
    },
    async loadNewApplications(state) {
      let resp = await axios.get(`${APPLICATION_URL}/all`);
      state.commit("SET_NEW_APPLICATION", resp.data.data);
    },
    async loadStudent(state, id) {
      if (state.state.selectedStudentId != id) state.commit("CLEAR_APPLICATION");

      let resp = await axios.get(`${STUDENT_URL}/${id}`);
      state.commit("SET_STUDENT", resp.data.data);

      state.dispatch("communicationStore/loadStudentCommunication", { studentId: id });
    },
    async loadDocumentation({ commit, state }) {
      axios.get(`${APPLICATION_URL}/${state.selectedApplicationId}/required-documents`).then((resp) => {
        commit("SET_DOCUMENTATION", resp.data.data);
      });
    },

    async updateStudent(state, vals) {
      const url = vals[6] !== undefined ? vals[6] : "";
      const isInsertion = vals[7] !== undefined ? vals[7] : false;
      let body = JSON.parse(`{"data": { "${vals[0]}": "${vals[1]}" }, "type": "${vals[2]}", "extraId": "${vals[3]}"}`);

      if (vals[1] === null) {
        body.data[vals[0]] = null;
      }

      if (isInsertion) {
        body = { ...body, data: vals[1] };
      }

      let emitter = vals[4];

      body = vals[5]?.length > 0 ? { ...body, addressType: vals[5] } : { ...body, addressType: null };

      try {
        if (isInsertion) {
          const resInsert = await axios.post(`${STUDENT_URL}/${state.state.selectedStudentId}${url}`, body);

          const message = resInsert?.data?.messages[0];

          if (message?.variant === "success") {
            emitter.$emit("showSuccess", message.text);
            if (emitter?.setClose && emitter.showAdd) {
              emitter.setClose();
            }
            if (!emitter?.filteredList) {
              emitter.newRecord = {};
            }
          } else {
            emitter.$emit("showError", message.text);
          }
        } else {
          const resUpdate = await axios.put(`${STUDENT_URL}/${state.state.selectedStudentId}${url}`, body);

          const message = resUpdate?.data?.messages[0];

          if (message?.variant === "success") {
            emitter.$emit("showSuccess", message.text);
          } else {
            emitter.$emit("showError", message.text);
          }
        }
      } catch (error) {
        const err = { ...error };
        console.log("ERROR HAPPENED", err);
        emitter.$emit("showError", err.response.data.messages[0].text);
      } finally {
        if (emitter?.isAdding) {
          emitter.isAdding = false;
        }
        if (emitter?.getVendorData) {
          emitter.getVendorData();
        }
        state.dispatch("loadStudent", emitter.student.id);
      }
    },
    async updateApplication(state, vals) {
      let body = JSON.parse(`{"${vals[0]}": "${vals[1]}"}`);

      if (vals[1] == null) {
        body = JSON.parse(`{"${vals[0]}": ${vals[1]}}`);
      }

      let emitter = vals[2];

      return axios
        .put(`${APPLICATION_URL}/${state.state.selectedApplicationId}`, body)
        .then((resp) => {
          let message = resp.data.messages[0];
          if (message.variant == "success") emitter.$emit("showSuccess", message.text);
          else emitter.$emit("showError", message.text);
        })
        .catch((err) => {
          console.log("ERROR HAPPENED", err);
          emitter.$emit("showError", err.data.messages[0].text);
        });
    },
    updateConsent(state, vals) {
      let emitter = vals[1];
      let consent = vals[0];

      if (consent.id) {
        //console.log("DOING PUT", consent)
        let id = consent.id;
        delete consent.id;

        axios
          .put(`${STUDENT_URL}/${state.state.selectedStudentId}/consent/${id}`, consent)
          .then((resp) => {
            let message = resp.data.messages[0];
            if (message.variant == "success") {
              let student = state.state.selectedStudent;
              student.consents = resp.data.data;
              state.commit("SET_STUDENT", student);
              emitter.$emit("showSuccess", message.text);
            } else emitter.$emit("showError", message.text);
          })
          .catch((err) => {
            console.log("ERROR HAPPENED", err);
            emitter.$emit("showError", err.data.messages[0].text);
          });
      } else {
        //console.log("DOING POST", consent)

        axios
          .post(`${STUDENT_URL}/${state.state.selectedStudentId}/consent`, consent)
          .then((resp) => {
            let message = resp.data.messages[0];
            if (message.variant == "success") {
              let student = state.state.selectedStudent;
              student.consents = resp.data.data;
              state.commit("SET_STUDENT", student);
              emitter.$emit("showSuccess", message.text);
            } else emitter.$emit("showError", message.text);
          })
          .catch((err) => {
            console.log("ERROR HAPPENED", err);
            emitter.$emit("showError", err.data.messages[0].text);
          });
      }
    },
    deleteConsent(state, vals) {
      let emitter = vals[1];
      let consent = vals[0];
      let id = consent.id;

      axios
        .delete(`${STUDENT_URL}/${state.state.selectedStudentId}/consent/${id}`)
        .then((resp) => {
          let message = resp.data.messages[0];
          if (message.variant == "success") emitter.$emit("showSuccess", message.text);
          else emitter.$emit("showError", message.text);
        })
        .catch((err) => {
          console.log("ERROR HAPPENED", err);
          emitter.$emit("showError", err.data.messages[0].text);
        });
    },
    deleteEducation(state, vals) {
      let emitter = vals[0];
      let idToDelete = vals[1];

      axios
        .delete(`${STUDENT_URL}/${idToDelete}/education`)
        .then((resp) => {
          let message = resp.data.messages[0];
          if (message.variant == "success") emitter.$emit("showSuccess", message.text);
          else emitter.$emit("showError", message.text);
        })
        .catch((err) => {
          console.log("ERROR HAPPENED", err);
          emitter.$emit("showError", err.data.messages[0].text);
        })
        .finally(() => {
          state.dispatch("loadStudent", emitter.student.id);
        });
    },
    deleteConsent(state, vals) {
      let emitter = vals[0];
      let idToDelete = vals[1];

      axios
        .delete(`${STUDENT_URL}/${idToDelete}/consent`)
        .then((resp) => {
          let message = resp.data.messages[0];
          if (message.variant == "success") emitter.$emit("showSuccess", message.text);
          else emitter.$emit("showError", message.text);
        })
        .catch((err) => {
          console.log("ERROR HAPPENED", err);
          emitter.$emit("showError", err.data.messages[0].text);
        })
        .finally(() => {
          state.dispatch("loadStudent", emitter.student.id);
        });
    },
    deleteDependent(state, vals) {
      let emitter = vals[0];
      let idToDelete = vals[1];

      axios
        .delete(`${STUDENT_URL}/${idToDelete}/dependent`)
        .then((resp) => {
          let message = resp.data.messages[0];
          if (message.variant == "success") emitter.$emit("showSuccess", message.text);
          else emitter.$emit("showError", message.text);
        })
        .catch((err) => {
          console.log("ERROR HAPPENED", err);
          emitter.$emit("showError", err.data.messages[0].text);
        })
        .finally(() => {
          state.dispatch("loadStudent", emitter.student.id);
        });
    },
    deleteResidence(state, vals) {
      let emitter = vals[0];
      let idToDelete = vals[1];

      axios
        .delete(`${STUDENT_URL}/${idToDelete}/residence`)
        .then((resp) => {
          let message = resp.data.messages[0];
          if (message.variant == "success") emitter.$emit("showSuccess", message.text);
          else emitter.$emit("showError", message.text);
        })
        .catch((err) => {
          console.log("ERROR HAPPENED", err);
          emitter.$emit("showError", err.data.messages[0].text);
        })
        .finally(() => {
          state.dispatch("loadStudent", emitter.student.id);
        });
    },
    saveApplicationFlags({ state, dispatch }, vals) {
      let val = vals.join(",").trim();

      axios
        .put(`${APPLICATION_URL}/${state.selectedApplicationId}`, { flags: val })
        .then((resp) => {
          dispatch("loadApplication", state.selectedApplicationId);
          //let message = resp.data.messages[0];
          //if (message.variant == "success") emitter.$emit("showSuccess", message.text);
          //else emitter.$emit("showError", message.text);
        })
        .catch((err) => {
          console.log("ERROR HAPPENED", err);
          //emitter.$emit("showError", err.data.messages[0].text);
        });
    },
    loadFlagOptions({ commit }) {
      axios.get(`${APPLICATION_URL}/flags`).then((resp) => {
        commit("SET_FLAGOPTIONS", resp.data.data);
      });
    },
    searchApplicationsByFlag({ commit }, flag) {
      axios.get(`${APPLICATION_URL}/flags/${flag}`).then((resp) => {
        commit("SET_FLAGMATCHES", resp.data.data);
      });
    },
  },

  modules: {
    auth,
    profile,
    institution,
    student,
    province,
    countries,
    cities,
    cslCode,
    requirementType,
    addressType,
    indigenousLearner,
    Language,
    maritalStatus,
    studyField,
    parentalRelationship,
    firstNation,
    portalStatus,
    sex,
    studentCategory,
    applicationType,
    highSchool,
    ageDistribution,
    institutionLevel,
    assessmentType,
    batchGroup,
    educationLevel,
    status,
    statusReason,
    yukonGrantEligibility,
    disbursementType,
    reasonsForChange,
    fundingGroup,
    disabilityType,
    aboriginalStatus,
    disabilityService,
    relationships,
    studyArea,
    program,
    cslClassification,
    citizenship,
    prestudyEmploymentStatus,
    academicYear,
    agency,
    instructionType,
    programDivision,
    attendance,
    documentStatus,
    incomeType,
    expenseCategory,
    equipmentCategory,
    changeReason,
    assessment,
    adminCrud,
    communicationType,
    disbursement,
    requestType,
    inSchoolStatus,
    cslft,
    csgft,
    sta,
    accommodationType,
    officers,
    cslReason,
    cslCertificateExport,
    cslMsfaaReceive,
    chequeReqList,

    csgDisabilityStore,
    csgDependentStore,
    csgMatureStore,
    csgFullTimeStore,
    csgDisabilitySEStore,
    cslPartTimeStore,
    csgPartTimeStore,
    csgPartTimeDependentStore,
    csgPartTimeDisabilityStore,
    cslFullTimeStore,

    sfaScholarshipArmyStore,
    sfaScholarshipHarachStore,
    sfaScholarshipHuskysStore,

    reportsStore,
    academicYearStore,

    communicationStore,
  },
});
