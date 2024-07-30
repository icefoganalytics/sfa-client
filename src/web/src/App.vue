<template>
  <v-app :class="instanceClass">
    <SideBarAdmin :show="hasSideBarAdmin" />
    <SnackBarAdmin />

    <v-navigation-drawer
      v-bind:app="hasSidebar"
      permanent
      :expand-on-hover="hasSidebarClosable"
      clipped
      color="#f1f1f1"
      v-bind:class="{ 'd-none': !hasSidebar }"
    >
      <v-list dense nav style="" class="mt-4">
        <v-list-item link nav title="Student Basics" :to="`/student/${selectedStudentId}`">
          <v-list-item-icon>
            <v-icon>mdi-school</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title style="line-height: 1.1rem;">Student Details</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item link nav title="Communications Log" :to="`/communications-log/${selectedStudentId}`">
          <v-list-item-icon>
            <v-icon>mdi-forum</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title style="line-height: 1.1rem;">
              Communications Log
              <v-badge v-if="flaggedCount > 0" class="ml-2 mb-0" color="error" :content="flaggedCount"></v-badge>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item class="px-0">
          <v-select
            dense
            outlined
            x-small
            label="Selected application"
            background-color="white"
            class="my-3"
            hide-details
            :items="applicationOptions"
            @change="changeApplication"
            v-model="chosenApplication"
            item-text="title"
            item-value="id"
          ></v-select>
        </v-list-item>

        <v-btn color="primary" small dark style="width: 100%" class="mb-3" @click="createApplication">
          <v-icon>mdi-plus</v-icon> Create application</v-btn
        >

        <v-divider class="mb-3"></v-divider>

        <div v-if="selectedApplicationId > 0">
          <v-list-item
            link
            nav
            v-bind:title="section.name"
            v-bind:to="section.makeUrl(selectedApplicationId)"
            v-for="section in sections"
            v-bind:key="section.name"
          >
            <v-list-item-icon>
              <v-icon>{{ section.icon }}</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ section.name }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-divider class="mb-3"></v-divider>

          <v-row>
            <v-col v-if="false"
              ><v-btn small color="warning" style="width: 100%" @click="duplicateApplication">Duplicate</v-btn></v-col
            >
            <v-col><v-btn small color="error" style="width: 100%" @click="deleteApplication">Delete</v-btn></v-col>
          </v-row>
        </div>
      </v-list>
    </v-navigation-drawer>

    <application-create
      ref="createApplicationForm"
      v-on:showError="showError"
      v-on:showSuccess="showSuccess"
      v-on:showAPIMessages="showAPIMessages"
    ></application-create>

    <application-duplicate
      ref="duplicateApplicationForm"
      v-on:showError="showError"
      v-on:showSuccess="showSuccess"
      v-on:showAPIMessages="showAPIMessages"
    ></application-duplicate>
    <application-delete
      ref="deleteApplicationForm"
      v-on:showError="showError"
      v-on:showSuccess="showSuccess"
      v-on:showAPIMessages="showAPIMessages"
    ></application-delete>

    <v-app-bar app color="#fff" flat height="70" style="left: 0; border-bottom: 3px #f3b228 solid" clipped-right>
      <!-- <v-icon color="#f3b228" class="mr-5">{{ applicationIcon }}</v-icon> -->
      <img src="/yukon.svg" style="margin: -8px 85px 0 0" height="44" />
      <v-toolbar-title>
        <span style="font-weight: 700">
          {{ applicationName }}
          <span v-if="appConfig.isTest"> - TEST</span>
          <span v-if="appConfig.isDevelopment"> - DEV</span>
        </span>

        <v-progress-circular
          :class="loadingClass"
          indeterminate
          color="#f3b228"
          size="20"
          width="2"
          class="ml-4"
        ></v-progress-circular>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <!-- <v-label dark>License Year:</v-label>
      <v-select
        v-model="licenseYear"
        smaller
        :items="licenseYears"
        dense
        style="margin-left: 15px; max-width: 150px; margin-right: 20px"
        hide-details
      ></v-select> -->
      <div v-if="isAuthenticated">
        <v-btn color="primary" text class="mr-1" to="/dashboard"><v-icon>mdi-home</v-icon></v-btn>

        <!-- <v-btn color="primary" text class="mr-1" to="/reports">Reports</v-btn> -->

        <v-divider class="mr-5" vertical inset></v-divider>

        <span>{{ username }}</span>
        <v-menu bottom left class="ml-0">
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon color="primary" v-bind="attrs" v-on="on">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list dense style="min-width: 200px">
            <v-list-item to="/profile">
              <v-list-item-icon>
                <v-icon>mdi-account</v-icon>
              </v-list-item-icon>
              <v-list-item-title>My profile</v-list-item-title>
            </v-list-item>

            <v-list-item to="/administration">
              <v-list-item-icon>
                <v-icon>mdi-cogs</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Administration</v-list-item-title>
            </v-list-item>

            <v-divider />
            <v-list-item @click="signOut">
              <v-list-item-icon>
                <v-icon>mdi-exit-run</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Sign out</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <div v-else>
        <v-btn color="primary" text to="/sign-in">Sign in</v-btn>
      </div>

      <!-- <v-app-bar-nav-icon @click.stop="drawerRight = !drawerRight"></v-app-bar-nav-icon> -->
    </v-app-bar>

    <v-main v-bind:style="{ 'padding-left: 33px !important': !hasSidebar }">
      <!-- Provides the application the proper gutter -->
      <v-container fluid>
        <v-row>
          <v-col>
            <selected-app-header v-if="showAppSidebar"></selected-app-header>
            <router-view
              v-on:showError="showError"
              v-on:showSuccess="showSuccess"
              v-on:showAPIMessages="showAPIMessages"
            ></router-view>
            <notifier ref="notifier"></notifier>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import router from "./router";
