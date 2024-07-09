<template>
  <div>
    <v-card class="default mb-5">
      <v-card-title class="text-h6 font-weight-regular d-flex">
        Standing Documents
      </v-card-title>
      <v-card-text></v-card-text>
    </v-card>

    <confirm-dialog ref="confirm"></confirm-dialog>
  </div>
</template>
<script>
import store from "../../store";

export default {
  data: () => ({
    showAdd: false,
  }),
  computed: {
    student: function() {
      return store.getters.selectedStudent;
    },
  },
  async created() {
    store.dispatch("setAcademicYears");
  },
  methods: {},
};
</script>
