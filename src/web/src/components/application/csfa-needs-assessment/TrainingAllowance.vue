<template>
  <div class="training-allowance-assessment">
    <div class="row">
      <div class="col-md-12">
        <v-card class="default bg-color-blue">
          <div class="col-lg-12 nopadding d-flex flex-wrap low-margin">
            <v-card-title class="col-xs-12 col-lg-8">Assessment - Training Allowance</v-card-title>
            <div class="col-xs-12 col-lg-4 nopadding d-flex">
              <div class="col-xs-4 col-sm-4">
                <v-btn dense color="green" class="my-0" block @click="save">
                  SAVE
                </v-btn>
              </div>
              <div class="col-xs-4 col-sm-4">
                <v-btn
                  dense
                  color="orange"
                  class="my-0"
                  block
                  @click="
                    (e) => {
                      $store.dispatch('staGetAssessment', { funding_request_id: this.fundingRequestId });
                    }
                  "
                >
                  CANCEL
                </v-btn>
              </div>
              <div class="col-xs-4 col-sm-4">
                <v-btn
                  dense
                  color="red"
                  class="my-0"
                  block
                  @click="
                    (e) => {
                      exit();
                      $emit('close');
                    }
                  "
                >
                  EXIT
                </v-btn>
              </div>
            </div>
          </div>
          <v-card-text class="nopadding d-flex flex-wrap">
            <div class="col-xs-12 col-lg-8 nopadding left-block-container">
              <div class="col-xs-12 col-lg-12 nopadding d-flex mobile-column-flex low-margin">
                <div class="col-xs-12 col-lg-4 nopadding">
                  <div class="col-xs-12 col-lg-12">
                    <v-menu
                      v-model="assessed_date_menu"
                      :close-on-content-click="false"
                      transition="scale-transition"
                      left
                      nudge-top="26"
                      offset-y
                      min-width="auto"
                    >
                      <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                          :value="assessment.assessed_date?.slice(0, 10)"
                          label="Assessed date"
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
                        :value="assessment.assessed_date?.slice(0, 10)"
                        @input="
                          (e) => {
                            assessment.assessed_date = e;
                            assessed_date_menu = false;
                          }
                        "
                        @change="refresh"
                      ></v-date-picker>
                    </v-menu>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-menu
                      v-model="effective_rate_date_menu"
                      :close-on-content-click="false"
                      transition="scale-transition"
                      left
                      nudge-top="26"
                      offset-y
                      min-width="auto"
                    >
                      <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                          :value="assessment.effective_rate_date?.slice(0, 10)"
                          label="Effective rate date"
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
                        :value="assessment.effective_rate_date?.slice(0, 10)"
                        @input="
                          (e) => {
                            assessment.effective_rate_date = e;
                            effective_rate_date_menu = false;
                          }
                        "
                        @change="refresh"
                      ></v-date-picker>
                    </v-menu>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      readonly
                      :value="assessment.classes_start_date?.slice(0, 10)"
                      label="Classes start date"
                      append-icon="mdi-lock"
                      hide-details
                      outlined
                      dense
                      background-color="#ddd"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      :value="assessment.classes_end_date?.slice(0, 10)"
                      label="Classes end date"
                      append-icon="mdi-lock"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="#ddd"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-xs-12 col-lg-8 nopadding">
                  <div class="col-xs-12 col-lg-12">
                    <v-autocomplete
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Home community"
                      :items="cities"
                      item-text="description"
                      item-value="id"
                      v-model="assessment.home_city_id"
                      @change="refresh"
                    ></v-autocomplete>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-autocomplete
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Institution community"
                      :items="cities"
                      item-text="description"
                      item-value="id"
                      v-model="assessment.destination_city_id"
                      @change="refresh"
                    ></v-autocomplete>
                  </div>
                  <div class="col-xs-12 col-lg-6">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-lock"
                      hide-details
                      label="Dependent count"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.dependent_count"
                      @change="refresh"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-6">
                    <v-text-field
                      v-if="institutionCode === 'LPAH'"
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-lock"
                      hide-details
                      label="Entitlement days"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.entitlement_days"
                      @change="refresh"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-6">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-lock"
                      hide-details
                      label="2nd residence rate"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.second_residence_rate"
                      @change="refresh"
                    ></v-text-field>
                  </div>
                </div>
              </div>
              <div
                v-if="!(application.academic_year_id > 2016)"
                class="col-xs-12 col-lg-12 nopadding d-flex mobile-column-flex low-margin flex-wrap"
              >
                <div class="col-xs-12 col-lg-12 nopadding">
                  <v-card-title>Pre Legislation Method</v-card-title>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap mobile-low-margin">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Fraction of whole year"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.years_funded_equivalent"
                      @change="refresh"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap mobile-low-margin">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      disabled
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Year Funded"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.years_funded"
                    ></v-text-field>
                  </div>
                </div>
              </div>
              <div class="col-xs-12 col-lg-12 nopadding d-flex mobile-column-flex low-margin flex-wrap">
                <div class="col-xs-12 col-lg-12 nopadding">
                  <v-card-title>Post Legislation Method</v-card-title>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap mobile-low-margin">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Previous weeks"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.previous_weeks"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Previous upgrade weeks"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.previous_upgrade_weeks"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap mobile-low-margin">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Assessed weeks"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.assessed_weeks"
                    ></v-text-field>
                  </div>
                  <div
                    class="col-xs-12 col-lg-12 line-jump-height d-flex align-center not-displayed-sx not-displayed-sx-md"
                  ></div>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Allowed weeks"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.weeks_allowed"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Weekly amount"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.weekly_amount"
                    ></v-text-field>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-xs-12 col-lg-4 nopadding right-block-container">
              <div class="not-displayed-lg"></div>
              <div class="col-lg-12 nopadding d-flex align-center flex-wrap">
                <div class="col-sm-6 col-lg-7 nopadding d-flex flex-wrap">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Travel allowance"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.travel_allowance"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-5">
                  <v-btn
                    dense
                    color="blue"
                    class="my-0"
                    block
                    @click="
                      (e) => {
                        $store.dispatch('recalcSTA');
                      }
                    "
                  >
                    RE-CALC
                  </v-btn>
                </div>
              </div>
              <div class="col-lg-12 nopadding d-flex align-end flex-wrap">
                <div class="col-sm-6 col-lg-7 nopadding d-flex flex-wrap">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Assessed amount"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.assessed_amount"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Previous disbursement"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.previous_disbursement"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12 low-margin mobile-noppading-bottom">
                    <v-text-field
                      outlined
                      dense
                      readonly
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Net amount"
                      @keypress="validate.isNumber($event)"
                      v-model="assessment.net_amount"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-sm-4 col-lg-5 d-flex nopadding line-jump-height align-center low-margin">
                  <div class="col-xs-12 col-lg-12 height-fit-content mobile-noppading-top">
                    <v-btn dense color="blue" class="my-0" block @click="disburse">
                      DISBURSE
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
      <div class="col-lg-12">
        <v-card class="default mb-5 bg-color-blue">
          <v-card-text>
            <SFADisbursements
              :disbursements="disbursements"
              @addDisbursement="addDisburse"
              @removeDisbursement="removeDisbursement2"
              ref="disburseComponent"
            ></SFADisbursements>
          </v-card-text>
        </v-card>
      </div>
      <confirm-dialog ref="confirm"></confirm-dialog>
    </div>
  </div>
