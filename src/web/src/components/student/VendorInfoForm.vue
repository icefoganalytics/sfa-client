<template>
  <div>
    <v-card class="default mb-5">
      <v-card-title class="text-h6 font-weight-regular">
        Vendor
        <v-spacer />
        <div></div>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              readonly
              outlined
              dense
              background-color="white"
              hide-details
              class="mb-4"
              label="Vendor ID"
              v-model="student.vendor_id"
              append-icon="mdi-lock"
            />

            <div class="d-flex">
              <v-btn class="my-0 mr-5" color="success" @click="showModal()">Search</v-btn>
              <v-spacer />
              <v-btn class="my-0" color="error" :disabled="!student.vendor_id" @click="removeVendor">Remove</v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <v-textarea
              readonly
              outlined
              dense
              rows="3"
              background-color="white"
              hide-details
              label="Vendor address"
              :value="vendorInfo"
              append-icon="mdi-lock"
              :loading="isLoadingVendor"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="default mb-5">
      <v-card-title class="text-h6 font-weight-regular d-flex">
        Vendor Request
        <v-spacer />
        <v-btn class="my-0 float-right" color="primary" @click="setShowAdd">Create Request</v-btn></v-card-title
      >
      <v-card-text>
        <div>
          <v-data-table :items="student.vendor_updates" :headers="headers" @click:row="requestRowClick">
            <template #item.update_requested_date="{item}">{{ formatDate(item.update_requested_date) }}</template>
            <template #item.update_completed_date="{item}">{{ formatDate(item.update_completed_date) }}</template>
            <template #item.status="{item}">{{ generateStatus(item) }}</template>
          </v-data-table>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="showAdd" max-width="800px">
      <v-toolbar dark color="primary">
        <v-toolbar-title>Vendor Request</v-toolbar-title>
        <v-spacer />
        <v-icon @click="showAdd = false">mdi-close</v-icon>
      </v-toolbar>
      <v-card>
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12">
              <v-select
                label="Request type"
                v-model="newRecord.operation"
                hide-details
                :items="[
                  { text: 'Vendor Creation', value: 'create' },
                  { text: 'Vendor Update', value: 'update' },
                ]"
                dense
                outlined
              />
            </v-col>
            <v-col cols="4" v-if="newRecord.operation == 'update'">
              <v-switch label="Update address?" class="my-3 mt-2" v-model="newRecord.do_address_update" hide-details />
            </v-col>
            <v-col
              :cols="newRecord.operation == 'create' ? '12' : '8'"
              v-if="newRecord.do_address_update || newRecord.operation == 'create'"
            >
              <v-select
                label="Student address"
                :items="student.addresses"
                v-model="newRecord.address_id"
                item-text="address_display"
                item-value="id"
                class="my-1"
                outlined
                dense
                hide-details
                background-color="white"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="4" v-if="newRecord.operation == 'update'">
              <v-switch
                label="Update banking info?"
                v-model="newRecord.do_banking_update"
                hide-details
                class="my-3 mt-2"
              />
            </v-col>

            <v-col cols="5" v-if="newRecord.operation == 'update'">
              <v-switch
                label="Setup direct deposit?"
                v-model="newRecord.do_deposit_update"
                hide-details
                class="my-3 mt-2"
            /></v-col>

            <v-col cols="12" v-if="newRecord.operation == 'update'">
              <v-switch
                label="Name change (due to special circumstances)?"
                v-model="newRecord.do_name_update"
                class="my-1"
              />
              <v-text-field
                v-if="newRecord.do_name_update"
                v-model="newRecord.name_comments"
                label="Name change comment"
                dense
                outlined
                hide-details
              />
            </v-col>
          </v-row>
          <v-btn color="primary" class="mt-5" @click="addVendorRequest">Save</v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEdit" max-width="800px">
      <v-toolbar dark color="primary">
        <v-toolbar-title>Vendor Request Update</v-toolbar-title>
        <v-spacer />
        <v-icon @click="showEdit = false">mdi-close</v-icon>
      </v-toolbar>
      <v-card>
        <v-card-text class="pt-4">
          <p>Once this request has been completed and the verified, please click the 'Mark Complete'</p>

          <p>
            This request was created on {{ formatDate(editRecord.update_requested_date) }} and is currently
            {{ generateStatus(editRecord) }}.
          </p>
          <v-btn color="primary" @click="markCompleteClick">Mark Complete</v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <SearchVendor
      :showModal="showModal"
      :dialogModel="dialogModel"
      :vendorList="vendorList"
      :getVendorData="getVendorData"
      v-on:showSuccess="showSuccess"
      v-on:showError="showError"
      :doSearch="doVendorSearch"
    />
    <confirm-dialog ref="confirm"></confirm-dialog>
  </div>
