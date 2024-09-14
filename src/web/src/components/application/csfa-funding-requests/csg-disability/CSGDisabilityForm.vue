<template>
  <div>
      <!-- TITLE AND SWITCH -->
      <v-card-text>
        <div class="row">
          <v-switch
            label=""
            class="my-0 mr-2"
            :value="!!CSGDisabilityRequest?.id"
            v-model="checkCSGDisabilityRequest"
            @change="toggle($event, 29, CSGDisabilityRequest)"
          >
          </v-switch>
          <h3 class="text-h6 font-weight-regular">Student Applied for CSG for Students with Disabilities</h3>
        </div>
      </v-card-text>
      <!--  -->
      
      <v-card class="default mb-5">
        <v-card-text class="row">
          <div class="col-md-4">
            <v-switch
              label="Permanent disability"
              class="my-0"
              :disabled="!checkCSGDisabilityRequest"
              v-model="application.permanent_disability"
              @change="doSaveApp('permanent_disability', application.permanent_disability)"
            >
            </v-switch>
          </div>
          <div class="col-md-4">
            <v-switch
                label="Presistent/Prolonged disability"
                class="my-0"
                :disabled="!checkCSGDisabilityRequest"
                v-model="application.pers_or_prolong_disability"
                @change="doSaveApp('pers_or_prolong_disability', application.pers_or_prolong_disability)"
            >
            </v-switch>
          </div>
          <div class="col-md-3">
            <v-menu 
              :disabled="!checkCSGDisabilityRequest" 
              v-model="show_menu" 
              :close-on-content-click="false"
              transition="scale-transition" 
              left nudge-top="26" 
              offset-y 
              min-width="auto"
            >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field 
                :disabled="showAddDisability" 
                label="Disability start date" 
                append-icon="mdi-calendar" 
                readonly
                :value="application.disability_start_date?.slice(0, 10)" 
                outlined 
                dense 
                background-color="white" 
                v-bind="attrs"
                v-on="on"
              ></v-text-field>
            </template>
            <v-date-picker :value="application.disability_start_date?.slice(0, 10)" @input="e => {
              application.disability_start_date = e;
              show_menu = false;
            }" 
            @change="doSaveApp('disability_start_date', application.disability_start_date)"
            >
            </v-date-picker>
          </v-menu>
          </div>
        </v-card-text>
      </v-card>
      <!-- DISABILITIES -->
      <v-card class="default mb-5">
        <div class="col-md-12 mb-3">
          <h3 class="text-h6 mb-n2 font-weight-regular">Disabilities</h3>
        </div>
        <v-card-text class="row my-n5" v-for="item, index of application?.disabilities" :key="index">
          <div class="col-md-6">
            <v-autocomplete 
              outlined 
              dense 
              background-color="white" 
              hide-details
              :disabled="!(checkCSGDisabilityRequest && !showAddDisability)"
              :items="disabilityTypes"
              item-text="description"
              item-value="id"
              v-model="item.disability_type_id"
              @change="updateDisability(item.id, { disability_type_id: item.disability_type_id })"
            >
            </v-autocomplete>
          </div>
          <div class="col-md-4">
            <v-switch
              :disabled="!(checkCSGDisabilityRequest && !showAddDisability)"
              label="Verified"
              class="my-1"
              v-model="item.verified_disability_need"
              @change="updateDisability(item.id, { verified_disability_need: item.verified_disability_need })"
            >
            </v-switch>
          </div>
          <div class="col-md-2">
            <div class="row">
              <div class="col-4 d-flex justify-center">
                <v-btn
                  :disabled="!(checkCSGDisabilityRequest && !showAddDisability)"
                  color="success"
                  x-small
                  fab
                  title="Add"
                  class="my-0"
                  @click="showAddDisability = true"
                >
                <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
              <div class="col-4 d-flex justify-center">
                <v-btn
                  :disabled="!(checkCSGDisabilityRequest && !showAddDisability)"
                  color="error"
                  x-small
                  fab
                  title="Remove"
                  class="my-0"
                  @click="removeDisability(item.id)"
                >
                <v-icon>mdi-minus</v-icon>
                </v-btn>
              </div>
              <div class="col-4 d-flex justify-center">
                <v-btn
                  :disabled="!(checkCSGDisabilityRequest && !showAddDisability)"
                  color="warning"
                  x-small
                  fab
                  title=""
                  class="my-0"
                >
                <v-icon>mdi-dots-horizontal</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-text class="row my-n5" v-if="showAddDisability || !application?.disabilities?.length">
          <div class="col-md-6">
            <v-autocomplete 
              outlined 
              dense 
              background-color="white" 
              hide-details
              :disabled="!checkCSGDisabilityRequest"
              :items="disabilityTypes"
              item-text="description"
              item-value="id"
              v-model="newRecordDisability.disability_type_id"
            >
            </v-autocomplete>
          </div>
          <div class="col-md-4">
            <v-switch
              label="Verified"
              class="my-1"
              :disabled="!checkCSGDisabilityRequest"
              v-model="newRecordDisability.verified_disability_need"
            >
            </v-switch>
          </div>
          <div class="col-md-2">
            <div class="row">
              <div class="col-6 d-flex justify-end">
                <v-btn
                  color="success"
                  x-small
                  fab
                  title="Add"
                  class="my-0"
                  :disabled="!checkCSGDisabilityRequest"
                  @click="addDisability"
                >
                <v-icon>mdi-check</v-icon>
                </v-btn>
              </div>
              <div class="col-6 d-flex justify-end">
                <v-btn
                  color="error"
                  x-small
                  fab
                  title="Remove"
                  class="my-0"
                  :disabled="!checkCSGDisabilityRequest"
                  @click="setCloseDisability"
                >
                <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!--  -->
      <!-- TITLE AND SWITCH -->
      <v-card-text>
        <div class="row  mt-2">
          <v-switch
            label=""
            class="my-0 mr-2"
            :value="!!CSGDServicesAndEquipmentRequest?.id"
            v-model="checkCSGDServicesAndEquipmentRequest"
            @change="toggle($event, 30, CSGDServicesAndEquipmentRequest)"
          >
          </v-switch>
          <h3 class="text-h6 font-weight-regular">Student Applied for CSG for Services and Equipment</h3>
        </div>
      </v-card-text>
      <!--  -->
      <v-card class="default mb-5">
        <div class="col-md-12">
          <h3 class="text-h6 mb-n2 font-weight-regular">Service required</h3>
        </div>
        
        <v-card-text class="row" v-for="item, index of application?.disability_services" :key="index">
          <div class="col-md-6">
            <v-autocomplete 
              outlined 
              dense 
              background-color="white" 
              hide-details
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
              :items="disabilityServices"
              item-text="description"
              item-value="id"
              v-model="item.disability_service_id"
              @change="updateDisabilityService(item.id, {disability_service_id: item.disability_service_id})"
            >
            </v-autocomplete>
          </div>
          <div class="col-md-4">
            <v-switch
              label="Confirmation of need verified"
              class="my-1"
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
              v-model="item.verified_service_need"
              @change="updateDisabilityService(item.id, {verified_service_need: item.verified_service_need})"
            >
            </v-switch>
          </div>
          <div class="col-md-2">
            <div class="row">
              <div class="col-4 d-flex justify-center">
                <v-btn
                  color="success"
                  x-small
                  fab
                  title="Add"
                  class="my-0"
                  :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
                  @click="showAddDisabilityService = true"
                >
                <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
              <div class="col-4 d-flex justify-center">
                <v-btn
                  color="error"
                  x-small
                  fab
                  title="Remove"
                  class="my-0"
                  :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
                  @click="removeDisabilityService(item.id)"
                >
                <v-icon>mdi-minus</v-icon>
                </v-btn>
              </div>
              <div class="col-4 d-flex justify-center">
                <v-btn
                  color="warning"
                  x-small
                  fab
                  title=""
                  class="my-0"
                  :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
                >
                <v-icon>mdi-dots-horizontal</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
  
          <div class="col-md-3 pr-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Requested amount"
              value="$5,000.00"
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
              v-model="item.requested_amount"
              @change="updateDisabilityService(item.id, {requested_amount: item.requested_amount})"
            >
            </v-text-field>
          </div>
          <div class="col-md-3 px-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Maximum allowed amount"
              value="$2,000.00"
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
              v-model="item.max_allowed_amount"
              @change="updateDisabilityService(item.id, {max_allowed_amount: item.max_allowed_amount})"
            >
            </v-text-field>
          </div>
          <div class="col-md-3 pl-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Approve amount"
              value="$2,000.00"
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
              v-model="item.approve_amount"
              @change="updateDisabilityService(item.id, {approve_amount: item.approve_amount})"
            >
            </v-text-field>
          </div>
          <div class="col-md-3  pl-1 mb-0">
            <div class="row">
              <div class="col-md-6 mx-0">
                <v-btn
                color="blue"
                block
                class="text-subtitle-2 mt-0"
                :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityService)"
                @click="showPDF(45)"
              >
              View quote
              </v-btn>
              </div>
              <div class="col-md-6 mx-0">
                <v-btn
                color="blue"
                block
                class="text-subtitle-2 mt-0"
                
                @click="showPDF(27)"
              >
              View receipt
              </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-text class="row" v-if="showAddDisabilityService || !application?.disability_services?.length">
          <div class="col-md-6">
            <v-autocomplete 
              outlined 
              dense 
              background-color="white" 
              hide-details
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              :items="disabilityServices"
              item-text="description"
              item-value="id"
              v-model="newRecordDisabilityService.disability_service_id"
            >
            </v-autocomplete>
          </div>
          <div class="col-md-4">
            <v-switch
              label="Confirmation of need verified"
              class="my-1"
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              v-model="newRecordDisabilityService.verified_service_need"
            >
            </v-switch>
          </div>
          <div class="col-md-2">
            <div class="row">
              <div class="col-6 d-flex justify-end">
                <v-btn
                  color="success"
                  x-small
                  fab
                  title="Add"
                  class="my-0"
                  :disabled="!checkCSGDServicesAndEquipmentRequest"
                  @click="addDisabilityService"
                >
                <v-icon>mdi-check</v-icon>
                </v-btn>
              </div>
              <div class="col-6 d-flex justify-end">
                <v-btn
                  color="error"
                  x-small
                  fab
                  title="Remove"
                  class="my-0"
                  :disabled="!checkCSGDServicesAndEquipmentRequest"
                  @click="setCloseDisabilityService"
                >
                <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
  
          <div class="col-md-3 pr-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Requested amount"
              value="$5,000.00"
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              v-model="newRecordDisabilityService.requested_amount"
            >
            </v-text-field>
          </div>
          <div class="col-md-3 px-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Maximum allowed amount"
              value="$2,000.00"
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              v-model="newRecordDisabilityService.max_allowed_amount"
            >
            </v-text-field>
          </div>
          <div class="col-md-3 pl-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Approve amount"
              value="$2,000.00"
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              v-model="newRecordDisabilityService.approve_amount"
            >
            </v-text-field>
          </div>
        </v-card-text>

      </v-card>
      <v-card class="default mb-5">
        <div class="col-md-12">
          <h3 class="text-h6 mb-n2 font-weight-regular">Equipment required</h3>
        </div>
        
        <v-card-text class="row" v-for="item, index of application?.disability_equipments" :key="index">
          <div class="col-md-6">
            <v-autocomplete 
              outlined 
              dense 
              background-color="white" 
              hide-details
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
              :items="equipmentCategories"
              item-text="description"
              item-value="id"
              v-model="item.equipment_category_id"
              @change="updateDisabilityEquipment(item.id, {equipment_category_id: item.equipment_category_id})"
            >
            </v-autocomplete>
          </div>
          <div class="col-md-4">
            <v-switch
              label="Confirmation of need verified"
              class="my-1"
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
              v-model="item.verified_equipment_need"
              @change="updateDisabilityEquipment(item.id, {verified_equipment_need: item.verified_equipment_need})"
            >
            </v-switch>
          </div>
          <div class="col-md-2">
            <div class="row">
              <div class="col-4 d-flex justify-center">
                <v-btn
                  color="success"
                  x-small
                  fab
                  title="Add"
                  class="my-0"
                  :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
                  @click="showAddDisabilityEquipment = true"
                >
                <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
              <div class="col-4 d-flex justify-center">
                <v-btn
                  color="error"
                  x-small
                  fab
                  title="Remove"
                  class="my-0"
                  :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
                  @click="removeDisabilityEquipment(item.id)"
                >
                <v-icon>mdi-minus</v-icon>
                </v-btn>
              </div>
              <div class="col-4 d-flex justify-center">
                <v-btn
                  color="warning"
                  x-small
                  fab
                  title=""
                  class="my-0"
                  :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
                >
                <v-icon>mdi-dots-horizontal</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
  
          <div class="col-md-3 pr-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Requested amount"
              value="$5,000.00"
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
              v-model="item.requested_amount"
              @change="updateDisabilityEquipment(item.id, {requested_amount: item.requested_amount})"
            >
            </v-text-field>
          </div>
          <div class="col-md-3 px-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Maximum allowed amount"
              value="$2,000.00"
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
              v-model="item.max_allowed_amount"
              @change="updateDisabilityEquipment(item.id, {max_allowed_amount: item.max_allowed_amount})"
            >
            </v-text-field>
          </div>
          <div class="col-md-3 pl-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Approve amount"
              value="$2,000.00"
              :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
              v-model="item.approve_amount"
              @change="updateDisabilityEquipment(item.id, {approve_amount: item.approve_amount})"
            >
            </v-text-field>
          </div>
          <div class="col-md-3  pl-1 mb-0">
            <div class="row">
              <div class="col-md-6 mx-0">
                <v-btn
                color="blue"
                block
                class="text-subtitle-2 mt-0"
                :disabled="!(checkCSGDServicesAndEquipmentRequest && !showAddDisabilityEquipment)"
                @click="showPDF(46)"
              >
              View quote
              </v-btn>
              </div>
              <div class="col-md-6 mx-0">
                <v-btn
                color="blue"
                block
                class="text-subtitle-2 mt-0"
                
                @click="showPDF(27)"
              >
              View receipt
              </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-text class="row" v-if="showAddDisabilityEquipment || !application?.disability_equipments?.length">
          <div class="col-md-6">
            <v-autocomplete 
              outlined 
              dense 
              background-color="white" 
              hide-details
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              :items="equipmentCategories"
              item-text="description"
              item-value="id"
              v-model="newRecordDisabilityEquipment.equipment_category_id"
            >
            </v-autocomplete>
          </div>
          <div class="col-md-4">
            <v-switch
              label="Confirmation of need verified"
              class="my-1"
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              v-model="newRecordDisabilityEquipment.verified_equipment_need"
            >
            </v-switch>
          </div>
          <div class="col-md-2">
            <div class="row">
              <div class="col-6 d-flex justify-end">
                <v-btn
                  color="success"
                  x-small
                  fab
                  title="Add"
                  class="my-0"
                  :disabled="!checkCSGDServicesAndEquipmentRequest"
                  @click="addDisabilityEquipment"
                >
                <v-icon>mdi-check</v-icon>
                </v-btn>
              </div>
              <div class="col-6 d-flex justify-end">
                <v-btn
                  color="error"
                  x-small
                  fab
                  title="Remove"
                  class="my-0"
                  :disabled="!checkCSGDServicesAndEquipmentRequest"
                  @click="setCloseDisabilityEquipment"
                >
                <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
  
          <div class="col-md-3 pr-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Requested amount"
              value="$5,000.00"
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              v-model="newRecordDisabilityEquipment.requested_amount"
            >
            </v-text-field>
          </div>
          <div class="col-md-3 px-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Maximum allowed amount"
              value="$2,000.00"
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              v-model="newRecordDisabilityEquipment.max_allowed_amount"
            >
            </v-text-field>
          </div>
          <div class="col-md-3 pl-2 mr-n2">
            <v-text-field 
              outlined 
              dense 
              background-color="white" 
              hide-details
              label="Approve amount"
              value="$2,000.00"
              :disabled="!checkCSGDServicesAndEquipmentRequest"
              v-model="newRecordDisabilityEquipment.approve_amount"
            >
            </v-text-field>
          </div>
        </v-card-text>

      </v-card>

      <confirm-dialog ref="confirm"></confirm-dialog>
      <show-pdf ref="showPdf">
    </show-pdf>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import store from '@/store';
