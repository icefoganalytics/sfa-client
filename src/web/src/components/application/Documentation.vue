<template>
  <div class="home">
    <div class="d-flex">
      <h1>Documentation Required and Received</h1>
      <v-spacer></v-spacer>
      <v-btn class="mt-2" color="primary" @click="startUploadItem({})">Upload</v-btn>
    </div>

    <v-row>
      <v-col cols="12">
        <v-card class="mb-5 default" v-for="(item, i) of documentation" :key="i">
          <v-toolbar color="#ffc850" dense flat @click="expand(item, i)">
            <v-btn icon>
              <v-icon>{{ item.showThing ? "mdi-chevron-down" : "mdi-chevron-up" }}</v-icon>
            </v-btn>
            <v-toolbar-title class="pl-0">{{ item.description }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon title="Preview" v-if="canPreview(item)" @click.stop="showPreview(item)">
              <v-icon>mdi-eye</v-icon>
            </v-btn>
            <v-btn icon title="Download" v-if="item.file_name && item.upload_date" @click.stop="downloadItem(item)">
              <v-icon>mdi-download</v-icon>
            </v-btn>
            <!-- <v-btn
              icon
              title="Download PDF"
              v-if="item.file_name && item.upload_date"
              @click.stop="downloadItemPdf(item)"
            >
              <v-icon>mdi-download</v-icon>
            </v-btn> -->
            <v-btn icon v-else @click="startUploadItem(item)">
              <v-icon>mdi-upload</v-icon>
            </v-btn>
            <v-btn icon v-if="item.file_name && item.upload_date" @click.stop="startDeleteItem(item)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-toolbar>

          <v-card-text v-bind:class="{ 'd-none': item.showThing }">
            <v-row>
              <v-col cols="12" md="3">
                <v-menu
                  v-model="item.upload_date_menu"
                  transition="scale-transition"
                  left
                  nudge-top="26"
                  offset-y
                  min-width="auto"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field
                      :value="item.upload_date"
                      label="Received date"
                      append-icon="mdi-calendar"
                      hide-details
                      outlined
                      dense
                      background-color="white"
                      :disabled="!item.object_key"
                      v-bind="attrs"
                      v-on="on"
                    ></v-text-field>
                  </template>
                  <v-date-picker v-model="item.upload_date" @change="updateDocumentation(item)"></v-date-picker>
                </v-menu>
              </v-col>

              <v-col cols="12" md="3">
                <v-autocomplete
                  outlined
                  dense
                  background-color="white"
                  hide-details
                  label="Status"
                  v-model="item.status"
                  :disabled="!item.object_key"
                  :items="documentStatusList"
                  item-text="description"
                  item-value="id"
                  @change="updateDocumentation(item)"
                ></v-autocomplete>
              </v-col>
              <v-col cols="12" md="3">
                <v-menu
                  v-model="item.status_date_menu"
                  transition="scale-transition"
                  left
                  nudge-top="26"
                  offset-y
                  min-width="auto"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field
                      :value="item.status_date"
                      label="Status date"
                      append-icon="mdi-calendar"
                      hide-details
                      readonly
                      outlined
                      dense
                      background-color="white"
                      :disabled="!item.object_key"
                      v-bind="attrs"
                      v-on="on"
                    ></v-text-field>
                  </template>
                  <v-date-picker v-model="item.status_date" @change="updateDocumentation(item)"></v-date-picker>
                </v-menu>
              </v-col>

              <v-col cols="12" md="3">
                <v-text-field
                  outlined
                  dense
                  background-color="white"
                  hide-details
                  :disabled="!item.object_key"
                  label="Comment"
                  v-model="item.comment"
                  @change="updateDocumentation(item)"
                ></v-text-field>
              </v-col>

              <v-col cols="12" v-if="item.file_name && item.upload_date">
                <strong>{{ item.file_name }}</strong> - uploaded by <strong>{{ item.upload_user }}</strong>
              </v-col>

              <v-col cols="12" v-else> * {{ item.required_for }} </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showAdd" modal persistent max-width="600px">
      <v-card>
        <v-toolbar dense color="primary" dark flat>
          Upload Documentation
          <v-spacer></v-spacer>
          <v-btn icon @click="showAdd = false"> <v-icon>mdi-close</v-icon></v-btn>
        </v-toolbar>
        <v-card-text class="pt-4" v-if="uploadDoc">
          <v-autocomplete
            label="Documentation"
            dense
            outlined
            v-model="uploadDoc.requirement_type_id"
            :items="documentTypeOptions"
            item-text="description"
            item-value="id"
          ></v-autocomplete>

          <v-file-input
            outlined
            dense
            background-color="white"
            label="Select document"
            v-model="uploadFile"
            prepend-inner-icon="mdi-paperclip"
            prepend-icon=""
          ></v-file-input>

          <v-row>
            <v-col cols="6">
              <v-menu
                v-model="uploadDoc.received_date_menu"
                :close-on-content-click="false"
                transition="scale-transition"
                left
                nudge-top="26"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="uploadDoc.received_date"
                    label="Received date"
                    append-icon="mdi-calendar"
                    readonly
                    hide-details
                    outlined
                    dense
                    background-color="white"
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="uploadDoc.received_date"
                  @input="uploadDoc.received_date_menu = false"
                ></v-date-picker>
              </v-menu>
            </v-col>
            <v-col cols="6">
              <v-menu
                v-model="uploadDoc.completed_date_menu"
                :close-on-content-click="false"
                transition="scale-transition"
                left
                nudge-top="26"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="uploadDoc.completed_date"
                    label="Completed date"
                    append-icon="mdi-calendar"
                    readonly
                    hide-details
                    outlined
                    dense
                    background-color="white"
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="uploadDoc.completed_date"
                  @input="uploadDoc.completed_date_menu = false"
                ></v-date-picker>
              </v-menu>
            </v-col>
            <v-col cols="6">
              <v-autocomplete
                outlined
                dense
                background-color="white"
                label="Status"
                hide-detail
                v-model="uploadDoc.status"
                :items="documentStatusList"
                item-text="description"
                item-value="id"
              ></v-autocomplete>
            </v-col>

            <v-col cols="6">
              <v-text-field
                outlined
                dense
                background-color="white"
                label="Comment"
                v-model="uploadDoc.comment"
                hide-detail
              ></v-text-field>
            </v-col>
          </v-row>

          <v-divider class="mb-5"></v-divider>
          <v-btn class="mt-0" color="primary" @click="doUploadItem" :disabled="!canUpload">
            Upload documentation
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <confirm-dialog ref="confirm"></confirm-dialog>

    <pdf-preview-dialog ref="pdfPreview"></pdf-preview-dialog>
    <pdf-preview-sidebar ref="pdfPreviewSide"></pdf-preview-sidebar>
  </div>
</template>

<script>
import Vue from "vue";
import store from "../../store";
import { mapActions, mapGetters, mapState } from "vuex";
import axios from "axios";
import moment from "moment";
import { sortBy, isEmpty } from "lodash";
import { APPLICATION_URL, REQUIREMENT_TYPE } from "../../urls";
import PdfPreviewDialog from "@/components/PDFPreviewDialog.vue";
import PdfPreviewSidebar from "@/components/PDFPreviewSidebar.vue";

export default {
  name: "Home",
  components: { PdfPreviewDialog, PdfPreviewSidebar },
  data: () => ({
    applicationId: -1,
    uploadedDoc: [],
    documentTypeOptions: [],
    showAdd: false,
    uploadFile: null,
    uploadDoc: null,
  }),
  computed: {
    ...mapGetters(["documentStatusList"]),
    ...mapState(["documentation"]),
    username() {
      return store.getters.fullName;
    },
    application: function() {
      return store.getters.selectedApplication;
    },
    student: function() {
      return store.getters.selectedStudent;
    },

    canUpload() {
      return (
        this.uploadDoc.requirement_type_id && this.uploadDoc.received_date && this.uploadDoc.status && this.uploadFile
      );
    },
  },
  async mounted() {
    this.loadRequirementTypes();
    this.applicationId = this.$route.params.id;
    let storeApp = store.getters.selectedApplication;

    if (this.applicationId != storeApp.id) {
      await store.dispatch("loadApplication", this.applicationId);
    }

    await this.loadDocuments();

    store.dispatch("setAppSidebar", true);
    store.dispatch("setDocumentStatus");
  },
  methods: {
    ...mapActions(["loadDocumentation"]),

    async loadDocuments() {
      await this.loadDocumentation();
    },

    expand(item, idx) {
      item.showThing = !item.showThing;
      Vue.set(this.documentation, idx, item);
    },

    canPreview(item) {
      if (item.file_name && item.upload_date) {
        let previewTypes = ["application/pdf"];
        if (previewTypes.includes(item.mime_type) || item.mime_type.startsWith("image/")) return true;
      }

      return false;
    },

    showPreview(item) {
      if (item.mime_type.startsWith("image/"))
        this.$refs.pdfPreviewSide.showImage(
          item.file_name,
          `${APPLICATION_URL}/${this.application.id}/student/${this.student.id}/files_id/${item.object_key}`
        );
      else
        this.$refs.pdfPreviewSide.show(
          item.file_name,
          `${APPLICATION_URL}/${this.application.id}/student/${this.student.id}/files_id/${item.object_key}`
        );
    },

    downloadItem(item) {
      window.open(`${APPLICATION_URL}/${this.application.id}/student/${this.student.id}/files_id/${item.object_key}`);
    },

    downloadItemPdf(item) {
      window.open(
        `${APPLICATION_URL}/${this.application.id}/student/${this.student.id}/files_id_pdf/${item.object_key_pdf}`
      );
    },

    startUploadItem(item) {
      this.uploadDoc = {
        requirement_type_id: item.requirement_type_id,
        received_date: moment().format("YYYY-MM-DD"),
        status: 1,
        comment: "",
      };

      this.showAdd = true;
    },

    async doUploadItem() {
      if (!this.canUpload) return;

      if (this.uploadDoc.status != 1)
        this.uploadDoc.completed_date = this.uploadDoc.completed_date ?? moment().format("YYYY-MM-DD");

      const formData = new FormData();
      formData.append("files", this.uploadFile);
      formData.append("requirement_type_id", this.uploadDoc.requirement_type_id);
      formData.append("comment", this.uploadDoc.comment);
      formData.append("completed_date", this.uploadDoc.completed_date);
      formData.append("received_date", this.uploadDoc.received_date);
      formData.append("status", this.uploadDoc.status);

      axios
        .post(`${APPLICATION_URL}/${this.application.id}/student/${this.student.id}/files`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then(() => {
          this.loadDocuments();
          this.showAdd = false;
        });
    },

    startDeleteItem(item) {
      this.$refs.confirm.show(
        "Delete Documentation",
        `You are sure you want to permanently delete ${item.file_name}?`,
        () => {
          axios
            .delete(`${APPLICATION_URL}/${this.application.id}/student/${this.student.id}/files/${item.object_key}`)
            .then(() => {
              this.loadDocuments();
            });
        },
        () => {}
      );
    },

    updateDocumentation(item) {
      let body = {
        upload_date: item.upload_date,
        status: item.status,
        status_date: new Date(),
        comment: item.comment,
      };

      axios
        .put(`${APPLICATION_URL}/${this.application.id}/student/${this.student.id}/files/${item.object_key}`, body)
        .then((resp) => {
          let message = resp.data.messages[0];
          this.$emit("showSuccess", message.text);
          this.loadDocuments();
        });
    },

    formatDate(date) {
      if (!date) return null;
      return date.toString().slice(0, 10);
    },

    loadRequirementTypes() {
      axios.get(REQUIREMENT_TYPE).then((resp) => {
        let docs = resp.data.data.filter((d) => d.is_active);
        this.documentTypeOptions = sortBy(docs, "description");
      });
    },
  },
};
</script>
