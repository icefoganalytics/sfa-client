<template>
  <div>
    <h3>
      Disbursements
      <v-btn @click="addClick" color="primary" class="float-right" small>Add</v-btn>
    </h3>
    <v-simple-table class="text-left narrow">
      <template v-slot:default>
        <thead>
          <tr>
            <th class="narrow">Certificate</th>
            <th class="narrow">Amount</th>
            <th class="narrow">Type</th>
            <th class="narrow">Issue Date</th>
            <th class="narrow">Due Date</th>
            <th class="narrow">Tax Year</th>
            <th class="narrow">Change Reason</th>
            <th class="narrow">Batch</th>
            <th class="narrow"></th>
          </tr>
        </thead>
        <tbody>
          <SfaDisbursementLine
            v-for="(item, idx) of disbursements"
            :item="item"
            :idx="idx"
            :saveDisbursement="saveDisbursement"
            :deleteDisbursement="deleteDisbursement"
            :key="idx"
          />
        </tbody>
      </template>
    </v-simple-table>
    <confirm-dialog ref="confirm"></confirm-dialog>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import SfaDisbursementLine from "./SFADisbursementLine.vue";

export default {
  name: "SFADisbursements",
  props: ["disbursements"],
  components: { SfaDisbursementLine },
  data: () => ({}),
  created() {},
  computed: {
    ...mapGetters(["cslClassifications", "disbursementTypes", "changeReasons"]),
  },
  methods: {
    addClick() {
      this.$emit("addDisbursement");
    },
    async saveDisbursement() {},
    async deleteDisbursement(item, index) {
      this.$emit("removeDisbursement", { id: item.id, index });
    },
  },
};
</script>