import store from "./store";
import * as config from "./config";
import { mapGetters, mapState } from "vuex";
import { LOGOUT_URL } from "./urls";
import SideBarAdmin from "@/components/adminHome/SideBarAdmin.vue";
import SnackBarAdmin from "@/components/commonCatalog/SnackBarAdmin.vue";

export default {
  name: "App",
  components: { SideBarAdmin, SnackBarAdmin },
  computed: {
    ...mapState([
      "isAuthenticated",
      "showAppSidebar",
      "showSideBarAdmin",
      "selectedApplicationId",
      "selectedApplication",
      "selectedStudentId",
      "selectedStudent",
    ]),
    ...mapGetters("communicationStore", ["flaggedCount"]),
    email_officer() {
      return store.getters.email_officer;
    },
    username() {
      return store.getters.fullName;
    },
    isAuthenticated() {
      return store.getters.isAuthenticated;
    },
    showAppSidebar() {
      return store.getters.showAppSidebar;
    },
    applicationOptions() {
      return this.selectedStudent.applications;
    },
    appConfig() {
      return config;
    },
    instanceClass() {
      if (this.appConfig.isTest) return "test-instance";
      if (this.appConfig.isProduction) return "production-instance";
      if (this.appConfig.isDevelopment) return "development-instance";
    },
  },
  data: () => ({
    dialog: false,
    drawer: null,
    drawerRight: null,
    headerShow: false,
    menuShow: false,
    loadingClass: "d-none",
    applicationName: config.applicationName,
    applicationIcon: config.applicationIcon,
    sections: config.sections,
    hasSidebar: false, //config.hasSidebar,
    hasSideBarAdmin: false,
    hasSidebarClosable: config.hasSidebarClosable,

    chosenApplication: -1,
  }),
  created: async function() {
    /* console.log("APP", this.$route.path.startsWith("/application") ||
        this.$route.path.startsWith("/student") ||
        this.$route.path.startsWith("/communications-log"))
    store.dispatch(
      "setAppSidebar",
      this.$route.path.startsWith("/application") ||
        this.$route.path.startsWith("/student") ||
        this.$route.path.startsWith("/communications-log")
    ); */
    store.dispatch("setAppSideBarAdmin", this.$route.path.startsWith("/administration"));

    this.hasSideBarAdmin = this.$route.path.startsWith("/administration");

    await store.dispatch("checkAuthentication");
    this.chosenApplication = this.selectedApplicationId;
  },
  watch: {
    isAuthenticated: function(val) {
      if (!val) {
        this.hasSidebar = false;
        this.hasSideBarAdmin = false;
      } else {
        this.hasSideBarAdmin = store.getters.showSideBarAdmin;
        this.hasSidebar = store.getters.showAppSidebar;
      }
    },
    showAppSidebar: function(val) {
      this.hasSidebar = val; // && this.isAuthenticated;
    },
    showSideBarAdmin: function(val) {
      this.hasSideBarAdmin = val;
    },
    selectedApplicationId: function(val) {
      console.log("APPCHG", val);
      this.chosenApplication = val;
    },
  },
  methods: {
    nav: function(location) {
      router.push(location);
    },
    toggleHeader: function() {
      this.headerShow = !this.headerShow;
    },
    toggleMenu: function() {
      this.menuShow = !this.menuShow;
    },
    signOut: function() {
      window.location = LOGOUT_URL;
    },
    showError: function(msg) {
      this.$refs.notifier.showError(msg);
    },
    showSuccess: function(msg) {
      this.$refs.notifier.showSuccess(msg);
    },
    showAPIMessages: function(msg) {
      this.$refs.notifier.showAPIMessages(msg);
    },
    changeApplication: function() {
      store.dispatch("loadApplication", this.chosenApplication);
      this.$router.push(`/application/${this.chosenApplication}/personal`);
    },
    createApplication: function() {
      this.$refs.createApplicationForm.show();
    },
    duplicateApplication: function() {
      this.$refs.duplicateApplicationForm.show(this.selectedApplication);
    },
    deleteApplication: function() {
      this.$refs.deleteApplicationForm.show(this.selectedApplication);
    },
  },
};
</script>
