<template>
  <div v-if="assessment">
    <v-card-text>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            hide-details
            label="Assessment type"
            :value="assessmentTypes?.find((p) => p.id == assessment.assessment_type_id)?.description"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-menu
            v-model="assessed_date_menu"
            :close-on-content-click="false"
            transition="scale-transition"
            left
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="assessment.assessed_date"
                label="Assessed date"
                append-icon="mdi-calendar"
                hide-details
                readonly
                outlined
                dense
                background-color="white"
                v-bind="attrs"
                v-on="on"
              />
            </template>
            <v-date-picker v-model="assessment.assessed_date" @input="assessed_date_menu = false"></v-date-picker>
          </v-menu>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            hide-details
            label="Dependents"
            v-model="assessment.dependent_count"
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            hide-details
            label="Familiy size"
            v-model="assessment.family_size"
          />
        </v-col>
      </v-row>
      <v-divider class="my-5" />
      <h3 class="mb-5">Pre-Study Period</h3>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            :value="formatDate(assessment.pstudy_start_date)"
            label="Start date"
            readonly
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
          ></v-text-field>
          <v-text-field
          :value="formatDate(assessment.pstudy_end_date)"
            label="End date"
            hide-details
            readonly
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            label="Province"
            :value="provinces?.find((p) => p.id == assessment.prestudy_province_id)?.description"
          />
          <v-row>
            <v-col>
              <v-text-field
                outlined
                dense
                background-color="#ddd"
                append-icon="mdi-calculator"
                readonly
                hide-details
                label="Weeks"
                v-model="assessment.pstudy_weeks"
              />
            </v-col>
            <v-col>
              <v-text-field
                outlined
                dense
                background-color="#ddd"
                append-icon="mdi-calculator"
                readonly
                hide-details
                label="Months"
                v-model="assessment.pstudy_months"
              />
            </v-col>
          </v-row>
        </v-col>
        <v-col>
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            label="Accommodation type"
            :value="accommodationTypes?.find((p) => p.id == assessment.prestudy_accom_code)?.description"
          />
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            hide-details
            label="Classification"
            :value="cslClassifications?.find((p) => p.id == assessment.prestudy_csl_classification)?.description"
          />
        </v-col>
      </v-row>
      <v-divider class="my-5" />
      <h3 class="mb-5">Study Period</h3>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="assessment.classes_start_date"
            label="Start date"
            readonly
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
          ></v-text-field>
          <v-text-field
            v-model="assessment.classes_end_date"
            label="End date"
            hide-details
            readonly
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            label="Province"
            :value="provinces?.find((p) => p.id == assessment.study_province_id)?.description"
          />
          <v-row>
            <v-col>
              <v-text-field
                outlined
                dense
                background-color="#ddd"
                append-icon="mdi-calculator"
                readonly
                hide-details
                label="Weeks"
                v-model="assessment.study_weeks"
              />
            </v-col>
            <v-col>
              <v-text-field
                outlined
                dense
                background-color="#ddd"
                append-icon="mdi-calculator"
                readonly
                hide-details
                label="Months"
                v-model="assessment.study_months"
              />
            </v-col>
          </v-row>
        </v-col>
        <v-col>
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            label="Accommodation type"
            :value="accommodationTypes?.find((p) => p.id == assessment.study_accom_code)?.description"
          />
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            hide-details
            label="Classification"
            :value="cslClassifications?.find((p) => p.id == assessment.csl_classification)?.description"
          />
        </v-col>
      </v-row>
      <v-divider class="my-5" />
      <h3 class="mb-5">Program Information</h3>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            label="Study area"
            :value="studyAreas?.find((s) => s.id == assessment.study_area_id)?.description"
          />
          <v-text-field
            outlined
            dense
            label="Study program"
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            :value="programs?.find((p) => p.id == assessment.program_id)?.description"
          />
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            hide-details
            label="Period"
            v-model="assessment.period"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="4"
          ><v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            label="Study province"
            :value="provinces?.find((p) => p.id == assessment.study_province_id)?.description"
          />
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            hide-details
            label="FOS code"
            v-model="application.field_program_code"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            label="Spouse province"
            :value="provinces?.find((p) => p.id == assessment.spouse_province_id)?.description"
          />
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            label="Study classification"
            :value="cslClassifications?.find((c) => c.id == assessment.csl_classification)?.description"
          />
          <v-text-field
            outlined
            dense
            background-color="#ddd"
            append-icon="mdi-lock"
            readonly
            hide-details
            label="Marital status"
            :value="maritalStatusList?.find((c) => c.id == assessment.marital_status_id)?.description"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </div>
</template>

<script>
import { isEmpty } from "lodash";
import moment from "moment";
import { mapGetters, mapState } from "vuex";

export default {
  data: () => ({
    assessed_date_menu: null,
  }),
  computed: {
    ...mapState({ application: "selectedApplication" }),
    ...mapGetters(["cslClassifications", "maritalStatusList", "provinces", "studyAreas", "programs", "accommodationTypes", "assessmentTypes"]),
    ...mapState("cslFullTimeStore", [ "assessment"]),
  },
  methods: {
    formatDate(input) {
      if (isEmpty(input)) return "";
      return moment.utc(input).format("YYYY-MM-DD");
    },
  },
};
</script>
