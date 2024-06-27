<template>
  <div class="home">
    <div class="d-flex">
      <v-btn
        v-if="!showFundings"
        @click="showFundingStatus"
        color="warning"
        x-small
        fab
        class="mt-2 mr-5"
        title="Cancel"
      >
        <v-icon>mdi-keyboard-backspace</v-icon>
      </v-btn>

      <h1>Funding Status</h1>
    </div>

    <div class="row">
      <div class="col-md-12" v-if="!assessmentComponent && showFundings && application.funding_requests">
        <v-card
          class="default mb-5"
          v-for="(item, index) in application.funding_requests?.filter(
            (f) => !requestTypesToHide.includes(f.request_type_id)
          )"
          :key="index"
        >
          <v-card-title class="d-block mb-2">
            <div class="float-right text-right">
              <v-btn
                :disabled="!(item.status_id === 6 || item.status_id === 7 || item.status_id === 40)"
                dense
                small
                color="info"
                class="my-0"
                @click="showAssessment(item.request_type_id, item.id)"
                block
              >
                Assessment
              </v-btn>
            </div>

            <div>{{ getName(item.request_type_id) }}</div>
          </v-card-title>
          <v-card-text>
            <div class="row">
              <div class="col-md-3">
                <v-menu
                  :disabled="showAdd"
                  v-model="item.received_date_menu"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  left
                  nudge-top="26"
                  offset-y
                  min-width="auto"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field
                      :disabled="showAdd"
                      v-model="item.received_date"
                      label="Date app received"
                      append-icon="mdi-calendar"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="white"
                      v-bind="attrs"
                      v-on="on"
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    :disabled="showAdd"
                    v-model="item.received_date"
                    @change="updateFundingRequest({ received_date: item.received_date }, item.id)"
                    @input="item.received_date_menu = false"
                  ></v-date-picker>
                </v-menu>
              </div>
              <div class="col-md-6">
                <v-select
                  :disabled="showAdd"
                  outlined
                  dense
                  background-color="white"
                  hide-details
                  label="Funding status"
                  @change="updateFundingRequest({ status_id: item.status_id }, item.id)"
                  v-model="item.status_id"
                  :items="statusOptions"
                  item-text="description"
                  item-value="id"
                ></v-select>
              </div>
              <div class="col-md-3">
                <v-menu
                  :disabled="showAdd"
                  v-model="item.status_date_menu"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  left
                  nudge-top="26"
                  offset-y
                  min-width="auto"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field
                      :disabled="showAdd"
                      v-model="item.status_date"
                      label="Status date"
                      append-icon="mdi-calendar"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="white"
                      v-bind="attrs"
                      v-on="on"
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    :disabled="showAdd"
                    @change="updateFundingRequest({ status_date: item.status_date }, item.id)"
                    v-model="item.status_date"
                    @input="item.status_date_menu = false"
                  ></v-date-picker>
                </v-menu>
              </div>

              <div class="col-md-9">
                <v-autocomplete
                  :disabled="showAdd"
                  outlined
                  dense
                  background-color="white"
                  hide-details
                  label="Reason"
                  @change="updateFundingRequest({ status_reason_id: item.status_reason_id }, item.id)"
                  v-model="item.status_reason_id"
                  :items="reasonOptions"
                  item-text="description"
                  item-value="id"
                ></v-autocomplete>
              </div>

              <div class="col-md-3">
                <status-documents
                  :item="item"
                  :type="fundingTypeOptions?.find((ft) => ft.id === item.request_type_id)?.description"
                  v-on:showError="showError"
                ></status-documents>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
    <component
      v-if="assessmentComponent && !showFundings && assessmentTypeId"
      :is="assessmentComponent"
      :fundingRequestId="fundingRequestId"
      v-on:close="showFundingStatus"
      v-on:showError="showError"
      v-on:showSuccess="showSuccess"
    ></component>
  </div>
</template>

<script>
import store from "@/store";
import axios from "axios";
//Grants and Scholarships
import { assessmentType } from "@/components/application/assessmentType.js";
import StatusDocuments from "./StatusDocuments.vue";
import { mapGetters } from "vuex";
import { REQUEST_TYPES, STATUS, STATUS_REASON, APPLICATION_URL } from "@/urls";

