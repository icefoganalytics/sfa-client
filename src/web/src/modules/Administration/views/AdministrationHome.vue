<template>
  <div>
    <v-breadcrumbs
      divider="/"
      large
      :items="[
        {
          text: 'Administration Home',
          to: '/administration',
          exact: true,
        },
      ]"
    >
    </v-breadcrumbs>
    <h1>Administration Home</h1>
    <p>
      <router-link to="/administration/institutions">Institutions</router-link>
    </p>
    <p>
      <router-link to="/administration/students">Students</router-link>
    </p>
    <p>
      <router-link to="/administration/application-type">Application-Type</router-link>
    </p>
    <p>
      <router-link to="/administration/reports">Reports</router-link>
    </p>
    <p>
      <router-link to="/administration/yea-import">YEA Import</router-link>
    </p>
    <p>
      <router-link to="/administration/catalogs">Catalogs</router-link>
    </p>
  </div>
</template>

<script>
import { mapState } from "vuex";
import store from "@/store";

export default {
  data: () => ({}),
  created() {},
  computed: {
    ...mapState(["showSideBarAdmin"]),
  },
  async created() {
    await store.dispatch("setAppSideBarAdmin", this.$route.path.startsWith("/administration"));
  },
};
</script>
