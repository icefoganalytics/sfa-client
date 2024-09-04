<template>
  <div class="yukon-grant-assessment">
    <div class="row mb-3">
      <div class="col-md-12">
        <v-card class="bg-color-blue">
          <div class="col-lg-12 nopadding d-flex flex-wrap low-margin">
            <v-card-title class="col-xs-12 col-lg-8">Assessment - Yukon Grant</v-card-title>
            <div class="col-xs-12 col-lg-4 nopadding d-flex">
              <div class="col-xs-4 col-sm-4">
                <v-btn
                  :readonly="!isPreviewCharged && !isChanging && !editingDisburse"
                  dense
                  color="green"
                  class="my-0"
                  block
                  @click="saveClick"
                  >SAVE
                </v-btn>
              </div>
              <div class="col-xs-4 col-sm-4">
                <v-btn
                  :readonly="!isPreviewCharged && !isChanging && !editingDisburse"
                  dense
                  color="orange"
                  class="my-0"
                  block
                  @click="
                    (e) => {
                      if (!customAssessment?.id) {
                        $emit('close');
                        $store.dispatch('setIsPreviewCharged', false);
                        $store.dispatch('getDisbursements', {
                          application_id: this.application.id,
                          funding_request_id: customAssessment?.funding_request_id,
                        });
                        editingDisburse = false;
                      } else {
                        $store.dispatch('setIsPreviewCharged', false);
                        $store.dispatch('getDisbursements', {
                          application_id: this.application.id,
                          funding_request_id: customAssessment?.funding_request_id,
                        });
                        editingDisburse = false;
                        cancelEdition();
                      }
                    }
                  "
                >
                  CANCEL
                </v-btn>
              </div>
              <div class="col-xs-4 col-sm-4">
                <v-btn @click="$emit('close')" dense color="red" class="my-0" block>
                  EXIT
                </v-btn>
              </div>
            </div>
          </div>
          <v-card-text class="nopadding d-flex flex-wrap">
            <div class="col-xs-12 col-lg-8 nopadding left-block-container">
              <div class="col-xs-12 col-lg-12 nopadding d-flex mobile-column-flex low-margin">
                <div class="col-xs-12 col-lg-4 nopadding d-flex flex-wrap">
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
                          :value="customAssessment.assessed_date?.slice(0, 10)"
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
                        @change="refreshData"
                        :value="customAssessment.assessed_date?.slice(0, 10)"
                        @input="
                          (e) => {
                            customAssessment.assessed_date = e;
                            assessed_date_menu = false;
                          }
                        "
                      ></v-date-picker>
                    </v-menu>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      :value="customAssessment.effective_rate_date?.slice(0, 10)"
                      label="Effective rate date"
                      append-icon="mdi-lock"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="#ddd"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12 mobile-noppading-bottom">
                    <v-select
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Program division"
                      :value="application.program_division"
                      @input="
                        (e) => {
                          if (programDivisionBack === null) {
                            programDivisionBack = application.program_division;
                          }
                          application.program_division = e;
                          customAssessment.program_division = e;
                        }
                      "
                      @change="refreshData"
                      :items="programDivisions"
                      item-text="description"
                      item-value="id"
                    ></v-select>
                  </div>
                </div>
                <div class="col-xs-12 col-lg-4 nopadding d-flex flex-wrap">
                  <div class="col-xs-12 col-lg-12 clss-st-date-re-order">
                    <v-text-field
                      :value="customAssessment.classes_start_date?.slice(0, 10)"
                      label="Classes start date"
                      append-icon="mdi-lock"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="#ddd"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12 clss-en-date-re-order mobile-low-margin">
                    <v-text-field
                      :value="customAssessment.classes_end_date?.slice(0, 10)"
                      label="Classes end date"
                      append-icon="mdi-lock"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="#ddd"
                    ></v-text-field>
                  </div>
                  <div
                    class="col-xs-12 col-lg-12 line-jump-height d-flex align-center help-txt-re-order mobile-noppading-top"
                  >
                    <v-text-field
                      :value="totalYGSTAFundWeeks"
                      label="YG STA Funded Weeks"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                    />
                  </div>
                </div>
                <div class="col-xs-12 col-lg-4 nopadding d-flex flex-wrap">
                  <div class="col-xs-12 col-lg-12">
                    <v-select
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Home community"
                      @change="refreshData"
                      v-model="customAssessment.home_city_id"
                      :items="cities"
                      item-text="description"
                      item-value="id"
                    ></v-select>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-select
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Destination city"
                      @change="refreshData"
                      v-model="customAssessment.destination_city_id"
                      :items="cities"
                      item-text="description"
                      item-value="id"
                    ></v-select>
                  </div>
                  <div class="col-xs-12 col-lg-12 line-jump-height d-flex align-center not-displayed-sx">
                    <v-text-field
                      :value="totalYGSOTTravel"
                      label="YG Outside Travel Count"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                    />
                  </div>
                </div>
              </div>
              <div
                v-if="application?.academic_year_id < 2016"
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
                      label="Allowed months"
                      v-model="customAssessment.allowed_months"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Fraction of whole year"
                      v-model="customAssessment.years_funded_equivalent"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      readonly
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Years funded"
                      :value="customAssessment?.read_only_data?.years_funded ?? 0"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap mobile-low-margin">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Living costs"
                      v-model="customAssessment.living_costs"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Allowed tuition"
                      v-model="customAssessment.allowed_tuition"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Allowed books"
                      v-model="customAssessment.allowed_books"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      readonly
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Amount"
                      v-model="customAssessment.pre_leg_amount"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12 line-jump-height d-flex align-center not-displayed-sx"></div>
                  <div class="col-xs-12 col-lg-12 line-jump-height d-flex align-center not-displayed-sx"></div>
                </div>
              </div>
              <div class="col-xs-12 col-lg-12 nopadding d-flex mobile-column-flex low-margin flex-wrap">
                <div class="col-xs-12 col-lg-12 nopadding">
                  <v-card-title>Post Legislation Method</v-card-title>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap mobile-low-margin">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      readonly
                      outlined
                      dense
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Previous weeks"
                      :value="customAssessment?.read_only_data?.previous_weeks ?? 0"
                    ></v-text-field>
                  </div>
                  <div
                    class="col-xs-12 col-lg-12 line-jump-height d-flex align-center not-displayed-sx not-displayed-sx-md"
                  ></div>
                </div>
                <div class="col-xs-12 col-sm-4 col-lg-4 nopadding d-flex flex-wrap mobile-low-margin">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      readonly
                      dense
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Assessed weeks"
                      :value="customAssessment?.read_only_data?.assessed_weeks ?? 0"
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
                      readonly
                      dense
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Allowed weeks"
                      v-model="customAssessment.weeks_allowed"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      readonly
                      dense
                      background-color="#ddd"
                      append-icon="mdi-calculator"
                      hide-details
                      label="Weekly amount"
                      :value="formatMoney(customAssessment.weekly_amount)"
                    ></v-text-field>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-xs-12 col-lg-4 nopadding right-block-container">
              <div class="not-displayed-lg"></div>
              <div class="col-lg-12 nopadding d-flex line-jump-height">
                <div class="col-sm-4 col-lg-7 not-displayed-sx"></div>
                <div class="col-xs-12 col-sm-4 col-lg-5">
                  <v-btn @click="recalcAssessment" dense color="blue" class="my-0" block>
                    RE-CALC
                  </v-btn>
                </div>
              </div>
              <div class="col-lg-12 nopadding d-flex align-center flex-wrap">
                <div class="col-sm-6 col-lg-7 nopadding d-flex flex-wrap mobile-custom-border">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      readonly
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Travel allowance"
                      @keypress="validate.isNumber($event)"
                      v-model="customAssessment.travel_allowance"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      readonly
                      @keypress="validate.isNumber($event)"
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Airfare amount"
                      :value="
                        this.disbursements?.filter((d) => d.assessment_id === this.customAssessment?.id)?.length
                          ? 0
                          : customAssessment.airfare_amount
                      "
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-sm-6 col-lg-5 d-flex align-center nopadding-left mobile-custom-border-2">
                  <img class="not-displayed-sx" src="../../../../public/img/curly-brackets.png" />
                  <v-text-field
                    @keypress="validate.isNumber($event)"
                    outlined
                    dense
                    background-color="white"
                    hide-details
                    label="Disbursement period 1, 2..."
                    v-model="customAssessment.air_travel_disbursement_period"
                  ></v-text-field>
                </div>
                <div class="col-sm-6 col-lg-7 low-margin">
                  <v-text-field
                    outlined
                    dense
                    background-color="white"
                    hide-details
                    label="No. of disbursements"
                    v-model="customAssessment.disbursements_required"
                  ></v-text-field>
                </div>
              </div>
              <div class="col-lg-12 nopadding d-flex align-end flex-wrap">
                <div class="col-sm-6 col-lg-7 nopadding d-flex flex-wrap">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Adjust amount"
                      @keypress="validate.isNumber($event)"
                      v-model="customAssessment.assessment_adj_amount"
                      @change="refreshData"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      readonly
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Assessed amount"
                      v-model="customAssessment.assessed_amount"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12 low-margin mobile-noppading-bottom">
                    <v-text-field
                      readonly
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Previous disbursement"
                      :value="customAssessment?.read_only_data?.previous_disbursement ?? 0"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-sm-4 col-lg-5 d-flex nopadding line-jump-height align-center low-margin">
                  <div class="col-xs-12 col-lg-12 height-fit-content mobile-noppading-top">
                    <v-btn
                      :readonly="isDisburseBlocked"
                      @click="
                        (e) => {
                          if (!isDisburseBlocked) {
                            disburse();
                          }
                        }
                      "
                      dense
                      color="blue"
                      class="my-0"
                      block
                    >
                      DISBURSE
                    </v-btn>
                  </div>
                </div>
              </div>
              <div class="col-lg-12 nopadding d-flex align-center flex-wrap low-margin">
                <div class="col-sm-6 col-lg-7 nopadding d-flex flex-wrap">
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Over award"
                      v-model="customAssessment.over_award"
                      @change="refreshData"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Over disburse period"
                      v-model="customAssessment.over_award_disbursement_period"
                      @change="refreshData"
                    ></v-text-field>
                  </div>
                  <div class="col-xs-12 col-lg-12">
                    <v-text-field
                      readonly
                      outlined
                      dense
                      background-color="white"
                      hide-details
                      label="Net amount"
                      :value="customAssessment?.read_only_data?.net_amount ?? 0"
                    ></v-text-field>
                  </div>
                </div>
                <div class="col-sm-4 col-lg-5 d-flex nopadding line-jump-height align-center justify-center">
                  <div class="col-xs-12 col-lg-12 height-fit-content d-flex justify-center">
                    <v-switch v-model="customAssessment.over_award_applied_flg" @change="refreshData" label="Applied">
                    </v-switch>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <div class="">
      <Disbursement
        :assessmentId="customAssessment?.id"
        :fundingRequestId="customAssessment?.funding_request_id"
        v-on:showError="showError"
        v-on:showSuccess="showSuccess"
        v-on:blockDisburse="blockDisburse"
        v-on:currentEditing="currentEditing"
        ref="disburseComponent"
      ></Disbursement>
    </div>
    <confirm-dialog ref="confirm"></confirm-dialog>
  </div>
