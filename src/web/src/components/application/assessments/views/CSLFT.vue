<template>
  <div>
    <div class="mt-4">
      <v-card class="default mb-1 bg-color-blue" :loading="isLoading" :disabled="isLoading">
        <v-card-title class="pb-3">
          <v-btn :to="`/application/${applicationId}/status`" color="warning" x-small fab class="my-0 mr-5">
            <v-icon>mdi-keyboard-backspace</v-icon> </v-btn
          >Assessment: CSFA-FT

          <v-spacer />
          <div>
            <v-chip class="my-0 ml-3 text-regular" color="brown lighten-4" style="font-weight: 400"
              >Total Awarded: {{ totalAwarded }}</v-chip
            >
            <!-- <v-chip class="my-0 ml-3" color="indigo lighten-4" style="font-weight: 400"
              >{{ percentAwarded }} of Need</v-chip
            > -->
            <v-chip
              class="my-0 ml-3"
              :color="msfaa?.msfaa_status == 'Received' ? 'green lighten-3' : 'orange lighten-4'"
              style="font-weight: 400"
              >MSFAA: {{ msfaa?.msfaa_status ?? "Not Sent" }}</v-chip
            >
          </div>
        </v-card-title>
        <v-divider class="mt-1"></v-divider>

        <v-tabs background-color="primary lighten-1" dark>
          <v-tab v-for="asmt of assessmentItems" @click="changeAssessment(asmt)" :to="asmt.to"
            ><v-icon class="mr-2">mdi-lock</v-icon> {{ asmt.title }}</v-tab
          >

          <v-spacer />

          <v-menu offset-y nudge-left="70" v-if="canSave || canAddAssessment">
            <template v-slot:activator="{ on, attrs }">
              <v-btn color="secondary" small v-bind="attrs" v-on="on" class="my-auto mr-4">
                Actions <v-icon>mdi-chevron-down</v-icon>
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item v-if="canSave" @click="saveClick">
                <v-list-item-icon><v-icon>mdi-content-save</v-icon></v-list-item-icon>
                <v-list-item-title>Save</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="canAddAssessment" @click="addAssessmentClick">
                <v-list-item-icon><v-icon>mdi-refresh</v-icon></v-list-item-icon>
                <v-list-item-title>Add Reassessment</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="canRecordOveraward" @click="recordOverawardClick">
                <v-list-item-icon><v-icon>mdi-pin-outline</v-icon></v-list-item-icon>
                <v-list-item-title>Record Overaward</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="canApplyOveraward" @click="applyOverawardClick">
                <v-list-item-icon><v-icon>mdi-eraser</v-icon></v-list-item-icon>
                <v-list-item-title>Apply Student Overaward</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="canDelete" @click="deleteClick">
                <v-list-item-icon><v-icon>mdi-trash-can-outline</v-icon></v-list-item-icon>
                <v-list-item-title>Delete Assessment</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-tabs>

        <v-tabs v-model="tab">
          <v-tab key="0">Base</v-tab>
          <v-tab key="1">Costs<br />{{ formatMoney(assessment.total_costs) }}</v-tab>
          <v-tab key="2">Contribution<br />{{ formatMoney(assessment.total_contribution) }}</v-tab>
          <!-- <v-tab key="2"
            >CSGD<br />
            {{ formatMoney(disAmount) }}</v-tab
          > -->
          <!-- <v-tab key="3">CSG-FT<br />{{ formatMoney(grantAmount) }}</v-tab> -->
          <!--  <v-tab key="4"
            >CSG-PTDEP<br />
            {{ formatMoney(depAmount) }}</v-tab
          > -->
          <v-tab key="3">Award<br />{{ formatMoney(assessment.assessed_amount) }}</v-tab>
          <v-tab key="4">MSFAA</v-tab>
        </v-tabs>
        <v-divider></v-divider>
        <!--  <v-card-text class="pt-0"> -->
        <v-tabs-items v-if="assessment" v-model="tab">
          <v-tab-item key="0">
            <tab-base></tab-base>
          </v-tab-item>
          <v-tab-item key="1">
            <tab-costs></tab-costs>
          </v-tab-item>
          <v-tab-item key="2">
            <tab-contribution></tab-contribution>
          </v-tab-item>
          <!-- <v-tab-item key="2">
            <tab-disability v-on:showError="showError" v-on:showSuccess="showSuccess"></tab-disability>
          </v-tab-item> -->
          <!-- <v-tab-item key="3">
            <tab-grant></tab-grant>
          </v-tab-item> -->
          <!--  <v-tab-item key="4">
            <tab-dependent></tab-dependent>
          </v-tab-item> -->
          <v-tab-item key="3">
            <tab-award :canSave="canSave"></tab-award>
          </v-tab-item>
          <v-tab-item key="4">
            <tab-msfaa></tab-msfaa>
          </v-tab-item>
        </v-tabs-items>
        <!-- </v-card-text> -->
      </v-card>
    </div>
  </div>
