<template>
  <div class="home">
    <h1>Student Details</h1>

    <v-tabs v-model="tab" background-color="#fff2d5" color="primary">
      <v-tab key="0">Contact</v-tab>
      <v-tab key="1">SFA Info</v-tab>
      <v-tab key="2">Vendor info</v-tab>
      <v-tab key="3">Consent</v-tab>
      <v-tab key="4">Standing Documents</v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab" style="padding: 20px 0">
      <v-tab-item key="0">
        <contact-form v-on:showSuccess="showSuccess" v-on:showError="showError"></contact-form>
      </v-tab-item>
      <v-tab-item key="1">
        <sfa-info-form v-on:showSuccess="showSuccess" v-on:showError="showError"></sfa-info-form>
      </v-tab-item>
      <v-tab-item key="2">
        <vendor-info-form v-on:showSuccess="showSuccess" v-on:showError="showError"></vendor-info-form>
      </v-tab-item>
      <v-tab-item key="3">
        <consent-form v-on:showSuccess="showSuccess" v-on:showError="showError"></consent-form>
      </v-tab-item>
      <v-tab-item key="4">
        <standing-documents v-on:showSuccess="showSuccess" v-on:showError="showError"></standing-documents>
      </v-tab-item>
    </v-tabs-items>
  </div>
</template>

<script>
import { mapState } from "vuex";
import store from "../../store";

import ConsentForm from "./ConsentForm.vue";
import ContactForm from "./ContactForm.vue";
import SfaInfoForm from "./SfaInfoForm.vue";
import VendorInfoForm from "./VendorInfoForm.vue";
import StandingDocuments from "./StandingDocuments.vue";

export default {
  name: "Home",
  components: { ContactForm, ConsentForm, SfaInfoForm, VendorInfoForm, StandingDocuments },
  computed: {
    ...mapState(["selectedStudent"]),
  },
  data: () => ({
    tab: 0,
    applicationId: -1,
  }),
  async created() {
    store.dispatch("setMonthOptions");
    store.dispatch("setYearOptions");

    this.applicationId = this.$route.params.id;
    let storeApp = store.getters.selectedApplication;

    if (this.$route.path.indexOf("/student/") >= 0) {
      //console.log("LOADING STUDENT BASED ON URL");
      await store.dispatch("loadStudent", this.applicationId);
      store.dispatch("setAppSidebar", true);
    } else {
      if (this.applicationId != storeApp.HISTORY_DETAIL_ID) {
        //console.log("LOADING APPLICTION BASED ON URL");
        await store.dispatch("loadApplication", this.applicationId);
        store.dispatch("setAppSidebar", true);
      }
    }
  },
  watch: {
    student: function(val) {
      if (val) this.updateView(val);
    },
    //selectedStudent: function (val) {
    //console.log("WATCH selectedStudent", val);
    //},
  },
  methods: {
    showSuccess(mgs) {
      this.$emit("showSuccess", mgs);
    },
    showError(mgs) {
      this.$emit("showError", mgs);
    },
  },
};
</script>