export default {
  name: "application-status",
  components: { StatusDocuments },
  computed: {
    ...mapGetters(["assessments"]),
    application: function() {
      return store.getters.selectedApplication;
    },
    requestTypesToHide() {
      let alwaysHide = [31, 33, 34];
      let currentRequests = this.application.funding_requests.map((r) => r.request_type_id);

      // hide disability grant if student has CSL PT
      if (currentRequests.includes(5)) {
        return [...alwaysHide, 29];
      }

      return alwaysHide;
    },
  },
  data: () => ({
    fundingRequestId: null,
    assessmentTypeId: null,
    assessmentComponent: null,
    showFundings: true,
    showAdd: false,
    applicationId: -1,
    fundingTypeOptions: [],
    reasonOptions: [],
    statusOptions: [],
    newRecord: {
      request_type_id: null,
      received_date: null,
      status_id: null,
      status_reason_id: null,
      status_date: null,
      status_date_menu: false,
      received_date_menu: false,
      assessmentsComponents: {},
    },
  }),
  async created() {
    this.loadFundingTypes();
    this.loadStatus();
    this.loadReasons();

    this.applicationId = this.$route.params.id;
    let storeApp = store.getters.selectedApplication;

    if (this.applicationId != storeApp.id) {
      await store.dispatch("loadApplication", this.applicationId);
    }

    store.dispatch("setAppSidebar", true);
  },
  methods: {
    getName(typeId) {
      if (this.fundingTypeOptions) {
        let item = this.fundingTypeOptions.find((ft) => ft.id == typeId);
        return item ? item.description : "";
      }

      return "";
    },

    async assessmentTypeC() {
      this.assessmentComponent = await assessmentType(
        this.assessmentTypeId,
        this.application.id,
        this.fundingRequestId,
        this.application.academic_year_id,
        this
      );
    },
    showAssessment(request_type_id, funding_request_id) {
      switch (request_type_id) {
        case 30:
          this.$router.push(`/application/${this.applicationId}/csgdse/${funding_request_id}`);
          break;
        case 32:
          this.$router.push(`/application/${this.applicationId}/csgftdep/${funding_request_id}`);
          break;
        case 35:
          this.$router.push(`/application/${this.applicationId}/csgft/${funding_request_id}`);
          break;
        case 29:
          this.$router.push(`/application/${this.applicationId}/csgd/${funding_request_id}`);
          break;
        case 28:
          this.$router.push(`/application/${this.applicationId}/csgtp/${funding_request_id}`);
          break;
        case 5:
          this.$router.push(`/application/${this.applicationId}/cslpt/${funding_request_id}`);
          break;
        case 7:
          this.$router.push(`/application/${this.applicationId}/scholarship-army/${funding_request_id}`);
          break;
        case 9:
          this.$router.push(`/application/${this.applicationId}/scholarship-harach/${funding_request_id}`);
          break;
        case 11:
          this.$router.push(`/application/${this.applicationId}/scholarship-huskys/${funding_request_id}`);
          break;
        case 4:
          this.$router.push(`/application/${this.applicationId}/cslft/${funding_request_id}`);
          break;

        default:
         /*  if (request_type_id == 4) {
            console.log("THIS IS A 4")
            window.open(`/application/${this.applicationId}/cslft/${funding_request_id}`)
          } */

          this.showFundings = false;
          store.dispatch("getAssessments", { application_id: this.application.id, funding_request_id });
          this.assessmentTypeId = request_type_id;
          this.fundingRequestId = funding_request_id;
          this.assessmentTypeC();
      }
    },
    async showFundingStatus() {
      this.showFundings = true;
      this.assessmentTypeId = null;
      this.fundingRequestId = null;
      this.assessmentComponent = null;
      await this.loadFundingData();
    },
    async loadFundingData() {
      try {
        await store.dispatch("loadApplication", this.applicationId);
        this.loadFundingTypes();
        this.loadStatus();
        this.loadReasons();
      } catch (error) {
        console.error("Error loading funding data:", error);
      }
    },
    setClose() {
      this.newRecord = {
        request_type_id: null,
        received_date: null,
        status_id: null,
        status_reason_id: null,
        status_date: null,
        status_date_menu: false,
        received_date_menu: false,
      };
      this.showAdd = !this.showAdd;
    },
    loadFundingTypes() {
      axios.get(REQUEST_TYPES).then((resp) => {
        this.fundingTypeOptions = resp.data.data;
      });
    },
    loadStatus() {
      axios.get(STATUS).then((resp) => {
        this.statusOptions = resp.data.data;
      });
    },
    loadReasons() {
      axios.get(STATUS_REASON).then((resp) => {
        this.reasonOptions = resp.data.data;
      });
    },
    async updateFundingRequest(itemToUpdate, id) {
      try {
        const resInsert = await axios.put(`${APPLICATION_URL}/${this.applicationId}/status/${id}`, {
          data: { ...itemToUpdate },
        });
        const message = resInsert?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
        } else {
          this.$emit("showError", message.text);
        }
      } catch (error) {
        this.$emit("showError", "Error to update");
      } finally {
        store.dispatch("loadApplication", this.applicationId);
      }
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
<style>
.v-select__selection.v-select__selection--comma.v-select__selection--disabled {
  color: rgba(0, 0, 0, 0.87) !important;
}
</style>