</template>
<script>
import store from "../../../store";
import { mapGetters } from "vuex";
import validator from "@/validator";
import Disbursement from "./Disbursement.vue";
import { isNumber } from "lodash";

export default {
  name: "YukonGrant",
  components: {
    Disbursement,
  },
  data() {
    return {
      assessmentSelected: null,
      assessed_date_menu: false,
      classes_start_date_menu: false,
      classes_end_date_menu: false,
      effective_rate_date_menu: false,
      isChanging: false,
      programDivisionBack: null,
      isDisburseBlocked: false,
      editingDisburse: false,
    };
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
    store.dispatch("setProgramDivisions");
    this.assessmentSelected = this.assessments?.[0].id || null;
  },
  props: {
    fundingRequestId: Number,
  },
  computed: {
    ...mapGetters([
      "assessments",
      "cities",
      "programDivisions",
      "customAssessment",
      "selectedAssessment",
      "disbursements",
      "setIsPreviewCharged",
      "isPreviewCharged",
      "previewDisbursementList",
      "disbursements",
    ]),
    ...mapGetters({ application: "selectedApplication" }),
    ...mapGetters({ student: "selectedStudent" }),
    programDivision() {
      return this.application?.program_division;
    },

    totalYGSTAFundWeeks() {
      const total =
        this.student.post_leg_weeks + this.student.pre_leg_weeks + Number(this.student.adj_yg_funding_weeks);
      return total || 0;
    },
    totalYGSOTTravel() {
      const total =
        this.student.post_leg_outside_travel +
        this.student.pre_leg_outside_travel +
        Number(this.student.adj_outside_travel_cnt);
      return total || 0;
    },
  },
  watch: {
    customAssessment: {
      deep: true,
      handler(val, oldVal) {
        const custom = JSON.parse(JSON.stringify(val));
        const selected = JSON.parse(JSON.stringify(this.selectedAssessment));

        this.isChanging = this.ObjCompare({ ...custom }, { ...selected });
      },
    },
    programDivision(val, oldVal) {
      const custom = JSON.parse(JSON.stringify(val));
      const selected = JSON.parse(JSON.stringify(this.selectedAssessment));

      if (this.programDivisionBack) {
        this.isChanging = this.ObjCompare({ ...custom }, { ...selected });
      }
    },
    disbursements: {
      deep: true,
      handler(val, oldVal) {},
    },
  },
  methods: {
    formatMoney(input) {
      if (isNumber(input)) {
        return Intl.NumberFormat("en", {
          currency: "USD",
          style: "currency",
        }).format(input);
      }
      return "asdf";
    },
    saveClick() {
      if (!this.customAssessment.id) {
        if (this.isPreviewCharged) {
          this.insertAssessmentWithDisbursement();
        } else {
          this.addAssessment();
        }
      } else {
        this.updateAssessment();
      }
    },

    ObjCompare(obj1, obj2) {
      delete obj1.read_only_data;
      delete obj2.read_only_data;

      const Obj1_keys = Object.keys(obj1);
      const Obj2_keys = Object.keys(obj2);

      if (Obj1_keys.length !== Obj2_keys.length) {
        return true;
      }
      for (let k of Obj1_keys) {
        if (obj1[k] !== obj2[k]) {
          return true;
        }
      }
      return false;
    },
    cancelEdition() {
      if (this.programDivisionBack !== null) {
        delete this.customAssessment.program_division;
        this.application.program_division = this.programDivisionBack;
        this.programDivisionBack = null;
      }
      const selected = JSON.parse(JSON.stringify(this.selectedAssessment));
      store.dispatch("setCustomAssessment", { ...selected });
      const custom = JSON.parse(JSON.stringify(this.customAssessment));
      this.isChanging = this.ObjCompare({ ...custom }, { ...selected });
      this.$refs.disburseComponent.closeEditor();
    },
    addAssessment() {
      store.dispatch("postAssessment", {
        application_id: this.application.id,
        funding_request_id: this.fundingRequestId,
        dataAssessment: { ...this.customAssessment },
        thisVal: this,
      });
    },
    updateAssessment() {
      console.log("UPDATE");
      const custom = JSON.parse(JSON.stringify(this.customAssessment));

      store.dispatch("updateApplication", ["program_division", this.application.program_division, this]);

      const filterDisbursements = this.disbursements.filter((d) => d.assessment_id === custom?.id) || [];

      store.dispatch("updateAssessment", {
        data: custom,
        disburseList: [...this.previewDisbursementList, ...filterDisbursements],
        application_id: this.application.id,
        funding_request_id: custom.funding_request_id,
        assessment_id: custom.id,
        thisVal: this,
      });
    },
    recalcAssessment() {
      console.log("RECALC");
      const custom = JSON.parse(JSON.stringify(this.customAssessment));
      if (this.programDivisionBack !== null) {
        delete this.customAssessment.program_division;
        this.application.program_division = this.programDivisionBack;
        this.programDivisionBack = null;
      }

      const filterDisbursements = this.disbursements.filter((d) => d.assessment_id === custom?.id) || [];

      store.dispatch("recalcAssessment", {
        application_id: this.application.id,
        funding_request_id: custom.funding_request_id,
        assessment_id: custom?.id || 0,
        disbursementList: [...this.previewDisbursementList, ...filterDisbursements],
      });
      //this.refreshData();
    },
    disburse() {
      store.dispatch("previewDisbursements", {
        application_id: this.application.id,
        assessment_id: this.customAssessment?.id || 0,
        data: { ...this.customAssessment, program_division: this.application.program_division },
        thisVal: this,
      });
    },
    blockDisburse(value) {
      if (!this.editingDisburse) {
        this.editingDisburse = value;
      }
    },
    currentEditing(value) {
      this.isDisburseBlocked = value;
    },
    /* insertDisburse() {
      if (this.isPreviewCharged && this.previewDisbursementList.length) {
        store.dispatch("postDisbursement", {
          data: [...this.previewDisbursementList],
          funding_request_id: this.customAssessment.funding_request_id,
          application_id: this.application.id,
          isList: "disburseList",
          emiter: this,
        });
      } else {
        !this.previewDisbursementList.length
          ? this.showError("No disburse in list")
          : this.showError("Something went wrong ");
      }
    }, */
    insertAssessmentWithDisbursement() {
      if (this.isPreviewCharged && this.previewDisbursementList.length) {
        store.dispatch("postAssessmentWithDisbursements", {
          application_id: this.application.id,
          funding_request_id: this.fundingRequestId,
          dataDisburse: [...this.previewDisbursementList],
          dataAssessment: { ...this.customAssessment },
          thisVal: this,
        });
      } else {
        !this.previewDisbursementList.length
          ? this.showError("No disburse in list")
          : this.showError("Something went wrong ");
      }
    },
    showSuccess(mgs) {
      this.$emit("showSuccess", mgs);
    },
    showError(mgs) {
      this.$emit("showError", mgs);
    },
    showAlert() {
      this.$refs.confirm.show(
        "Need to save assessment",
        "You have to save the assessment to add the disbursement",
        () => {},
        () => {},
        false,
        "Accept"
      );
    },
    refreshData() {
      console.log("REFRESH CALLED");
      const previewDisburseAmountsList =
        this.previewDisbursementList?.map((d) => {
          return Number(d.disbursed_amount);
        }) || [];

      const disburseFilter = this.disbursements?.filter((d) => d.assessment_id === this.customAssessment?.id);
      let disburseAmountsList = [];

      if (disburseFilter?.length) {
        disburseAmountsList =
          disburseFilter.map((d) => {
            return Number(d.disbursed_amount);
          }) || [];
      }

      store.dispatch("refreshAssessment", {
        application_id: this.application.id,
        data: { ...this.customAssessment, program_division: this.application.program_division },
        disburseAmountList: [...previewDisburseAmountsList, ...disburseAmountsList],
      });
    },
  },
};
</script>
<style scoped>
.right-block-container > div {
  border-left: 1px solid #ccc;
}
.not-displayed-lg {
  display: none;
}
.yukon-grant-assessment .right-block-container img {
  max-height: 80px !important;
  padding-right: 10px;
}
@media (max-width: 1263px) {
  .yukon-grant-assessment .right-block-container .not-displayed-lg {
    border-top: 1px solid #ccc;
  }
  .not-displayed-sx-md,
  .d-flex.not-displayed-sx-md {
    display: none;
  }
  .not-displayed-sx-md,
  .d-flex.not-displayed-sx-md {
    height: 0px !important;
    padding: 0px !important;
  }
}
@media (max-width: 599px) {
  .not-displayed-sx,
  .d-flex.not-displayed-sx {
    display: none;
  }
  .not-displayed-sx,
  .d-flex.not-displayed-sx {
    height: 0px !important;
    padding: 0px !important;
  }
}
</style>