import axios from 'axios';
import { APPLICATION_URL } from "@/urls";

export default {
  components: {

  },
  computed: {
    ...mapGetters(["disabilityTypes", "disabilityServices", "equipmentCategories"]),
    student() {
      return store.getters.selectedStudent;
    },
    application: function () {
      return store.getters.selectedApplication;
    },
    CSGDisabilityRequest: function () {
      const request = this.application
        ?.funding_requests?.find(fr => fr.request_type_id === 29);
        this.checkCSGDisabilityRequest = !!request;
      return request || {};
    },
    CSGDServicesAndEquipmentRequest: function () {
      const request = this.application
        ?.funding_requests?.find(fr => fr.request_type_id === 30);
        this.checkCSGDServicesAndEquipmentRequest = !!request;
      return request || {};
    },
  },
  data: () => ({
      show_menu: false,
      showAddDisability: false,
      showAddDisabilityService: false,
      showAddDisabilityEquipment: false,
      itemOptions: [{text: '', value: null}, {text: 'Yes', value: 1}, {text: 'No', value: 0}],
      checkCSGDisabilityRequest: false,
      checkCSGDServicesAndEquipmentRequest: false,
      newRecordDisability: {
        disability_type_id: null,
        verified_disability_need: false
      },
      newRecordDisabilityService: {
        disability_service_id: null,
        verified_service_need: false,
        requested_amount: 0,
        max_allowed_amount: 0,
        approve_amount: 0,
      },
      newRecordDisabilityEquipment: {
        equipment_category_id: null,
        verified_equipment_need: false,
        requested_amount: 0,
        max_allowed_amount: 0,
        approve_amount: 0,
      },
  }),
  async created() {
    store.dispatch("setDisabilityTypes");
    store.dispatch("setDisabilityServices");
    store.dispatch("setEquipmentCategories");
  },
  watch: {

  },
  methods: {
    async showPDF(reqId) {      
      try {              
          let buf = await fetch(APPLICATION_URL + `/${this.application.id}/student/${this.student.id}/files/${reqId}`)           
            .then((r) => r.arrayBuffer());                        
            const blob = new Blob([buf], {type: 'application/pdf'});
            const blobURL = URL.createObjectURL(blob) || "";                   
            this.$refs.showPdf.showModal(blobURL);                                                                   
      } catch (error) {
        console.log(error);
      }
    },
    setCloseDisabilityEquipment() {
      this.newRecordDisabilityEquipment = {
        equipment_category_id: null,
        verified_equipment_need: false,
        requested_amount: 0,
        max_allowed_amount: 0,
        approve_amount: 0,
      };
      this.showAddDisabilityEquipment = false;
    },
    setCloseDisabilityService() {
      this.newRecordDisabilityService = {
        disability_service_id: null,
        verified_service_need: false,
        requested_amount: 0,
        max_allowed_amount: 0,
        approve_amount: 0,
      };
      this.showAddDisabilityService = false;
    },
    setCloseDisability() {
      this.newRecordDisability = {
        disability_type_id: null,
        verified_disability_need: false
      };
      this.showAddDisability = false;
    },
    doSaveApp(field, value) {
      store.dispatch("updateApplication", [field, value, this]);
    },
    async deleteRecord(id) {
      try {
        const resDelete = await axios.delete(
          APPLICATION_URL + `/${id}/status`,
        );

        const message = resDelete.data.messages[0];

        if (message.variant == "success") {
          this.$emit("showSuccess", message.text);
          this.checkCSGDisabilityRequest = false;
        } else {
          this.$emit("showError", message.text);
        }
      } catch (error) {
        this.$emit("showError", "Error to delete");
      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    removeRecord(request) {
      this.$refs.confirm.show(
        "Are you sure?",
        "Click 'Confirm' below to permanently remove this funding record.",
        () => {
          this.deleteRecord(request.id);
        },
        () => {
          if (request.request_type_id === 29) {
            this.checkCSGDisabilityRequest = !this.checkCSGDisabilityRequest;
          }
          if (request.request_type_id === 30) {
            this.checkCSGDServicesAndEquipmentRequest = !this.checkCSGDServicesAndEquipmentRequest;
          }
        }
      );

    },
    async addFundingRequest(type = null) {
      try {
        
        if (!type) {
          return;
        }

        const resInsert = await axios.post(
          APPLICATION_URL + `/${this.application.id}/status`,
          { request_type_id: type, received_date: new Date(), },
        );

        const message = resInsert?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
          this.checkCSGDisabilityRequest = true;
        } else {
          this.$emit("showError", message.text);
        }

      } catch (error) {
        this.$emit("showError", "Error to insert");
      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    async updateFundingRequest(itemToUpdate, id) {
      try {
        const resInsert = await axios.put(
          APPLICATION_URL + `/${this.application.id}/status/${id}`,
          { data: { ...itemToUpdate } },
        );
        const message = resInsert?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
        } else {
          this.$emit("showError", message.text);
        }

      } catch (error) {
        this.$emit("showError", "Error to update");
      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    toggle(event, request_type, request) {
      if (!event && request?.id) {
        this.removeRecord(request);
      } else {
        if (!request?.id) {
          this.addFundingRequest(request_type);
        }
      }
    },
    async addDisability() {
      try {

        if (!this.newRecordDisability.disability_type_id) {
          this.$emit("showError", "Disability Type is required");
        }

        const resInsert = await axios.post(
          `${APPLICATION_URL}/${this.application.id}/disability`,
          { data: { ...this.newRecordDisability, } }
        );

        const message = resInsert?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
          this.setCloseDisability();
        } else {
          this.$emit("showError", message.text);
        }

      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to insert");

      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    async updateDisability(id, data) {
      try {

        const resUpdate = await axios.patch(
          `${APPLICATION_URL}/${this.application.id}/disability/${id}`,
          { data }
        );

        const message = resUpdate?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
          this.setCloseDisability();
        } else {
          this.$emit("showError", message.text);
        }

      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to insert");

      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    async deleteDisability(id) {
      try {
        const resDelete = await axios.delete(`${APPLICATION_URL}/disability/${id}`);
        const message = resDelete?.data?.messages[0];
        if (message?.variant === "success") {
            this.$emit("showSuccess", message.text);
        } else {
            this.$emit("showError", message.text);
        }
      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to delete");
      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    removeDisability(id) {
      this.$refs.confirm.show(
        "Are you sure?",
        "Click 'Confirm' below to permanently remove this disability.",
        () => {
          this.deleteDisability(id);
        },
        () => {}
      );
    },
    async addDisabilityService() {
      try {

        if (!this.newRecordDisability.disability_type_id) {
          this.$emit("showError", "Disability Type is required");
        }

        const resInsert = await axios.post(
          `${APPLICATION_URL}/${this.application.id}/disability-service`,
          { data: { ...this.newRecordDisabilityService, } }
        );

        const message = resInsert?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
          this.setCloseDisabilityService();
        } else {
          this.$emit("showError", message.text);
        }

      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to insert");

      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    async updateDisabilityService(id, data) {
      try {

        const resUpdate = await axios.patch(
          `${APPLICATION_URL}/${this.application.id}/disability-service/${id}`,
          { data }
        );

        const message = resUpdate?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
        } else {
          this.$emit("showError", message.text);
        }

      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to insert");

      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    async deleteDisabilityService(id) {
      try {
        const resDelete = await axios.delete(`${APPLICATION_URL}/disability-service/${id}`);
        const message = resDelete?.data?.messages[0];
        if (message?.variant === "success") {
            this.$emit("showSuccess", message.text);
        } else {
            this.$emit("showError", message.text);
        }
      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to delete");
      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    removeDisabilityService(id) {
      this.$refs.confirm.show(
        "Are you sure?",
        "Click 'Confirm' below to permanently remove this disability.",
        () => {
          this.deleteDisabilityService(id);
        },
        () => {}
      );
    },
    async addDisabilityEquipment() {
      try {

        if (!this.newRecordDisabilityEquipment?.equipment_category_id) {
          this.$emit("showError", "Equipment Category is required");
        }

        const resInsert = await axios.post(
          `${APPLICATION_URL}/${this.application.id}/disability-equipment`,
          { data: { ...this.newRecordDisabilityEquipment, } }
        );

        const message = resInsert?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
          this.setCloseDisabilityEquipment();
        } else {
          this.$emit("showError", message.text);
        }

      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to insert");

      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    async updateDisabilityEquipment(id, data) {
      try {

        const resUpdate = await axios.patch(
          `${APPLICATION_URL}/${this.application.id}/disability-equipment/${id}`,
          { data }
        );

        const message = resUpdate?.data?.messages[0];

        if (message?.variant === "success") {
          this.$emit("showSuccess", message.text);
        } else {
          this.$emit("showError", message.text);
        }

      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to insert");

      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    async deleteDisabilityEquipment(id) {
      try {
        const resDelete = await axios.delete(`${APPLICATION_URL}/disability-equipment/${id}`);
        const message = resDelete?.data?.messages[0];
        if (message?.variant === "success") {
            this.$emit("showSuccess", message.text);
        } else {
            this.$emit("showError", message.text);
        }
      } catch (error) {
        console.log(error);
        this.$emit("showError", "Error to delete");
      } finally {
        store.dispatch("loadApplication", this.application.id);
      }
    },
    removeDisabilityEquipment(id) {
      this.$refs.confirm.show(
        "Are you sure?",
        "Click 'Confirm' below to permanently remove this disability.",
        () => {
          this.deleteDisabilityEquipment(id);
        },
        () => {}
      );
    },
  },
};
</script>