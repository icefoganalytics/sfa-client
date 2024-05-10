<template>
  <div>
    <v-breadcrumbs
      divider="/"
      large
      :items="[
        {
          text: 'Administration Home',
          to: '/administration',
          exact: true,
        },
        {
          text: 'Catalogs',
          to: '/administration/catalogs',
          exact: true,
        },
      ]"
    >
    </v-breadcrumbs>
    <h1>Catalogs</h1>
    <v-divider></v-divider>

    <v-row class="mt-3">
      <v-col cols="12" md="9">
        <v-select label="Choose a table" :items="catalogOptions" v-model="catalog" return-object outlined dense />
        <div>
          <div v-for="item of selectedCatalog?.parameters">
            <v-select
              v-if="item.options"
              :items="catalogOptions"
              :item-text="item.itemText"
              :item-value="item.itemValue"
              :label="item.name"
              v-model="item.value"
              dense
              outlined
            ></v-select>

            <v-text-field v-else :label="item.name" v-model="item.value" dense outlined></v-text-field>
          </div>
        </div>
      </v-col>
      <v-col class="d-flex">
        <div class="align-self-end text-right mb-7" style="width: 100%;"></div>
      </v-col>
    </v-row>
    <v-card class="default">
      <v-card-text>
        <v-row>
          <v-col class="d-flex">
            <v-text-field
              v-model="search"
              label="Search"
              dense
              outlined
              background-color="white"
              hide-details
              class="mb-2"
            />

            <v-btn color="info" class="my-0 ml-4" style="width: 183px" @click="createClick">
              <v-icon class="mr-2">mdi-plus</v-icon> Create
            </v-btn>
          </v-col>
        </v-row>
        <v-data-table
          v-if="selectedCatalog"
          :search="search"
          :headers="selectedCatalog.headers"
          :items="selectedCatalogResults"
          dense
          @click:row="itemClick"
          class="row-clickable"
          :footer-props="{ 'items-per-page-options': [15, 30, 50, 100, -1] }"
        >
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="showEditor" max-width="600px"
      ><v-toolbar dark color="primary">
        <v-toolbar-title>Edit Item</v-toolbar-title>
        <v-spacer />

        <v-icon @click="showEditor = false">mdi-close</v-icon>
      </v-toolbar>
      <v-card v-if="selectedCatalog && selectedItem">
        <v-card-text class="pt-5">
          <v-row class="pb-5">
            <v-col cols="6" v-for="header of selectedCatalog.headers">
              <div v-if="header.value == 'id'">
                <v-text-field
                  v-model="selectedItem[header.value]"
                  :label="header.text"
                  dense
                  outlined
                  hide-details
                  readonly
                  append-icon="mdi-lock"
                  background-color="white"
                />
              </div>
              <div v-else-if="header.value == 'academic_year_id'">
                <v-autocomplete
                  :items="academicYears"
                  v-model="selectedItem[header.value]"
                  item-value="id"
                  item-text="year"
                  label="Academic year"
                  dense
                  outlined
                  hide-details
                />
              </div>
              <div v-else-if="header.value == 'province_id'">
                <v-autocomplete
                  :items="canadianProvinces"
                  v-model="selectedItem[header.value]"
                  item-value="id"
                  item-text="description"
                  label="Province"
                  dense
                  outlined
                  hide-details
                />
              </div>
              <div v-else-if="header.value == 'student_category_id'">
                <v-autocomplete
                  :items="studentCategories"
                  v-model="selectedItem[header.value]"
                  item-value="id"
                  item-text="code"
                  label="Student Category"
                  dense
                  outlined
                  hide-details
                />
              </div>

              <v-text-field
                v-else
                v-model="selectedItem[header.value]"
                :label="header.text"
                dense
                outlined
                hide-details
                background-color="white"
              />
            </v-col>
          </v-row>
          <v-btn color="primary" @click="saveItemClick">Save</v-btn>
          <span v-if="saveError" class="text-error ml-4">Save failed: {{ saveError }}</span>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from "vuex";
import { clone } from "lodash";
import store from "@/store";

export default {
  data: () => ({
    search: "",
    catalog: null,
    showEditor: false,
    selectedItem: null,
    saveError: null,
  }),
  computed: {
    ...mapGetters("catalogStore", ["reportHeaders", "reportData"]),
    ...mapState("catalogStore", ["catalogOptions", "selectedCatalog", "selectedCatalogResults"]),
    ...mapState("academicYearStore", ["academicYears"]),
    ...mapGetters(["provinces", "studentCategories"]),

    canadianProvinces() {
      if (this.provinces) {
        return this.provinces.filter((p) => p.id <= 13 && p.id > 0);
      }
      return [];
    },
  },
  watch: {
    catalog(nv) {
      this.setCatalog(nv);
    },
  },
  async created() {
    await this.loadAcademicYears();
    await this.setProvinces();
    await this.setStudentCategories(false);
    await await store.dispatch("setAppSideBarAdmin", this.$route.path.startsWith("/administration"));
  },
  methods: {
    ...mapActions(["setProvinces", "setStudentCategories"]),
    ...mapActions("academicYearStore", ["loadAcademicYears"]),
    ...mapActions("catalogStore", ["loadCatalog", "setCatalog", "saveCatalog"]),

    itemClick(item) {
      this.selectedItem = clone(item);
      this.showEditor = true;
    },
    async saveItemClick() {
      this.saveError = null;
      let resp = await this.saveCatalog(this.selectedItem);
      console.log("SAVE", resp);

      if (!resp.success) {
        this.saveError = resp;
        return;
      }

      this.selectedItem = null;
      this.showEditor = false;
    },
    createClick() {
      this.selectedItem = {};
      this.showEditor = true;
    },
  },
};
</script>
