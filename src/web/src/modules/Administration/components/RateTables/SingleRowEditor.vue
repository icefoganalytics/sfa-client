<template>
  <div class="pt-4">
    * Any fields marked in yellow are most likely obsolete
    <v-row class="mt-0 pb-5">
      <v-col cols="6" v-for="header of relevantFields">
        <div v-if="header == 'id'">
          <v-text-field
            v-model="selectedItem[header.text]"
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
          <v-autocomplete v-model="selectedItem[header.text]" label="Academic year" dense outlined hide-details />
        </div>
        <div v-else-if="header.value == 'province_id'">
          <v-autocomplete
            :items="canadianProvinces"
            v-model="selectedItem[header.text]"
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
            v-model="selectedItem[header.text]"
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
          v-model="selectedItem[header.text]"
          :label="header.text"
          dense
          outlined
          hide-details
          :background-color="determineColor(header.text)"
          :readonly="determineColor(header.text) != 'white'"
          :append-icon="determineColor(header.text) == 'white' ? '' : 'mdi-lock'"
        />
      </v-col>
    </v-row>
    <v-btn color="primary" @click="saveClick">Save</v-btn>

    <span class="ml-5 text-success" v-if="showMessage">{{ showMessage }}</span>
  </div>
</template>

<script>
import { mapActions } from "vuex";

export default {
  props: ["selectedYear", "selectedItem", "tableName"],
  data: () => ({
    showMessage: "",
    deprecatedFields: [
      "effective_date",
      "expiry_date",
      "semester_living_amount",
      "semester_tuition_amount",
      "semester_book_amount",
      "quarter_living_amount",
      "quarter_tuition_amount",
      "quarter_book_amount",
      "student_exempt_amount",
      "csg_pt_yearly_amount",
      "allowed_percent",
    ],
  }),
  computed: {
    fields() {
      if (this.selectedItem) {
        return Object.keys(this.selectedItem).map((o) => {
          return { text: o };
        });
      }

      return [];
    },
    relevantFields() {
      const toIgnore = ["id", "academic_year_id"];

      return this.fields.filter((f) => !toIgnore.includes(f.text));
    },
  },
  methods: {
    ...mapActions("catalogStore", ["saveRow"]),

    saveClick() {
      this.saveRow({ tableName: this.tableName, value: this.selectedItem }).then((resp) => {
        if (resp.success) {
          this.showMessage = "Saved";
          setTimeout(() => {
            this.showMessage = "";
          }, 3000);
        } else this.showMessage = resp;
      });
    },
    determineColor(text) {
      if (this.deprecatedFields.includes(text)) return "warning lighten-3";
      if (this.tableName == "csl_lookup" && text == "csg_8_month_amount") return "warning lighten-3";

      return "white";
    },
  },
};
</script>