</template>
<script>
import store from "@/store";
import moment from "moment";
import { isNumber } from "lodash";
import { mapActions, mapGetters, mapState } from "vuex";

import TabBase from "../components/csl-ft/tab-base.vue";
import TabCosts from "../components/csl-ft/tab-costs.vue";
import TabContribution from "../components/csl-ft/tab-contribution.vue";
import TabAward from "../components/csl-ft/tab-award.vue";
//import TabGrant from "../components/csl-ft/tab-grant.vue";
//import TabDependent from "../components/csl-ft/tab-dependent.vue";
//import TabDisability from "../components/csl-ft/tab-disability.vue";
import TabMsfaa from "../components/csl-ft/tab-msfaa.vue";

export default {
  name: "Home",
  components: {
    TabBase,
    TabCosts,
    TabContribution,
    //TabGrant,
    //TabDependent,
    //TabDisability,
    TabAward,
    TabMsfaa,
  },
  data: () => ({
    tab: 0,
    assessmentId: 0,
    applicationId: 0,
  }),
  async created() {
    this.applicationId = this.$route.params.id;
    this.assessmentId = this.$route.params.assessmentId;
    store.dispatch("setAppSidebar", true);

    if (this.application && this.application.id == this.applicationId) {
      await this.initialize({ app: this.application, assessmentId: this.assessmentId }).then((r) => {});
    } else {
      await store.dispatch("loadApplication", this.applicationId).then(async (res) => {
        await this.initialize({ app: this.application, assessmentId: this.assessmentId }).then((r) => {});
        this.changeAssessment(null);
      });
    }

    await this.setCslClassifications();
    await this.setDisbursementTypes();
    await this.setChangeReasons();
    await this.setMaritalStatusList();
    await this.setStudyAreas();
    await this.setProvinces();
    await this.setPrograms();
    await this.setStatus();
    await this.setStatusReasons();
    await this.setAccommodationTypes();
    await this.setCslReasonNonAward();
    await this.setCslReasonOverAward();
    await this.setAssessmentTypes();
  },
  watch: {
    "$route.params.assessmentId": async function(nval) {
      await this.initialize({ app: this.application, assessmentId: nval }).then((r) => {});
      this.assessmentId = nval;
    },
    fundingRequest: function(nval) {
      if (nval.assessments.length > 0 && !this.assessmentId) {
        this.$router.replace(this.assessmentItems[this.assessmentItems.length - 1].to);
      }
    },
  },
  computed: {
    ...mapState({ application: "selectedApplication", student: "selectedStudent" }),
    ...mapState("cslFullTimeStore", ["isLoading", "assessment", "fundingRequest", "disbursements", "msfaa"]),
    ...mapGetters(["cslClassifications", "disbursementTypes", "changeReasons"]),
    totalAwarded() {
      // this should be a sum of all disbursements amounts for all assessments
      return this.formatMoney(this.assessment.assessed_amount);
    },
    percentAwarded() {
      return `${Math.round((100 * this.assessment.assessed_amount) / this.assessment.total_costs)}%`;
    },
    assessmentItems() {
      if (this.fundingRequest) {
        if (this.fundingRequest.assessments && this.fundingRequest.assessments.length > 0) {
          let list = [];

          for (let i = 0; i < this.fundingRequest.assessments.length; i++) {
            let asmt = this.fundingRequest.assessments[i];

            let type =
              asmt.assessment_type_id == 1
                ? "INITIAL ASSESSMENT"
                : asmt.assessment_type_id == 2
                ? `REASSESSMENT ${i}`
                : "VERIFY";

            list.push({
              id: asmt.id,
              title: `${type} (${this.formatDate(asmt.assessed_date)})`,
              to: `/application/${this.fundingRequest.application_id}/cslft/${this.fundingRequest.id}/${asmt.id}`,
            });
          }

          return list;
        }

        return [
          {
            id: -1,
            title: "Preview Assessment",
            to: `/application/${this.fundingRequest.application_id}/cslft/${this.fundingRequest.id}`,
          },
        ];
      }

      return [];
    },
    canSave() {
      if (this.assessmentItems.length == 1) return true;
      let lastItem = this.assessmentItems[this.assessmentItems.length - 1];
      return lastItem.id === parseInt(this.assessment.id);
    },
    canAddAssessment() {
      return this.canSave && this.disbursements.length > 0;
    },
    canApplyOveraward() {
      return (
        this.assessment.id &&
        this.canSave &&
        this.assessment.net_amount > 0 &&
        !(this.assessment.has_overaward_applied || this.assessment.has_overaward_recorded)
      );
    },
    canRecordOveraward() {
      return (
        this.assessment.id &&
        this.canSave &&
        this.assessment.net_amount < 0 &&
        !(this.assessment.has_overaward_applied || this.assessment.has_overaward_recorded)
      );
    },
    canDelete() {
      return this.disbursements.length == 0;
    },
  },
  methods: {
    ...mapActions("cslFullTimeStore", [
      "initialize",
      "save",
      "recalculate",
      "createAssessment",
      "clearOveraward",
      "recordOveraward",
      "deleteAssessment",
    ]),
    ...mapActions([
      "setCslClassifications",
      "setDisbursementTypes",
      "setChangeReasons",
      "setMaritalStatusList",
      "setStudyAreas",
      "setProvinces",
      "setPrograms",
      "setStatus",
      "setStatusReasons",
      "setAccommodationTypes",
      "setCslReasonNonAward",
      "setCslReasonOverAward",
      "setAssessmentTypes",
    ]),

    showSuccess(mgs) {
      this.$emit("showSuccess", mgs);
    },
    showError(mgs) {
      this.$emit("showError", mgs);
    },
    formatMoney(input, defaultVal = false) {
      if (isNumber(input)) {
        return Intl.NumberFormat("en", {
          currency: "USD",
          style: "currency",
        }).format(input);
      }
      if (defaultVal) return input;
      return "$0.00";
    },
    formatDate(input) {
      return moment.utc(input).format("YYYY-MM-DD");
    },
    changeAssessment(asmt) {
      //this.tab = 0;
      if (asmt) {
        this.$router.replace(asmt.to);
      }
    },
    async saveClick() {
      await this.save();
    },
    async addAssessmentClick() {
      await this.createAssessment();
    },
    async applyOverawardClick() {
      await this.clearOveraward();
    },
    async recordOverawardClick() {
      await this.recordOveraward().then(() => {
        this.showSuccess("Overaward recorded");
      });
    },
    async deleteClick() {
      await this.deleteAssessment()
        .then((resp) => {
          this.$router.push(`/application/${this.application.id}/cslft/${this.fundingRequest.id}`);
        })
        .catch((err) => {
          console.log(err);
          this.showError(err.response.data.error);
        });
    },
  },
};
</script>

<style scoped>
.v-tabs-items,
.theme--light.v-tabs > .v-tabs-bar {
  background-color: #ffffff00 !important;
}
</style>
