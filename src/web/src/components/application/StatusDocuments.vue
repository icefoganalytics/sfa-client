<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    offset-y
    dense
    max-width="500px"
    min-width="500px"
    transition="slide-y-transition"
    bottom
    right
  >
    <template v-slot:activator="{ on, attrs }" class="text-left">
      <v-btn class="my-0" color="primary" v-bind="attrs" v-on="on" block>
        <v-icon>mdi-chevron-down</v-icon>
        Letters
      </v-btn>
    </template>

    <v-card>
      <v-toolbar dense color="#bbb" flat>
        {{ type }}
        <v-row justify="space-between" class="">
          <v-spacer />
          <v-btn-toggle group color="primary">
            <v-btn title="Upload" @click="showUpload = !showUpload">
              Upload
            </v-btn>
            <v-btn @click="printLetterClick(item, 'student')">
              Generate
            </v-btn>
          </v-btn-toggle>
        </v-row>
      </v-toolbar>

      <div class="d-flex pa-2" v-if="showUpload">
        <v-file-input
          v-model="selectedFile"
          dense
          outlined
          background-color="white"
          hide-details
          label="Choose file"
          prepend-icon=""
        ></v-file-input>
        <v-btn icon fab color="primary" small class="ml-3" @click="uploadClick"><v-icon>mdi-upload</v-icon></v-btn>
      </div>

      <v-divider></v-divider>

      <v-list lines dense class="py-0">
        <v-list-item v-if="letters.length == 0">
          <v-list-item-content>
            <v-list-item-title>No saved letters</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <div v-for="(letter, idx) of letters">
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="mb-0 pb-0"
                >{{ letter.file_name }} - ({{ formatDate(letter.upload_date) }})</v-list-item-title
              >
              <v-list-item-subtitle class="mt-0 pt-0 d-flex">
                <a @click="previewLetterClick(letter)" class="mr-5">
                  <v-icon small color="primary">mdi-eye</v-icon> Preview</a
                >
                <a @click="downloadLetterClick(letter)" class="mr-5"
                  ><v-icon small color="primary">mdi-download</v-icon> Download</a
                >
                <a @click="publishLetterClick(letter)" class="mr-5" v-if="letter.visible_in_portal">
                  <v-icon small color="primary">mdi-publish-off</v-icon> UnPublish</a
                >
                <a @click="publishLetterClick(letter)" class="mr-5" v-else>
                  <v-icon small color="primary">mdi-publish</v-icon> Publish</a
                >
                <a @click="emailLetterClick(letter)" class="mr-5">
                  <v-icon small color="primary">mdi-email</v-icon> Email</a
                >
                <v-spacer></v-spacer>
                <a @click="deleteLetterClick(letter)" color="warning" style="color:#fb8c00 ">
                  <v-icon small color="warning">mdi-delete</v-icon> Delete</a
                >
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-divider v-if="idx < letters.length - 1"></v-divider>
        </div>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script>
import axios from "axios";
import moment from "moment";
import { APPLICATION_URL, FUNDING_REQUESTS_URL } from "../../urls";

export default {
  props: ["item", "type"],
  data: () => ({
    menu: false,
    fundingTypeOptions: [],
    letters: [],
    assessments: [],
    showUpload: false,
    selectedFile: null,
  }),
  watch: {
    async menu(n) {
      if (n) {
        await this.loadLetters();
      }
    },
  },
  computed: {
    canPrintLetter() {
      const printableStatuses = [6, 7, 4]; // Awarded, Rejected, Qualified
      return !printableStatuses.includes(this.item.status_id);
    },
    isYukonGrant() {
      return this.item.request_type_id == 2;
    },
  },
  methods: {
    async loadLetters() {
      axios
        .get(`${APPLICATION_URL}/${this.item.application_id}/funding-request/${this.item.id}/letters`)
        .then((resp) => {
          this.letters = resp.data.data;
        })
        .catch();
    },
    formatDate(input) {
      if (input) return moment.utc(input).format("YYYY-MM-DD");
      return "";
    },

    async uploadClick() {
      if (this.selectedFile) {
        let body = new FormData();
        body.append("file", this.selectedFile);

        axios
          .post(`${APPLICATION_URL}/${this.item.application_id}/funding-request/${this.item.id}/letter-upload`, body, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .then((resp) => {
            this.loadLetters();
            this.selectedFile = null;
          });
      }
    },

    previewLetterClick(letter) {
      this.$emit("previewLetter", letter);
      this.menu = false;
    },
    downloadLetterClick(letter) {
      let documentUrl = `${APPLICATION_URL}/${this.item.application_id}/funding-request/${this.item.id}/letters/${letter.object_key}`;
      window.open(documentUrl);
    },
    publishLetterClick(letter) {
      axios
        .put(
          `${APPLICATION_URL}/${this.item.application_id}/funding-request/${this.item.id}/letters/${letter.object_key}`,
          { visible_in_portal: !letter.visible_in_portal }
        )
        .then((resp) => {
          this.loadLetters();
          this.selectedFile = null;
        });
    },
    emailLetterClick(letter) {},
    deleteLetterClick(letter) {
      axios
        .delete(
          `${APPLICATION_URL}/${this.item.application_id}/funding-request/${this.item.id}/letters/${letter.object_key}`
        )
        .then((resp) => {
          this.loadLetters();
        });
    },

    printLetterClick(item, letterSlug) {
      const fundingRequestId = item.id;
      let approvalLetterUrl = `${FUNDING_REQUESTS_URL}/${fundingRequestId}/letters`;

      axios
        .post(approvalLetterUrl)
        .then(async (resp) => {
          // window.open(URL.createObjectURL(resp.data));
          await this.loadLetters();
        })
        .catch((err) => {
          this.$emit("showError", err.response.data.message);
        });
    },
  },
};
</script>
