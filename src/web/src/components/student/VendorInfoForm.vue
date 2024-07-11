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
          <v-data-table
            :items="student.vendor_updates"
            :headers="headers"
            @click:row="requestRowClick"
            class="row-clickable"
          >
            <template #item.created_date="{item}">{{ formatDate(item.created_date) }}</template>
            <template #item.update_requested_date="{item}">{{ formatDate(item.update_requested_date) }}</template>
            <template #item.update_completed_date="{item}">{{ formatDate(item.update_completed_date) }}</template>
            <template #item.status="{item}">{{ generateStatus(item) }}</template>
            <template #item.download="{item}"><v-icon @click.stop="downloadClick(item)">mdi-download</v-icon></template>
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
            <v-col cols="12">
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
            <v-col cols="12" v-if="newRecord.operation == 'update'">
              <v-switch
                label="Update address to match above?"
                class="my-2"
                v-model="newRecord.is_address_update"
                hide-details
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="4" v-if="newRecord.operation == 'update'">
              <v-switch
                label="Update banking info?"
                v-model="newRecord.is_banking_update"
                hide-details
                class="my-3 mt-2"
              />
            </v-col>

            <v-col cols="5" v-if="newRecord.operation == 'update'">
              <v-switch
                label="Setup direct deposit?"
                v-model="newRecord.is_direct_deposit_update"
                hide-details
                class="my-3 mt-2"
            /></v-col>

            <v-col cols="12" v-if="newRecord.operation == 'update'">
              <v-switch
                label="Name change (due to special circumstances)?"
                v-model="newRecord.is_name_change_update"
                class="my-1"
              />
              <v-text-field
                v-if="newRecord.is_name_change_update"
                v-model="newRecord.name_change_comment"
                label="Name change comment"
                dense
                outlined
                hide-details
              />
            </v-col>
          </v-row>
          <v-btn color="primary" class="mt-5" @click="addVendorRequest" :disabled="!canSaveRequest">Save</v-btn>
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
        <v-card-text class="pt-4" v-if="editRecord">
          <div v-if="!editRecord.update_completed_date && editRecord.update_requested_date">
            <p>Once this request has been completed and the verified, please click the 'Mark Complete'</p>

            <p>
              This request was sent on {{ formatDate(editRecord.update_requested_date) }} and is currently
              {{ generateStatus(editRecord) }}.
            </p>
            <v-btn color="primary" @click="markCompleteClick(editRecord)">Mark Complete</v-btn>
          </div>
          <div v-else-if="editRecord.update_completed_date">
            <p class="mb-0">This request was completed on {{ formatDate(editRecord.update_completed_date) }}</p>
          </div>
          <div v-else>
            <p class="mb-0">This request was created on {{ formatDate(editRecord.created_date) }} but hasn't yet been sent to finance.</p>
          </div>
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
      { text: "Created On", value: "created_date" },
      { text: "Requested On", value: "update_requested_date" },
      { text: "Completed On", value: "update_completed_date" },
      { text: "", value: "download" },
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
    canSaveRequest() {
      return !isNil(this.newRecord.address_id);
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
        is_address_update: false,
        is_banking_update: false,
        is_direct_deposit_update: false,
        is_name_change_update: false,
        name_change_comment: null,
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
      if (!this.student || isNil(this.student.vendor_id)) {
        console.log("Not looking up vendor");
        return;
      }

      this.isLoadingVendor = true;

      await axios
        .get(`${STUDENT_URL}/${this.student.id}/vendor`)
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
          const message = res?.data?.messages[0];

          if (message?.variant === "success") {
            this.$emit("showSuccess", message.text);
          } else {
            this.$emit("showError", message.text);
          }
        })
        .catch((error) => {
          console.log(error);
          this.$emit("showError", "Error creating vendor request");
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

    downloadClick(item) {
      window.open(`${STUDENT_URL}/${this.student.id}/vendor-update/${item.id}?format=pdf`);
    },

    generateStatus(item) {
      if (item.update_completed_date) return "Complete";
      return "Pending";
    },
    markCompleteClick(item) {
      axios
        .put(`${STUDENT_URL}/${this.student.id}/vendor-update/${item.id}`, { update_completed_date: new Date() })
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
          this.$emit("showError", "Error completing vendor request");
        })
        .finally(() => {
          store.dispatch("loadStudent", this.student.id);

          this.showEdit = false;
        });
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
