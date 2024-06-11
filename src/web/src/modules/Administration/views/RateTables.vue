<template>
  <div>
    <v-breadcrumbs
      divider="/"
      large
      :items="[{ text: 'Administration Home', to: '/administration', exact: true }, { text: 'Rate Tables' }]"
    >
    </v-breadcrumbs>

    <h1>Rate Tables</h1>

    <div class="d-flex">
      <v-autocomplete
        label="Academic Year"
        :items="academicYears"
        v-model="selectedYear"
        outlined
        dense
        item-text="id"
        item-value="id"
      ></v-autocomplete>

      <v-btn class="mb-4 ml-4" :disabled="!canInitialize" color="primary" @click="initializeClick">
        Initialize all Rate Tables</v-btn
      >
    </div>
    <v-row v-if="selectedYear && rateTables">
      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openCsgLookup">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.csg_lookup.length" :expected="1" />
            CSG Lookup
          </v-toolbar>
          <v-card-text>{{ rateTables.csg_lookup.length }} of 1 row found</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openCslLookup">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.csl_lookup.length" :expected="1" /> CSL Lookup
          </v-toolbar>
          <v-card-text>{{ rateTables.csl_lookup.length }} of 1 row found</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openStaLookup">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.sta_lookup.length" :expected="1" />
            STA Lookup
          </v-toolbar>
          <v-card-text>{{ rateTables.sta_lookup.length }} of 1 row found</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openYgCost">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.yg_cost.length" :expected="1" />
            YG Cost
          </v-toolbar>
          <v-card-text>{{ rateTables.yg_cost.length }} of 1 row found</v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openParentContribution">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.parent_contribution_formula.length" :expected="3" />
            Parent Contribution
          </v-toolbar>
          <v-card-text>{{ rateTables.parent_contribution_formula.length }} of 3 rows found </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openCsgThreshold">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.csg_threshold.length" :expected="7" />
            CSG Threshold
          </v-toolbar>
          <v-card-text> {{ rateTables.csg_threshold.length }} of 7 rows found (7 family sizes) </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openChildCare">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.child_care_ceiling.length" :expected="13" />
            Child Care Ceiling
          </v-toolbar>
          <v-card-text>{{ rateTables.child_care_ceiling.length }} of 13 rows found (13 provinces) </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openStudentLiving">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.student_living_allowance.length" :expected="91" />
            Student Living Allowance
          </v-toolbar>
          <v-card-text
            >{{ rateTables.student_living_allowance.length }} of 91 rows found (13 provinces x 7 student categories)
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="default mb-5" @click="openStandardLiving">
          <v-toolbar flat color="#ffc850" dense>
            <BlockAvatar :count="rateTables.standard_of_living.length" :expected="117" />
            Standard of Living
          </v-toolbar>
          <v-card-text>
            {{ rateTables.standard_of_living.length }} of 117 rows found (13 provinces x 9 family sizes)
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <div v-else class="text-error">
      * Select an academic year
    </div>

    <v-dialog v-model="showEditor" persistent max-width="900px">
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title>{{ editorTitle }}</v-toolbar-title>
          <v-spacer />

          <v-icon @click="showEditor = false">mdi-close</v-icon>
        </v-toolbar>
        <v-card-text>
          <SingleRowEditor
            v-if="isSingleEdit"
            :selectedYear="selectedYear"
            :selectedItem="selectedItem"
            :tableName="tableName"
          />
          <MultiRowEditor v-else :selectedYear="selectedYear" :selectedItem="selectedItem" :tableName="tableName" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapActions, mapState } from "vuex";
import moment from "moment";
import CSGLookup from "../components/RateTables/CSGLookup.vue";
import BlockAvatar from "../components/RateTables/BlockAvatar.vue";
import SingleRowEditor from "../components/RateTables/SingleRowEditor.vue";
import MultiRowEditor from "../components/RateTables/MultiRowEditor.vue";