</template>
<script>
import axios from "axios";
import moment from "moment";
import { isNil } from "lodash";
import store from "../../store";
import { STUDENT_URL } from "../../urls";
import validator from "@/validator";
import SearchVendor from "./SearchVendor.vue";

export default {
  data: () => ({
    showAdd: false,
    showEdit: false,
    vendorData: {},
    dialogModel: false,
    vendorList: [],
    isLoadingVendor: false,
    newRecord: {
      address: "",
      city_id: null,
      province_id: null,
      postal_code: "",
      country_id: null,
      telephone: "",
      email: "",
      address_type_id: null,
      vendor_id: null,
    },
    validate: {},
    headers: [
      { text: "Status", value: "status" },
      { text: "Vendor ID", value: "vendor_id" },
      { text: "Requested On", value: "update_requested_date" },
      { text: "Completed On", value: "update_completed_date" },
    ],
    editRecord: null,
  }),
  computed: {
    student: function() {
      return store.getters.selectedStudent;
    },
    vendorInfo() {
      if (this.student.vendor_id && this.vendorData && this.vendorData.VendAddrProv) {
        let address = "";

        if ((this.vendorData.VendAddrL1 ?? "").trim().length > 0) {
          address += `${this.vendorData.VendAddrL1.trim()}\n`;
        }

        if ((this.vendorData.VendAddrL2 ?? "").trim().length > 0) {
          address += `${this.vendorData.VendAddrL2.trim()}\n`;
        }

        address += `${this.vendorData.VendAddrCity?.trim()}, ${this.vendorData.VendAddrProv?.trim()} ${this.vendorData.VendAddrPost?.trim()}`;

        return address;
      }

      return "";
    },
  },
  created() {
    this.validate = validator;
    this.getVendorData();
  },
  methods: {
    setShowAdd() {
      let operation = "create";
      if (this.student.vendor_id) operation = "update";

      this.newRecord = {
        operation,
        do_address_update: false,
        do_banking_update: false,
        do_deposit_update: false,
        do_name_update: false,
        name_comments: null,
        address_id: null,
      };

      this.showAdd = true;
    },

    showModal(show = true) {
      this.dialogModel = show;
    },
    doSaveStudent(field, value, type, extraId = null, addressType = "") {
      store.dispatch("updateStudent", [field, value, type, extraId, this, addressType]);
    },
    async getVendorData() {
      this.isLoadingVendor = true;

      await axios
        .get(STUDENT_URL + `/${this.student.id}/vendor`)
        .then((res) => {
          if (res?.data?.success) {
            this.vendorData = res.data.data.data[0];
          }
        })
        .catch((error) => {
          console.log("Error to get Vendor Data", error);
        })
        .finally(() => {
          this.isLoadingVendor = false;
        });
    },
    async getVendorList(term) {
      try {
        this.vendorList = [];
        const res = await axios.get(STUDENT_URL + `/${this.student.id}/vendor-list/${term}`);
        if (res?.data?.success) {
          this.vendorList = [...res.data.data.data];
        }
      } catch (error) {
        console.log("Error to get Vendor List", error);
      }
    },
    removeVendor() {
      this.$refs.confirm.show(
        "Are you sure?",
        "Click 'Confirm' below to permanently remove this vendor.",
        () => {
          this.doSaveStudent("vendor_id", null, "studentInfo", this.student.id);
        },
        () => {}
      );
    },
    async addVendorRequest() {
      axios
        .post(`${STUDENT_URL}/${this.student.id}/vendor-update`, {
          data: { ...this.newRecord, vendor_id: this.student.vendor_id },
        })
        .then((res) => {
          console.log("RESP", res);
          const message = res?.data?.messages[0];

          if (message?.variant === "success") {
            this.$emit("showSuccess", message.text);
          } else {
            this.$emit("showError", message.text);
          }
        })
        .catch((error) => {
          console.log(error);
          this.$emit("showError", "Error to insert");
        })
        .finally(() => {
          store.dispatch("loadStudent", this.student.id);

          this.showAdd = false;
        });
    },

    formatDate(input) {
      if (!isNil(input)) {
        return moment(input).format("YYYY-MM-DD");
      }
      return "";
    },

    requestRowClick(item) {
      this.editRecord = item;
      this.showEdit = true;
    },

    generateStatus(item) {
      if (item.update_completed_date) return "Complete";
      return "Pending";
    },
    markCompleteClick() {
      alert("not yet implemented");
    },

    showSuccess(mgs) {
      this.$emit("showSuccess", mgs);
    },
    showError(mgs) {
      this.$emit("showError", mgs);
    },
    async doVendorSearch(term) {
      return this.getVendorList(term);
    },
  },
  components: {
    SearchVendor,
  },
};
</script>
