<template>
  <div>
    <h2 class="mb-0">CSL Overaward</h2>

    <v-card class="default">
      <v-card-text>
        <div v-if="overawards.length == 0">
          This student does not currently have any CSL Overawards.
        </div>
        <div v-else>
          <v-data-table
            class="row-clickable"
            :items="overawards"
            :headers="overawardsHeaders"
            @click:row="overawardClick"
          >
            <template v-slot:item.create_date="{ item }">
              {{ formatDate(item.create_date) }} (Recorded {{ formatDateFromNow(item.create_date) }})
            </template>
            <template v-slot:item.amount="{ item }">
              {{ formatMoney(item.amount) }}
            </template>
            <template v-slot:foot>
              <tr style="background-color: #dedede;">
                <td class="px-4 py-3">
                  <strong>Net Overaward:</strong>
                </td>
                <td></td>
                <td class="px-4 py-3">
                  <strong>{{ formatMoney(netOveraward) }} </strong>
                </td>
                <td></td>
              </tr>
            </template>
            <template #item.application_id="{ item }">
              <v-chip v-if="item.application_id" color="primary" small @click.stop="applicationClick(item)">{{
                item.application_id
              }}</v-chip>
            </template>
          </v-data-table>
        </div>

        <v-btn class="mt-4" color="primary" @click="addOveraward">Add CSL Overaward</v-btn>
      </v-card-text>
    </v-card>

    <confirm-dialog ref="confirm"></confirm-dialog>

    <v-dialog v-model="showOverawardDialog" width="500" persistent>
      <v-card v-if="selectedOveraward">
        <v-toolbar dark height="50" color="info">
          {{ selectedOveraward.id ? "Edit" : "Add" }} CSL Overaward
          <v-spacer></v-spacer>
          <v-btn icon @click="showOverawardDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text class="pt-7">
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="selectedOveraward.academic_year_id"
                label="Academic Year"
                :items="academicYears"
                item-text="id"
                item-value="id"
                dense
                outlined
                hide-details
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="selectedOveraward.amount"
                v-currency
                label="Amount"
                required
                dense
                outlined
                hide-details
              />
            </v-col>
            <v-col>
              <v-textarea v-model="selectedOveraward.note" label="Note" dense outlined />
              <v-text-field
                v-if="selectedOveraward.id"
                :value="selectedOveraward.created_by"
                label="Created by"
                readonly
                append-icon="mdi-lock"
                background-color="#ddd"
                dense
                outlined
              />
            </v-col>
          </v-row>
          <div class="d-flex">
            <v-btn @click="saveOveraward" color="primary" :disabled="!canSaveOveraward">Save</v-btn>
            <v-spacer />
            <v-btn v-if="selectedOveraward.id" @click="deleteOveraward" color="error">Delete</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
    <confirm-dialog ref="confirm"></confirm-dialog>
  </div>
</template>
<script>
import { mapActions, mapState } from "vuex";
import moment from "moment";
import store from "../../store";
import { isEmpty, isNumber } from "lodash";
import { clone } from "lodash";

export default {
  components: {},
  data: () => ({
    studentId: null,
    overawardsHeaders: [
      { text: "Date", value: "create_date" },
      { text: "Academic Year", value: "academic_year_id" },
      { text: "Amount", value: "amount" },
      { text: "Application", value: "application_id" },
    ],
    showOverawardDialog: false,
    selectedOveraward: null,
  }),
  computed: {
    ...mapState("overawardStore", ["overawards", "netOveraward"]),
    ...mapState("academicYearStore", ["academicYears", "currentAcademicYear"]),
    student: function() {
      return store.getters.selectedStudent;
    },
    canSaveOveraward() {
      return this.selectedOveraward && this.selectedOveraward.academic_year_id && this.selectedOveraward.amount;
    },
  },
  async mounted() {
    const { id } = this.$route.params;

    this.studentId = id;
    await this.loadOverawards();
    await this.loadAcademicYears();

    console.log(this.currentAcademicYear);
  },
  methods: {
    ...mapActions("overawardStore", ["load", "add", "update", "delete"]),
    ...mapActions("academicYearStore", ["loadAcademicYears"]),

    async loadOverawards() {
      await this.load({ studentId: this.studentId });
    },

    overawardClick(item) {
      this.selectedOveraward = clone(item);
      this.showOverawardDialog = true;
    },

    applicationClick(item) {
      if (item.application_id && item.funding_request_id && item.assessment_id)
        this.$router.push(`/application/${item.application_id}/cslft/${item.funding_request_id}/${item.assessment_id}`);
    },

    async saveOveraward() {
      if (this.selectedOveraward) {
        if (this.selectedOveraward.id) {
          await this.update(this.selectedOveraward);
        } else {
          await this.add(this.selectedOveraward);
        }

        await this.loadOverawards();
        this.showOverawardDialog = false;
        this.$emit("showSuccess", "Overaward saved");
      }
    },

    async addOveraward() {
      this.selectedOveraward = { student_id: this.studentId, academic_year_id: this.currentAcademicYear, note: "" };
      this.showOverawardDialog = true;
    },

    async deleteOveraward() {
      this.$refs.confirm.show(
        "Are you sure?",
        "Click 'Confirm' below to permanently remove this Overaward.",
        async () => {
          await this.delete({ id: this.selectedOveraward.id });

          await this.loadOverawards();
          this.showOverawardDialog = false;
          this.$emit("showSuccess", "Overaward removed");
        },
        () => {}
      );
    },
    formatDate(input) {
      if (isEmpty(input)) return "";
      return moment.utc(input).format("YYYY-MM-DD");
    },
    formatDateFromNow(input) {
      if (isEmpty(input)) return "";
      return moment.utc(input).fromNow();
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
