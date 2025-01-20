<template>
  <div>
    <v-card class="default">
      <v-card-title class="text-h6 font-weight-regular">Basic Demographics</v-card-title>
      <v-card-text>
        <div class="row">
          <div class="col-md-3">
            <v-select
              outlined
              dense
              background-color="white"
              hide-details
              label="Language"
              v-model="student.language_id"
              @change="doSaveStudent('language_id', student.language_id, 'personInfo', student.id)"
              :items="languages"
              item-value="id"
              item-text="description"
            ></v-select>
          </div>
          <div class="col-md-3">
            <v-select
              outlined
              dense
              background-color="white"
              hide-details
              label="Gender"
              v-model="student.sex_id"
              @change="doSaveStudent('sex_id', student.sex_id, 'personInfo', student.id)"
              :items="sexes"
              item-value="id"
              item-text="description"
            ></v-select>
          </div>
          <div class="col-md-3">
            <v-menu
              v-model="show_menu"
              :close-on-content-click="false"
              transition="scale-transition"
              left
              nudge-top="26"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  label="Birth Date"
                  append-icon="mdi-calendar"
                  :value="student.birth_date?.slice(0, 10)"
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
                :value="student.birth_date?.slice(0, 10)"
                @input="
                  (e) => {
                    student.birth_date = e;
                    show_menu = false;
                  }
                "
                @change="doSaveStudent('birth_date', student.birth_date, 'personInfo', student.id)"
              ></v-date-picker>
            </v-menu>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="default mt-5">
      <v-card-title class="text-h6 font-weight-regular">Statistical Demographics</v-card-title>
      <v-card-text>
        <div class="row">
          <div class="col-md-3">
            <v-select
              outlined
              dense
              background-color="white"
              hide-details
              label="Marital status"
              v-model="application.marital_status_id"
              item-text="description"
              item-value="id"
              :items="maritalStatusList"
              @change="doSaveApp('marital_status_id', application.marital_status_id)"
            ></v-select>
          </div>
          <div class="col-md-3">
            <v-select
              outlined
              dense
              background-color="white"
              hide-details
              label="Citizenship"
              v-model="application.citizenship_status"
              :items="citizenships"
              item-text="description"
              item-value="id"
              @change="doSaveApp('citizenship_status', application.citizenship_status)"
            ></v-select>
          </div>
          <div class="col-md-2">
            <v-select
              outlined
              dense
              background-color="white"
              label="Disability"
              hide-details
              v-model="disability"
              :items="disabilityOptions"
              @change="disabilityChanged"
            ></v-select>
          </div>
          <div class="col-md-2">
            <v-switch
              class="my-0"
              label="Visible Minority"
              v-model="application.is_minority"
              @change="doSaveApp('is_minority', application.is_minority)"
            >
            </v-switch>
          </div>
          <div class="col-md-2">
            <v-switch
              class="my-0"
              label="Crown Ward"
              v-model="student.is_crown_ward"
              @change="doSaveStudent('is_crown_ward', student.is_crown_ward, 'studentInfo', student.id)"
            >
            </v-switch>
          </div>
          <div class="col-md-3">
            {{ application.aborigal_status_id }}
            <v-select
              outlined
              dense
              background-color="white"
              hide-details
              label="Aboriginal status"
              v-model="application.aboriginal_status_id"
              item-text="description"
              item-value="id"
              :items="aboriginalStatusList"
              @change="doSaveApp('aboriginal_status_id', application.aboriginal_status_id)"
            ></v-select>
          </div>

          <div class="col-md-3">
            <v-select
              outlined
              dense
              background-color="white"
              hide-details
              label="Yukon First Nation"
              v-model="application.first_nation_id"
              item-text="description"
              item-value="id"
              :items="firstNations"
              @change="doSaveApp('first_nation_id', application.first_nation_id)"
            ></v-select>
          </div>

          <div class="col-md-6">
            <v-textarea
              rows="1"
              outlined
              dense
              background-color="white"
              hide-details
              label="Notes"
              v-model="application.stat_info_comment"
              @change="doSaveApp('stat_info_comment', application.stat_info_comment)"
            >
            </v-textarea>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-switch
      v-model="application.has_consent_to_share_data"
      @change="doSaveApp('has_consent_to_share_data', application.has_consent_to_share_data)"
      label="STEP and Grad CORP data sharing consent"
    >
    </v-switch>
  </div>
</template>

<script>
import store from "../../store";
import { mapGetters } from "vuex";

export default {
  computed: {
    ...mapGetters(["maritalStatusList", "aboriginalStatusList", "firstNations", "languages", "sexes", "citizenships"]),
    application: function() {
      return store.getters.selectedApplication;
    },
    student: function() {
      return store.getters.selectedStudent;
    },
  },
  data: () => ({
    show_menu: false,
    maritalOptions: [],
    aboriginalStatusOptions: [],
    firstNationOptions: [],
    disability: "",
    disabilityOptions: [
      { text: "No Disability", value: "None" },
      { text: "Permanent Disability", value: "Permanent" },
      { text: "Persistent / Prolonged Disability", value: "Persistent" },
      //{ text: "Other", value: "Other" },
    ],
  }),
  async created() {
    store.dispatch("setCitizenships");
    store.dispatch("setMaritalStatusList");
    store.dispatch("setAboriginalStatusList");
    store.dispatch("setFirstNations");
    store.dispatch("setLanguages");
    store.dispatch("setSexes");
    store.dispatch("setFirstNations");
    this.updateView(this.application);
  },
  methods: {
    updateView(application) {
      if (application.is_disabled && application.is_perm_disabled) this.disability = "Permanent";
      else if (application.is_disabled && !application.is_perm_disabled) this.disability = "Persistent";
      else this.disability = "None";
    },

    doSaveStudent(field, value, type, extraId = null, addressType = "") {
      store.dispatch("updateStudent", [field, value, type, extraId, this, addressType]);
    },
    doSaveApp(field, value) {
      store.dispatch("updateApplication", [field, value, this]);
    },
    disabilityChanged() {
      if (this.disability == "Permanent") {
        this.doSaveApp("is_disabled", true);
        this.doSaveApp("is_perm_disabled", true);
      } else if (this.disability == "Persistent") {
        this.doSaveApp("is_disabled", true);
        this.doSaveApp("is_perm_disabled", false);
      } else {
        this.doSaveApp("is_disabled", false);
        this.doSaveApp("is_perm_disabled", false);
      }
    },
  },
};
</script>
