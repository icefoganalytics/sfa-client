<template>
  <div>
    <v-card class="default mb-5">
      <v-card-title class="text-h6 font-weight-regular">Institution</v-card-title>
      <v-card-text class="row">
        <div class="col-md-3">
          <div class="row">
            <div class="col-12 pr-md-0">
              <v-text-field
                outlined
                dense
                background-color="white"
                hide-details
                readonly
                label="Academic year"
                :items="yearOptions"
                append-icon="mdi-lock"
                :value="application.academic_year_id"
              ></v-text-field>
            </div>
            <div class="col-md-8">
              <div class="row">
                <div class="col-md-9">
                  <h3 class="text-subtitle-2 pt-md-2 my-sm-0 my-xs-0">Entering Year</h3>
                </div>
                <div class="col-md-3 px-md-0">
                  <v-text-field
                    outlined
                    dense
                    background-color="white"
                    hide-details
                    @keypress="validate.isNumber($event)"
                    @change="doSaveApp('program_year', application.program_year)"
                    v-model="application.program_year"
                  ></v-text-field>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="row">
                <div class="col-md-6">
                  <h3 class="text-subtitle-2 pt-md-2 my-sm-0 my-xs-0">of</h3>
                </div>
                <div class="col-md-6 px-md-0">
                  <v-text-field
                    outlined
                    dense
                    background-color="white"
                    hide-details
                    @keypress="validate.isNumber($event)"
                    @change="doSaveApp('program_year_total', application.program_year_total)"
                    v-model="application.program_year_total"
                  ></v-text-field>
                </div>
              </div>
            </div>
            <div class="col-md-12 pr-md-0">
              <v-text-field
                outlined
                dense
                background-color="white"
                hide-details
                label="Student number"
                v-model="application.student_number"
                @change="doSaveApp('student_number', application.student_number)"
              ></v-text-field>
            </div>
          </div>
        </div>
        <div class="col-md-9">
          <div class="row">
            <div class="col-md-12">
              <v-autocomplete
                outlined
                dense
                background-color="white"
                hide-details
                label="Institution"
                v-model="application.institution_campus_id"
                :items="institutionOptions"
                item-text="name"
                item-value="id"
                @change="doSaveApp('institution_campus_id', application.institution_campus_id)"
              ></v-autocomplete>
            </div>
            <div class="col-md-6">
              <v-text-field
                disabled
                outlined
                dense
                background-color="white"
                hide-details
                label="Address"
                v-model="selectedInstitution.address_line_1"
              ></v-text-field>
            </div>
            <div class="col-md-3">
              <v-text-field
                disabled
                outlined
                dense
                background-color="white"
                hide-details
                label="City"
                :value="cities.find((c) => c.id === selectedInstitution.address_city_id)?.description"
              ></v-text-field>
            </div>
            <div class="col-md-3">
              <v-text-field
                disabled
                outlined
                dense
                background-color="white"
                hide-details
                label="Province"
                :value="provinces.find((c) => c.id === selectedInstitution.address_province_id)?.description"
              ></v-text-field>
            </div>
            <div class="col-md-2">
              <v-text-field
                disabled
                outlined
                dense
                background-color="white"
                hide-details
                label="Postal code"
                :value="selectedInstitution.address_postal_code"
              ></v-text-field>
            </div>
            <div class="col-md-2">
              <v-text-field
                disabled
                outlined
                dense
                background-color="white"
                hide-details
                label="Country"
                :value="countries.find((c) => c.id === selectedInstitution.address_country_id)?.description"
              ></v-text-field>
            </div>
            <div class="col-md-2">
              <v-text-field
                disabled
                outlined
                dense
                background-color="white"
                hide-details
                label="Federal code"
                :value="selectedInstitution.federal_institution_code"
              ></v-text-field>
            </div>
            <div class="col-md-3">
              <v-text-field
                disabled
                outlined
                dense
                background-color="white"
                hide-details
                label="Institution level"
                :value="institutionLevels.find((i) => (i.id = selectedInstitution.institution_level_id))?.description"
              ></v-text-field>
            </div>
            <div class="col-md-3">
              <v-text-field
                disabled
                outlined
                dense
                background-color="white"
                hide-details
                label="FOS"
                readonly
                :value="application.field_program_code"
              ></v-text-field>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="default mb-5">
      <v-card-title class="text-h6 font-weight-regular">Program</v-card-title>
      <v-card-text class="row">
        <div class="col-md-4">
          <div class="row">
            <div class="col-md-12">
              <v-autocomplete
                outlined
                dense
                background-color="white"
                hide-details
                label="Study area"
                v-model="application.study_area_id"
                @change="doSaveApp('study_area_id', application.study_area_id)"
                :items="studyAreas"
                item-text="description"
                item-value="id"
              ></v-autocomplete>
            </div>
            <div class="col-md-6">
              <v-btn class="mt-0" color="success" @click="showPDF(76)">
                View PIF
              </v-btn>
            </div>
          </div>
        </div>
        <div class="col-md-8">
          <div class="row">
            <div class="col-md-6 px-1">
              <v-select
                outlined
                dense
                background-color="white"
                hide-details
                label="Program type"
                @change="doSaveApp('program_id', application.program_id)"
                v-model="application.program_id"
                :items="programs"
                item-text="description"
                item-value="id"
              ></v-select>
            </div>
            <div class="col-md-6 px-1">
              <v-select
                outlined
                dense
                background-color="white"
                hide-details
                label="Program division"
                :items="programDivisions"
                item-text="description"
                item-value="id"
                v-model="application.program_division"
                @change="doSaveApp('program_division', application.program_division)"
              ></v-select>
            </div>
            <div class="col-md-6 px-1">
              <v-select
                outlined
                dense
                background-color="white"
                hide-details
                label="Attendance"
                :items="attendances"
                item-text="description"
                item-value="id"
                v-model="application.attendance_id"
                @change="doSaveApp('attendance_id', application.attendance_id)"
              ></v-select>
            </div>
            <div class="col-md-6 px-1">
              <v-switch
                class="my-0"
                hide-details
                label="By correspondance"
                v-model="application.is_correspondence"
                @change="doSaveApp('is_correspondence', application.is_correspondence)"
              ></v-switch>
            </div>
            <div class="col-md-6 px-1">
              <v-menu
                v-model="classes_start_menu"
                :close-on-content-click="false"
                transition="scale-transition"
                left
                nudge-top="26"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    :value="application.classes_start_date?.slice(0, 10)"
                    label="Class start date"
                    append-icon="mdi-calendar"
                    readonly
                    outlined
                    hide-details
                    dense
                    background-color="white"
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  :value="application.classes_start_date?.slice(0, 10)"
                  @input="
                    (e) => {
                      application.classes_start_date = e;
                      classes_start_menu = false;
                    }
                  "
                  :min="minStartDate"
                  :max="maxStartDate"
                  @change="doSaveApp('classes_start_date', application.classes_start_date)"
                ></v-date-picker>
              </v-menu>
            </div>
            <div class="col-md-6 px-1">
              <v-menu
                v-model="classes_end_menu"
                :close-on-content-click="false"
                transition="scale-transition"
                left
                nudge-top="26"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    :value="application.classes_end_date?.slice(0, 10)"
                    label="Class end date"
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
                  :value="application.classes_end_date?.slice(0, 10)"
                  @input="
                    (e) => {
                      application.classes_end_date = e;
                      classes_end_menu = false;
                    }
                  "
                  @change="doSaveApp('classes_end_date', application.classes_end_date)"
                ></v-date-picker>
              </v-menu>
            </div>
          </div>
          <v-alert type="warning" dense class="mt-4" v-if="totalDays > 365"
            >There are {{ totalDays }} between the Class start date and Class end date</v-alert
          >
        </div>
      </v-card-text>
    </v-card>

    <show-pdf ref="showPdf"> </show-pdf>
  </div>
