<template>
  <v-dialog v-model="dialogModel" persistent max-width="700px">
    <v-card>
      <v-toolbar color="#ffc850" dense flat>
        <v-toolbar-title class="pl-0">Vendor Selection</v-toolbar-title>
        <v-spacer></v-spacer>

        <v-btn icon @click.stop="doDeny()">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pt-4">
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="searcher"
              label="Search"
              dense
              outlined
              append-icon="mdi-magnify"
              @click:append="vendorSearchClick"
              @keydown="checkEnter"
              hint="Enter a search term and press Enter"
              persistent-hint
          /></v-col>
          <!--  <v-col cols="6" class="d-flex">
            <v-switch label="Vendor ID" v-model="filterVendorId" class="my-1" />
            <v-switch label="Vendor Name" v-model="filterVendorName" class=" ml-5 my-1" />
          </v-col> -->
        </v-row>

        <v-data-table
          height="400px"
          :loading="loading"
          @click:row="enterSelect"
          :headers="[
            { text: 'Vendor ID', value: 'VendorId', sortable: false /* filterable: filterVendorId */ },
            { text: 'Vendor Name', value: 'VendName', sortable: false /* filterable: filterVendorName */ },
          ]"
          :items="vendorList"
        >
          <template v-slot:item="i">
            <!-- Since v-slot:item overrides how each row is rendered, I rebuild the row starting from <tr>. This allows me to add a class to <tr> based on any condition I want (in this case, the calorie count) -->
            <tr :class="i.item.VendorId === current?.VendorId && 'success'" @click="enterSelect(i.item)">
              <td>{{ i.item.VendorId }}</td>
              <td>{{ i.item.VendName }}</td>
            </tr>
          </template>
        </v-data-table>

        <div class="d-flex">
          <v-btn color="primary" :disabled="!!!current" @click="doConfirm()">Confirm</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="secondary" @click="doDeny()">Close</v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import store from "@/store";

export default {
  props: {
    dialogModel: Boolean,
    showModal: Function,
    getVendorData: Function,
    vendorList: Array,
    doSearch: Function,
  },
  data: () => ({
    loading: false,
    searcher: "",
    /* filterVendorId: true,
    filterVendorName: true, */
    title: "",
    current: null,
  }),
  computed: {
    student: function() {
      return store.getters.selectedStudent;
    },
  },
  watch: {
    searcher(val) {
      store.dispatch("setSearch", val);
    },
  },
  methods: {
    doSaveStudent(field, value, type, extraId = null, addressType = "") {
      store.dispatch("updateStudent", [field, value, type, extraId, this, addressType]);
    },
    doConfirm() {
      if (this.current?.VendorId) {
        this.doSaveStudent("vendor_id", this.current.VendorId, "studentInfo", this.student.id);
      }
      this.current = null;
      this.searcher = "";
      this.showModal(false);
    },
    doDeny() {
      this.current = null;
      this.searcher = "";
      this.showModal(false);
    },
    enterSelect(e) {
      this.current = e;
    },
    async vendorSearchClick() {
      this.loading = true;
      this.doSearch(this.searcher).then(() => {
        this.loading = false;
      });
    },
    async checkEnter(event) {
      if (event.key === "Enter") {
        this.loading = true;
        this.doSearch(this.searcher).then(() => {
          this.loading = false;
        });
      }
    },
  },
};
</script>
<style>
.v-application tr.success {
  background-color: #4caf5099 !important;
}
</style>
