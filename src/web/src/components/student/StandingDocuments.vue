<template>
  <div>
    <v-card class="mb-5 default" v-for="(item, i) of standingDocumentation" :key="i">
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
        <!-- <v-btn icon v-else @click="startUploadItem(item)">
          <v-icon>mdi-upload</v-icon>
        </v-btn>
        <v-btn icon v-if="item.file_name && item.upload_date" @click.stop="startDeleteItem(item)">
          <v-icon>mdi-delete</v-icon>
        </v-btn> -->
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

    <confirm-dialog ref="confirm"></confirm-dialog>
  </div>
</template>
<script>
import { mapActions, mapGetters, mapState } from "vuex";
import store from "../../store";

export default {
  data: () => ({
    showAdd: false,
  }),
  computed: {
    ...mapGetters(["documentStatusList"]),
    ...mapState(["standingDocumentation"]),
    student: function() {
      return store.getters.selectedStudent;
    },
  },
  async created() {
    await this.loadStandingDocumentation();
    store.dispatch("setDocumentStatus");
  },
  methods: {
    ...mapActions(["loadStandingDocumentation"]),

    expand(item, idx) {
      item.showThing = !item.showThing;
      Vue.set(this.standingDocumentation, idx, item);
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
  },
};
</script>
