<template>
  <div>
    <v-card class="default">
      <v-card-text>
        <h3 class="text-h6 font-weight-regular">CSFA Restriction</h3>
        <div class="row">
          <div class="col-md-4">
            <v-text-field
              class="mb-5"
              outlined
              dense
              disabled
              background-color="white"
              hide-details
              label="Restrict / Warning Code"
              v-model="restrict_code_comp"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              disabled
              background-color="white"
              hide-details
              label="Type"
              v-model="restrict_type_comp"
            ></v-text-field>
          </div>
          <div class="col-md-8">
            <v-textarea
              outlined
              dense
              disabled
              background-color="white"
              hide-details
              label="Definition"
              v-model="restrict_definition_comp"
            ></v-textarea>
          </div>

          <div class="col-md-4">
            <v-text-field
              class="mb-5"
              outlined
              dense
              disabled
              background-color="white"
              hide-details
              label="Reason Code"
              v-model="reason_code_comp"
            ></v-text-field>
            <v-text-field
              outlined
              dense
              disabled
              background-color="white"
              hide-details
              label="Type"
              v-model="reason_type_comp"
            ></v-text-field>
          </div>
          <div class="col-md-8">
            <v-textarea
              outlined
              dense
              disabled
              background-color="white"
              hide-details
              label="Definition"
              v-model="reason_definition_comp"
            ></v-textarea>
          </div>

          <div class="col-md-4">
            <v-menu
              v-model="clearance_received_menu"
              :close-on-content-click="false"
              transition="scale-transition"
              left
              nudge-top="26"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  :value="application.csl_clearance_date?.slice(0, 10)"
                  label="Clearance received date"
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
                :value="application.csl_clearance_date?.slice(0, 10)"
                @input="
                  (e) => {
                    application.csl_clearance_date = e;
                    check_completion_menu = false;
                  }
                "
                @change="doSaveApp('csl_clearance_date', application.csl_clearance_date)"
              ></v-date-picker>
            </v-menu>
          </div>
          <div class="col-md-8">
            <v-textarea
              outlined
              dense
              background-color="white"
              hide-details
              label="Comment"
              v-model="application.csl_restriction_comment"
              @input="
                (e) => {
                  application.csl_restriction_comment = e;
                }
              "
              @change="doSaveApp('csl_restriction_comment', application.csl_restriction_comment)"
            ></v-textarea>
          </div>

          <!-- <div class="col-md-6">
            <v-text-field
              outlined
              dense
              background-color="white"
              hide-details
              label="CSL Over awards"
              v-model="student.pre_over_award_amount"
              @change="
                doSaveStudent(
                  'pre_over_award_amount',
                  student.pre_over_award_amount,
                  'studentInfo',
                  student.id
                )
              "
              v-currency="{ currency: 'USD', locale: 'en' }"
            ></v-text-field>
          </div> -->

          <div class="col-md-12">
            <hr />
            <h4 class="mt-2">
              Canada Student Loan Scholastic Standard Warning
            </h4>
          </div>

          <div class="col-md-6">
            <v-select
              outlined
              dense
              background-color="white"
              hide-details
              label="Scholastic warning code"
              :items="cslCodes"
              item-text="data"
              item-value="id"
              v-model="warningOptions"
              @change="
                () => {
                  doSaveStudent('csl_warn_code', student.csl_warn_code, 'studentInfo', student.id);
                }
              "
            ></v-select>
          </div>
          <div class="col-md-6">
            <v-menu
              v-model="scholastic_letter_menu"
              :close-on-content-click="false"
              transition="scale-transition"
              left
              nudge-top="26"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  :value="student.csl_letter_date?.slice(0, 10)"
                  label="Letter required date"
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
                :value="student.csl_letter_date?.slice(0, 10)"
                @input="
                  (e) => {
                    student.csl_letter_date = e;
                    scholastic_letter_menu = false;
                  }
                "
                @change="doSaveStudent('csl_letter_date', student.csl_letter_date, 'studentInfo', student.id)"
              ></v-date-picker>
            </v-menu>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import store from "@/store";
import { mapGetters } from "vuex";
export default {
  computed: {
    warningOptions: {
      get() {
        console.log(typeof this.student.csl_warn_code);
        return parseInt(this.student.csl_warn_code);
      },
      set(val) {
        this.student.csl_warn_code = val;
      },
    },
    ...mapGetters(["cslCodes"]),
    application: function() {
      return store.getters.selectedApplication;
    },
    student: function() {
      return store.getters.selectedStudent;
    },
    restrict_code_comp: {
      get() {
        if (this.application.warning_code) {
          //return this.restrict_code;
          return this.application.warning_code.warning_code;
        } else {
          return "";
        }
      },
    },
    restrict_type_comp: {
      get() {
        if (this.application.warning_code) {
          return this.application.warning_code.code_type;
        } else {
          return "";
        }
      },
    },
    restrict_definition_comp: {
      get() {
        if (this.application.warning_code) {
          return this.application.warning_code.definition;
        } else {
          return "";
        }
      },
    },
    reason_code_comp: {
      get() {
        if (this.application.reason_code) {
          return this.application.reason_code.reason_code;
        } else {
          return "";
        }
      },
    },
    reason_type_comp: {
      get() {
        if (this.application.reason_code) {
          return this.application.reason_code.code_type;
        } else {
          return "";
        }
      },
    },
    reason_definition_comp: {
      get() {
        if (this.application.reason_code) {
          return this.application.reason_code.definition;
        } else {
          return "";
        }
      },
    },
  },
  data: () => ({
    clearance_received_menu: null,
    scholastic_letter_menu: null,
    //scholasticWarningOptions: ["Missing class", "No homework"],
    scholasticWarningOptions: [
      { acc: "MC", description: "Missing class" },
      { acc: "NH", description: "No homework" },
    ],
    restrict_code: "",
    restrict_type: "",
    restrict_definition: "",
    reason_code: "",
    reason_type: "",
    reason_definition: "",
    clearance_received_date: null,
    clearance_comment: "",
    over_awards: 0,
    scholastic_warning_code: "",
    scholastic_letter_date: null,
  }),
  async created() {
    store.dispatch("setCslCodes");
  },
  methods: {
    doSaveStudent(field, value, type, extraId = null, addressType = "") {
      store.dispatch("updateStudent", [field, value, type, extraId, this, addressType]);
    },
    concatenateText(item) {
      return this.cslCodes.id + " - " + this.cslCodes.definition;
    },
    doSaveApp(field, value) {
      store.dispatch("updateApplication", [field, value, this]);
    },
  },
};
</script>
