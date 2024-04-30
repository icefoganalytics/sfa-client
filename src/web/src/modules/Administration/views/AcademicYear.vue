<template>
  <div>
    <v-breadcrumbs
      divider="/"
      large
      :items="[{ text: 'Administration Home', to: '/administration', exact: true }, { text: 'Academic Years' }]"
    >
    </v-breadcrumbs>

    <h1>Academic Years</h1>

    <v-card class="default mb-5">
      <v-card-text>
        <v-row>
          <v-col>
            <v-data-table :headers="headers" :items="academicYears" class="row-clickable" @click:row="rowClick">
              <template #item.start_date="{item}"> {{ item.start_date }}</template>
              <template #item.end_date="{item}"> {{ item.end_date }}</template>
              <template #item.is_open_in_portal="{item}">
                <v-icon v-if="item.is_open_in_portal" color="success">mdi-check-bold</v-icon>
                <v-icon v-else color="error">mdi-close</v-icon>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <AcademicYearEditor />
  </div>
</template>

<script>
import { mapActions, mapState } from "vuex";
import moment from "moment";
import AcademicYearEditor from "@/modules/Administration/components/AcademicYearEditor.vue";

export default {
  name: "AcademicYear",
  components: { AcademicYearEditor },
  data: () => ({
    file: null,
    headers: [
      { text: "Year", value: "year" },
      { text: "Start date", value: "start_date" },
      { text: "End date", value: "end_date" },
      { text: "Status", value: "status" },
      { text: "Open in Portal", value: "is_open_in_portal", align: "center", sortable: false },
    ],
  }),
  computed: {
    ...mapState("academicYearStore", ["academicYears"]),
  },
  async mounted() {
    this.loadAcademicYears();
    await this.$store.dispatch("setAppSideBarAdmin", this.$route.path.startsWith("/administration"));
  },
  methods: {
    ...mapActions("academicYearStore", ["loadAcademicYears", "select"]),

    rowClick(item) {
      this.select(item);
    },

    formatDate(input) {
      return moment.utc(input).format("YYYY-MM-DD");
    },
  },
};
</script>