</template>

<style>
.v-expansion-panel {
  height: 38px;
}
.v-expansion-panel--active {
  height: auto;
}
</style>

<script>
import store from "../../store";
import axios from "axios";
import moment from "moment";
import validator from "@/validator";
import { INSTITUTION_URL, APPLICATION_URL } from "@/urls";
import { mapGetters, mapState, mapActions } from "vuex";
import { isArray } from "lodash";

export default {
  computed: {
    ...mapState("academicYearStore", ["academicYears"]),
    ...mapGetters([
      "yearOptions",
      "countries",
      "cities",
      "provinces",
      "institutionLevels",
      "studyAreas",
      "yukonGrantEligibilityList",
      "programs",
      "attendances",
      "programDivisions",
    ]),
    student: function() {
      return store.getters.selectedStudent;
    },
    application: function() {
      return store.getters.selectedApplication;
    },
    selectedInstitution() {
      const finded = this.institutionOptions.find((i) => i.id === this.application.institution_campus_id);
      return finded ? finded : {};
    },

    academicYear() {
      if (this.application && this.application.academic_year_id && this.academicYears && isArray(this.academicYears)) {
        return this.academicYears.find((a) => a.id == this.application.academic_year_id);
      }

      return null;
    },

    minStartDate() {
      if (this.academicYear) {
        return this.academicYear.start_date;
      }
    },
    maxStartDate() {
      if (this.academicYear) {
        return this.academicYear.end_date;
      }
    },

    totalDays() {
      if (this.application && this.application.classes_start_date && this.application.classes_end_date) {
        return moment(this.application.classes_end_date).diff(this.application.classes_start_date, "days");
      }
      return 0;
    },
  },
  data: () => ({
    validate: {},
    institutionOptions: [],

    classes_start_menu: null,
    classes_end_menu: null,
  }),
  async mounted() {
    this.validate = validator;
    this.loadInstitutions();
    store.dispatch("setCountries");
    store.dispatch("setProvinces");
    store.dispatch("setCities");
    store.dispatch("setInstitutionLevels");
    store.dispatch("setStudyAreas");
    store.dispatch("setYukonGrantEligibility");
    store.dispatch("setPrograms");
    store.dispatch("setProgramDivisions");
    store.dispatch("setAttendances");
    await this.loadAcademicYears();
  },
  methods: {
    ...mapActions("academicYearStore", ["loadAcademicYears"]),
    loadInstitutions() {
      axios
        .get(`${INSTITUTION_URL}`)
        .then((resp) => {
          this.institutionOptions = resp.data.data
            .map((data) => {
              const campuses = data.campuses?.map((c) => ({
                ...c,
                name: `${c.name} - ${data.name}`,
                institution_level_id: data.institution_level_id,
              }));
              return [...campuses];
            })
            .flat();
        })
        .catch((err) => {
          console.log(err);
        });
    },

    doSaveApp(field, value) {
      store.dispatch("updateApplication", [field, value, this]);
    },

    async showPDF(reqId) {
      try {
        let buf = await fetch(
          `${APPLICATION_URL}/${this.application.id}/student/${this.student.id}/files/${reqId}`
        ).then((r) => r.arrayBuffer());
        const blob = new Blob([buf], { type: "application/pdf" });
        const blobURL = URL.createObjectURL(blob) || "";
        this.$refs.showPdf.showModal(blobURL);
      } catch (error) {
        console.log(error);
      }
    },
  },
};
</script>
