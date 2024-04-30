<template>
  <v-dialog v-model="visible" persistent max-width="600px">
    <v-card>
      <v-toolbar dark color="primary">
        <v-toolbar-title>Create Application</v-toolbar-title>
        <v-spacer />

        <v-icon @click="hide">mdi-close</v-icon>
      </v-toolbar>
      <v-card-text>
        <v-divider class="mb-5"></v-divider>
        <v-form v-model="valid">
          <v-text-field
            :value="studentName"
            dense
            outlined
            label="Student"
            readonly
            append-icon="mdi-lock"
          ></v-text-field>

          <v-row>
            <v-col>
              <v-menu
                v-model="startDateMenu"
                transition="scale-transition"
                right
                min-width="auto"
                :close-on-content-click="false"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    :value="startDate"
                    label="Class start date"
                    append-icon="mdi-calendar"
                    readonly
                    outlined
                    dense
                    background-color="white"
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker v-model="startDate"></v-date-picker>
              </v-menu>
            </v-col>

            <v-col>
              <v-text-field
                label="Academic year"
                outlined
                dense
                :value="academicYearId"
                append-icon="mdi-calculator"
                :rules="requiredRule"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-alert type="error" v-if="academicYear && academicYear.status != 'Open'">
            {{ startDate }} falls in Academic yearear {{ academicYear.id }} which is currently '{{
              academicYear.status
            }}'
          </v-alert>

          <v-autocomplete
            label="Institution"
            outlined
            dense
            :items="institutionOptions"
            item-text="name"
            item-value="id"
            v-model="institutionId"
            :rules="requiredRule"
          ></v-autocomplete>

          <v-btn color="primary" @click="create" :disabled="!valid">Create</v-btn>
          <v-btn color="secondary" class="float-right" @click="hide">Cancel</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import axios from "axios";
import store from "../../store";
import { APPLICATION_URL, INSTITUTION_URL } from "../../urls";
import { mapActions, mapState } from "vuex";

export default {
  data: () => ({
    visible: false,
    valid: false,
    institutionOptions: [],

    academicYear: null,
    academicYearId: "",
    startDate: null,
    startDateMenu: null,
    institutionId: null,
    requiredRule: [(v) => !!v || "This is required"],
  }),
  computed: {
    ...mapState({ student: "selectedStudent" }),
    ...mapState("academicYearStore", ["academicYears"]),
    studentName() {
      return this.student ? `${this.student.first_name} ${this.student.last_name}` : "";
    },
  },
  watch: {
    async startDate(nv) {
      let matchingYear = await this.getContainingYear(nv);
      this.academicYear = null;
      this.academicYearId = null;

      if (matchingYear && matchingYear.id) {
        this.academicYear = matchingYear;
        if (matchingYear.status == "Open") {
          this.academicYearId = matchingYear.id;
        }
      }
    },
  },
  async mounted() {
    await this.loadAcademicYears();
  },
  methods: {
    ...mapActions("academicYearStore", ["loadAcademicYears", "getContainingYear"]),
    show() {
      this.loadInstitutions();
      this.institutionId = null;
      this.academicYear = null;
      this.academicYearId = "";
      this.startDate = null;
      this.visible = true;
    },
    hide() {
      this.visible = false;
    },
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
    create() {
      if (this.student) {
        let body = {
          studentId: this.student.id,
          academicYear: this.academicYearId,
          institutionId: this.institutionId,
          classesStartDate: this.startDate,
        };

        axios.post(`${APPLICATION_URL}`, body).then((resp) => {
          this.$emit("showAPIMessages", resp.data);

          if (resp.data && resp.data.data && resp.data.data.id) {
            let newId = resp.data.data.id;
            this.visible = false;
            store.dispatch("clearStudent");
            store.dispatch("loadApplication", newId);
            this.$router.push(`/application/${newId}/personal`);
          }
        });
      }
    },
  },
};
</script>
