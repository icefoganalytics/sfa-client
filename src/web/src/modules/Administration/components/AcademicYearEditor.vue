<template>
  <div>
    <v-dialog v-model="isVisible" persistent max-width="600px">
      <v-card v-if="academicYear">
        <v-toolbar dark color="primary">
          <v-toolbar-title>Academic Year Editor - {{ academicYear.id }}</v-toolbar-title>
          <v-spacer />

          <v-icon @click="closeClick">mdi-close</v-icon>
        </v-toolbar>

        <v-card-text class="pt-7">
          <v-row>
            <v-col>
              <v-text-field
                :value="academicYear.start_date"
                label="Start date"
                append-icon="mdi-lock"
                readonly
                outlined
                hide-details
                dense
                background-color="white"
              />
            </v-col>
            <v-col>
              <v-text-field
                :value="academicYear.end_date"
                label="End date"
                append-icon="mdi-lock"
                readonly
                outlined
                hide-details
                dense
                background-color="white"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col>
              <v-select
                v-model="academicYear.status"
                label="Status"
                :items="statusOptions"
                dense
                hide-details
                outlined
                background-color="white"
              />
            </v-col>
            <v-col>
              <v-select
                v-model="academicYear.is_open_in_portal"
                label="Open in Portal?"
                :items="openOptions"
                dense
                hide-details
                outlined
                background-color="white"
              />
            </v-col>
          </v-row>

          <div class="d-flex mt-6">
            <v-btn @click="saveClick" color="primary">Save</v-btn>
            <v-spacer />
            <v-btn @click="closeClick" tonal color="secondary">Close</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapActions, mapState } from "vuex";

export default {
  data: () => ({
    isVisible: false,
    startDateMenu: false,
    endDateMenu: false,
    item: {},
    statusOptions: ["Open", "Closed", "Archived"],
    openOptions: [
      { text: "Yes", value: true },
      { text: "No", value: false },
    ],
  }),
  computed: {
    ...mapState("academicYearStore", ["academicYear"]),
  },
  watch: {
    academicYear: function(nv) {
      if (nv) this.isVisible = true;
      else this.isVisible = false;
    },
  },
  methods: {
    ...mapActions("academicYearStore", ["save", "select"]),

    closeClick() {
      this.select(undefined);
    },

    async saveClick() {
      this.save().then((resp) => {
        if (resp && resp.success) this.closeClick();
      });
    },
  },
};
</script>
