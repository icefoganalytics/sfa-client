<template>
  <div class="home">
    <h1>Student Details</h1>

    <v-tabs v-model="tab" background-color="#fff2d5" color="primary">
      <v-tab key="#contact" @click="updateHash('#contact')">Contact</v-tab>
      <v-tab key="#sfa-info" @click="updateHash('#sfa-info')">SFA Info</v-tab>
      <v-tab key="#vendor-info" @click="updateHash('#vendor-info')">Vendor info</v-tab>
      <v-tab key="#consent" @click="updateHash('#consent')">Consent</v-tab>
      <v-tab key="#standing-documents" @click="updateHash('#standing-documents')">Standing Documents</v-tab>
      <v-tab key="#screening" @click="updateHash('#screening')">Screening</v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab" style="padding: 20px 0">
      <v-tab-item key="#contact">
        <contact-form v-on:showSuccess="showSuccess" v-on:showError="showError"></contact-form>
      </v-tab-item>
      <v-tab-item key="#sfa-info">
        <sfa-info-form v-on:showSuccess="showSuccess" v-on:showError="showError"></sfa-info-form>
      </v-tab-item>
      <v-tab-item key="#vendor-info">
        <vendor-info-form v-on:showSuccess="showSuccess" v-on:showError="showError"></vendor-info-form>
      </v-tab-item>
      <v-tab-item key="#consent">
        <consent-form v-on:showSuccess="showSuccess" v-on:showError="showError"></consent-form>
      </v-tab-item>
      <v-tab-item key="#standing-documents">
        <standing-documents v-on:showSuccess="showSuccess" v-on:showError="showError"></standing-documents>
      </v-tab-item>
      <v-tab-item key="#screening">
        <Screening v-on:showSuccess="showSuccess" v-on:showError="showError"></Screening>
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
import Screening from "./Screening.vue";

export default {
  name: "Home",
  components: { ContactForm, ConsentForm, SfaInfoForm, VendorInfoForm, StandingDocuments, Screening },
  computed: {
    ...mapState(["selectedStudent"]),
  },
  data: () => ({
    tab: "#contact",
    applicationId: -1,
  }),
  async created() {
    store.dispatch("setMonthOptions");
    store.dispatch("setYearOptions");

    this.applicationId = this.$route.params.id;
    let storeApp = store.getters.selectedApplication;

    if (this.$route.path.indexOf("/student/") >= 0) {
      await store.dispatch("loadStudent", this.applicationId);
      store.dispatch("setAppSidebar", true);
    } else {
      if (this.applicationId != storeApp.HISTORY_DETAIL_ID) {
        await store.dispatch("loadApplication", this.applicationId);
        store.dispatch("setAppSidebar", true);
      }
    }

    if (this.$route.hash) {
      this.updateHash(this.$route.hash);
    }
  },
  watch: {
    student: function(val) {
      if (val) this.updateView(val);
    },
  },
  methods: {
    updateHash(hash) {
      const tabMap = {
        "#contact": 0,
        "#sfa-info": 1,
        "#vendor-info": 2,
        "#consent": 3,
        "#standing-documents": 4,
        "#screening": 5,
      };

      this.tab = tabMap[hash] !== undefined ? tabMap[hash] : 0;
      this.$router.push({ hash });
    },
    showSuccess(mgs) {
      this.$emit("showSuccess", mgs);
    },
    showError(mgs) {
      this.$emit("showError", mgs);
    },
  },
};
</script>