export default {
  name: "RateTables",
  components: { CSGLookup, BlockAvatar, SingleRowEditor, MultiRowEditor },
  data: () => ({
    selectedYear: null,
    showEditor: false,
    editorTitle: "",
    selectedItem: undefined,
    tableName: undefined,
    isSingleEdit: true,
  }),
  computed: {
    ...mapState("academicYearStore", ["academicYears"]),
    ...mapState("catalogStore", ["catalogOptions", "selectedCatalog", "selectedCatalogResults", "rateTables"]),

    catalogs() {
      return this.catalogOptions.map((c) => c.text);
    },
    canInitialize() {
      if (!this.rateTables) return false;

      return (
        this.rateTables.csg_lookup.length == 0 &&
        this.rateTables.csl_lookup.length == 0 &&
        this.rateTables.sta_lookup.length == 0 &&
        this.rateTables.yg_cost.length == 0 &&
        this.rateTables.parent_contribution_formula.length == 0 &&
        this.rateTables.csg_threshold.length == 0 &&
        this.rateTables.child_care_ceiling.length == 0 &&
        this.rateTables.student_living_allowance.length == 0 &&
        this.rateTables.standard_of_living.length == 0
      );
    },
  },
  async mounted() {
    await this.loadAcademicYears();
    await this.setProvinces();
    await this.setStudentCategories(false);
    await this.$store.dispatch("setAppSideBarAdmin", this.$route.path.startsWith("/administration"));
  },
  watch: {
    selectedYear(nv) {
      if (nv) {
        this.loadRateTables(nv);
      }
    },
  },
  methods: {
    ...mapActions("academicYearStore", ["loadAcademicYears", "select"]),
    ...mapActions(["setProvinces", "setStudentCategories"]),
    ...mapActions("catalogStore", ["loadRateTables", "setCatalog", "saveCatalog", "initializeRateTables"]),

    initializeClick() {
      this.initializeRateTables(this.selectedYear).then(() => {
        this.loadRateTables(this.selectedYear);
      });
    },
    openCsgLookup() {
      this.editorTitle = "CSG Lookup for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.csg_lookup[0];
      this.tableName = "csg_lookup";
      this.isSingleEdit = true;
      this.showEditor = true;
    },
    openCslLookup() {
      this.editorTitle = "CSL Lookup for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.csl_lookup[0];
      this.tableName = "csl_lookup";
      this.isSingleEdit = true;
      this.showEditor = true;
    },
    openStaLookup() {
      this.editorTitle = "STA Lookup for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.sta_lookup[0];
      this.tableName = "sta_lookup";
      this.isSingleEdit = true;
      this.showEditor = true;
    },
    openYgCost() {
      this.editorTitle = "YG Cost for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.yg_cost[0];
      this.tableName = "yg_cost";
      this.isSingleEdit = true;
      this.showEditor = true;
    },
    openParentContribution() {
      this.editorTitle = "Parent Contibution for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.parent_contribution_formula;
      this.tableName = "parent_contribution_formula";
      this.isSingleEdit = false;
      this.showEditor = true;
    },

    openCsgThreshold() {
      this.editorTitle = "CSG Threshold for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.csg_threshold;
      this.tableName = "csg_threshold";
      this.isSingleEdit = false;
      this.showEditor = true;
    },
    openChildCare() {
      this.editorTitle = "Child Care Ceiling for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.child_care_ceiling;
      this.tableName = "child_care_ceiling";
      this.isSingleEdit = false;
      this.showEditor = true;
    },
    openStudentLiving() {
      this.editorTitle = "Student Living Allowance for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.student_living_allowance;
      this.tableName = "student_living_allowance";
      this.isSingleEdit = false;
      this.showEditor = true;
    },
    openStandardLiving() {
      this.editorTitle = "Standard of Living for Academic Year " + this.selectedYear;
      this.selectedItem = this.rateTables.standard_of_living;
      this.tableName = "standard_of_living";
      this.isSingleEdit = false;
      this.showEditor = true;
    },

    formatDate(input) {
      return moment.utc(input).format("YYYY-MM-DD");
    },
  },
};
</script>
