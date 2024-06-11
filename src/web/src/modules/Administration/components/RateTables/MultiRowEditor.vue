<template>
  <div>
    <div v-if="hasProvince">
      <v-select
        label="Province"
        v-model="selectedProvince"
        :items="relevantProvinces"
        item-value="id"
        item-text="description"
        outlined
        dense
        class="mt-4"
      >
      </v-select>
    </div>

    <v-simple-table class="mb-4">
      <template #default>
        <thead>
          <tr>
            <th v-for="field of relevantFields">{{ field.text }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row of relevantRows" class="narrow">
            <td v-for="field of relevantFields" class="narrow">
              <v-text-field
                v-if="field.text == 'province_id'"
                :value="provinces.find((p) => p.id == row[field.text]).description"
                dense
                outlined
                class="narrow"
                hide-details
                :readonly="lockedFields.includes(field.text)"
                :background-color="lockedFields.includes(field.text) ? '#ddd' : 'white'"
              ></v-text-field>

              <v-text-field
                v-else
                v-model="row[field.text]"
                dense
                outlined
                class="narrow"
                hide-details
                :readonly="lockedFields.includes(field.text)"
                :append-icon="lockedFields.includes(field.text) ? 'mdi-lock' : ''"
                :background-color="lockedFields.includes(field.text) ? '#ddd' : 'white'"
              ></v-text-field>
            </td>
          </tr>
        </tbody>
      </template>
    </v-simple-table>
    <v-btn color="primary" @click="saveClick">Save</v-btn>

    <span class="ml-5 text-success" v-if="showMessage">{{ showMessage }}</span>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  props: ["selectedYear", "selectedItem", "tableName"],
  data: () => ({
    showMessage: "",
    selectedProvince: null,
  }),
  computed: {
    ...mapGetters(["provinces"]),

    fields() {
      if (this.selectedItem && this.selectedItem.length > 0) {
        return Object.keys(this.selectedItem[0]).map((o) => {
          return { text: o };
        });
      }

      return [];
    },
    relevantFields() {
      const toIgnore = ["id", "academic_year_id"];

      return this.fields.filter((f) => !toIgnore.includes(f.text));
    },
    lockedFields() {
      return ["income_from_amount", "income_to_amount", "family_size", "province_id", "student_category_id"];
    },
    hasProvince() {
      return this.fields.filter((f) => f.text == "province_id").length > 0 && this.selectedItem.length > 13;
    },
    relevantProvinces() {
      return this.provinces.filter((p) => p.id < 14);
    },
    relevantRows() {
      if (this.hasProvince && this.selectedProvince) {
        return this.selectedItem.filter((i) => i.province_id == this.selectedProvince);
      }

      return this.selectedItem;
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
