<template>
  <div v-if="assessment">
    <v-toolbar flat :color="assessableStatus.includes(fundingRequest.status_id) ? '#c7d4de' : 'error lighten-3'">
      <v-row>
        <v-col>
          <v-autocomplete
            :items="statusList"
            v-model="fundingRequest.status_id"
            item-text="description"
            item-value="id"
            dense
            outlined
            background-color="white"
            label="Status"
            @change="updateRequest"
            hide-details
          ></v-autocomplete>
        </v-col>
        <v-col>
          <v-autocomplete
            :items="statusReasons"
            v-model="fundingRequest.status_reason_id"
            item-text="description"
            item-value="id"
            dense
            outlined
            background-color="white"
            hide-details
            clearable
            label="Reason"
            @change="updateRequest"
          ></v-autocomplete>
        </v-col>
        <v-col>
          <v-text-field
            :value="formatDate(fundingRequest.status_date)"
            label="Status date"
            dense
            outlined
            readonly
            hide-details
            background-color="#ddd"
            append-icon="mdi-lock"
          />
        </v-col>
        <v-col class="text-right">
          <v-btn
            @click="recalculateClick"
            v-if="canSave && assessableStatus.includes(fundingRequest.status_id)"
            :disabled="!assessment.id"
            color="secondary"
            >Recalculate</v-btn
          >
        </v-col>
      </v-row>
    </v-toolbar>
    <v-card-text>
      <div v-if="assessableStatus.includes(fundingRequest.status_id)">
        <!--   <v-alert type="warning" v-if="pastThreshold">
          {{ pastThreshold }}
        </v-alert> -->

        <v-row>
          <v-col cols="12" md="3">
            <v-text-field
              label="Total study costs"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.total_costs)"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              label="Total resources"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.total_resources)"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              label="Assessed need"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.csl_assessed_need)"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              label="60% of assessed need"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.csl_assessed_need_pct)"
            />
          </v-col>

          <v-col cols="12" md="3"> </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              label="Total grants"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.total_grant_awarded)"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              label="Max allowable"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-lock"
              :value="formatMoney(assessment.max_allowable)"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              label="Calculated award"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.calculated_award)"
            />
          </v-col>
        </v-row>
        <v-divider class="my-5" />
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field
              label="Requested amount"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-lock"
              :value="formatMoney(assessment.csl_request_amount)"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              label="Overaward applied"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-lock"
              :value="formatMoney(assessment.over_award)"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              label="Returned/Uncashable"
              v-currency
              outlined
              dense
              hide-details
              background-color="white"
              v-model="assessment.return_uncashable_cert"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              label="Actual award"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.assessed_amount)"
            />
          </v-col>
        </v-row>
        <v-divider class="my-5" />
        <v-row>
          <v-col cols="12" md="3"> </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              label="Previous cert"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.previous_cert)"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              label="Previous disbursements"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.previous_disbursement)"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              label="Net amount"
              readonly
              outlined
              dense
              hide-details
              background-color="#ddd"
              append-icon="mdi-calculator"
              :value="formatMoney(assessment.net_amount)"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              label="Non-award reason"
              outlined
              dense
              hide-details
              background-color="white"
              v-model="assessment.csl_non_reason_id"
              :items="cslReasonNonAward"
              item-text="name"
              item-value="id"
            ></v-select>
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              label="Overaward reason"
              outlined
              dense
              hide-details
              background-color="white"
              v-model="assessment.csl_over_reason_id"
              :items="cslReasonOverAward"
              item-text="name"
              item-value="id"
            ></v-select>
          </v-col>

          <v-col cols="12" md="6" class="d-flex">
            <v-text-field
              label="No. of disbursements"
              type="number"
              step="1"
              outlined
              dense
              hide-details
              background-color="white"
              append-icon="mdi-pencil"
              v-model="disburseCount"
            />
            <v-btn color="primary" class="ml-3" @click="disburseClick">Disburse</v-btn>
          </v-col>
        </v-row>

        <v-alert v-if="assessment.net_overaward < 0" class="mt-4" dense type="warning"
          >This student has an outstanding overaward balance.</v-alert
        >

        <v-alert v-if="assessment.has_overaward_applied" class="mt-4" dense type="warning">
          This assessment has an overward applied.
        </v-alert>
        <v-alert v-if="assessment.has_overaward_recorded" class="mt-4" dense type="warning">
          This assessment has an overward recorded.
        </v-alert>
      </div>
      <v-divider class="my-5" />
      <cslft-disbursements v-on:showError="showError" v-on:showSuccess="showSuccess"></cslft-disbursements>
    </v-card-text>
  </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from "vuex";
import { isEmpty, isNumber } from "lodash";
import moment from "moment";
import CslftDisbursements from "../cslft-disbursements.vue";

export default {
  components: { CslftDisbursements },
  props: ["canSave"],
  data: () => ({
    disburseCount: 1,
    assessableStatus: [6, 7],
  }),
  computed: {
    ...mapGetters(["statusReasons", "statusList"]),
    ...mapState({ application: "selectedApplication" }),
    ...mapState("cslFullTimeStore", ["assessment", "fundingRequest"]),
    ...mapGetters(["cslReasonOverAward", "cslReasonNonAward"]),
  },
  methods: {
    ...mapActions("cslFullTimeStore", ["makeDisbursements", "recalculate", "updateFundingRequest"]),
    disburseClick() {
      this.makeDisbursements(this.disburseCount);
    },

    showSuccess(mgs) {
      this.$emit("showSuccess", mgs);
    },
    showError(mgs) {
      this.$emit("showError", mgs);
    },
    recalculateClick() {
      this.recalculate();
    },
    async updateRequest() {
      this.updateFundingRequest();
    },
    formatDate(input) {
      if (isEmpty(input)) return "";
      return moment.utc(input).format("YYYY-MM-DD");
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
  },
};
</script>
