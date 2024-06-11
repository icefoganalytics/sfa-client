<template>
  <div>
    <v-row class="mt-3 pb-5">
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
          background-color="white"
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
  },
};
</script>