</template>
<script>
import store from "../../../store";
import validator from "@/validator";
import { mapGetters, mapActions } from "vuex";
import SFADisbursements from "./SFADisbursements.vue";
export default {
  components: { SFADisbursements },
  name: "Home",
  props: {
    fundingRequestId: Number,
  },
  data() {
    return {
      assessed_date_menu: false,
      classes_start_date_menu: false,
      classes_end_date_menu: false,
      effective_rate_date_menu: false,
    };
  },
  computed: {
    ...mapGetters({
      assessment: "assessmentSTA",
      disbursements: "disbursementListSTA",
      assessment: "assessmentSTA",
      application: "selectedApplication",
      cities: "cities",
      changeReasons: "changeReasons",
      disbursementTypes: "disbursementTypes",
    }),
    institutionCode() {
      return this.application?.institution?.federal_institution_code || "";
    },
  },
  methods: {
    ...mapActions({
      exit: "resetAssessmetSTA",
      saveSTAAssessment: "saveSTAAssessment",
      addDisburse: "addItemDisbursementListSTA",
      cancelDisburse: "cancelItemDisbursementListSTA",
      removeSTADisbursement: "removeSTADisbursement",
      refresh: "refreshSTA",
      disburse: "disburseSTA",
    }),
    save() {
      this.saveSTAAssessment(this);
    },
    removeDisbursement(id, index) {
      console.log("removeDisbursement", id, index);

      this.$refs.confirm.show(
        "Are you sure?",
        "Click 'Confirm' below to permanently remove this disbursement.",
        () => {
          this.removeSTADisbursement({ index, disbursement_id: id, vm: this });
        },
        () => {}
      );
    },
    removeDisbursement2({ id, index }) {
      console.log("removeDisbursement2", id, index);

      if (id) {
        this.$refs.confirm.show(
          "Are you sure?",
          "Click 'Confirm' below to permanently remove this disbursement.",
          () => {
            this.removeSTADisbursement({ index, disbursement_id: id, vm: this });
          },
          () => {}
        );
      } else {
        this.cancelDisburse({ index });
      }
    },
  },
  async created() {
    this.validate = validator;
    this.applicationId = this.$route.params.id;
    let storeApp = store.getters.selectedApplication;
    if (this.applicationId != storeApp.HISTORY_DETAIL_ID) {
      await store.dispatch("loadApplication", this.applicationId);
    }
    store.dispatch("setAppSidebar", true);
    store.dispatch("setCities");
    store.dispatch("setChangeReasons");
    store.dispatch("setDisbursementTypes");
    store.dispatch("staGetAssessment", { funding_request_id: this.fundingRequestId });
  },
};
</script>
