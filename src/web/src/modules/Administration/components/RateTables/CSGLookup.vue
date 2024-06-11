<template>
  <div class="pt-6">
    <p class="text-warning">* CSG Lookup is a single row per year</p>

    <v-simple-table class="text-left narrow">
      <template v-slot:default>
        <tr class="narrow" v-for="header of selectedCatalog.headers">
          <th class="narrow">{{ header.text }}</th>
          <td>
            <div v-if="header.value == 'id'" class="d-none">
              <v-text-field
                v-model="selectedItem[header.value]"
                :label="header.text"
                dense
                outlined
                hide-details
                readonly
                append-icon="mdi-lock"
                background-color="white"
                class="narrowInput"
              />
            </div>
            <div v-else-if="header.value == 'academic_year_id'">
              <v-autocomplete
                :items="academicYears"
                v-model="selectedItem[header.value]"
                item-value="id"
                item-text="year"
                dense
                outlined
                hide-details
                class="narrowInput"
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
              dense
              outlined
              hide-details
              background-color="white"
              class="narrowInput"
            />
          </td>
        </tr>
      </template>
    </v-simple-table>

    <div class="d-flex">
      <v-btn class="primary">Save</v-btn>
      <v-spacer />
      <v-btn color="info">Duplicate from {{ previousYear }}</v-btn>
    </div>
  </div>
</template>

<script>
import { mapActions, mapState } from "vuex";

export default {
  props: ["selectedYear"],
  data: () => ({
    selectedItem: {},
  }),

  computed: {
    ...mapState("catalogStore", ["selectedCatalog"]),
    previousYear() {
      return this.selectedYear - 1;
    },
    
  },
  methods: {
    ...mapActions("catalogStore", ["loadCatalog", "setCatalog", "saveCatalog"]),

    async load() {
      loadItem(this.selectedYear);
    },
  },
};
</script>

<style scoped>
.narrow td {
  padding: 0 2px !important;
}
</style>
