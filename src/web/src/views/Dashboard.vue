<template>
  <div class="home">
    <h1>Dashboard</h1>

    <v-card class="mt-5 mb-5" color="#fff2d5">
      <v-card-title>Find a Student or Application</v-card-title>
      <v-card-text>
        <v-text-field
          dense
          outlined
          background-color="white"
          label="Search"
          append-icon="mdi-magnify"
          @click:append="doSearch"
          @keydown="searchKeyUp"
          hint="Enter a Name, SIN or locator number and press Enter"
          v-model="search"
        ></v-text-field>
        <router-link to="/search">Advanced search</router-link>
      </v-card-text>
    </v-card>
    <v-row>
      <v-col cols="12">
        <v-select
          outlined
          dense
          background-color="white"
          hide-details
          label="Select a filter"
          v-model="filter"
          multiple
          item-text="name"
          item-value="code_name"
          :items="filters"
          @change="persistFilter"
        ></v-select>
      </v-col>

      <v-col cols="12" md="4" sm="6">
        <v-card class="default mb-5">
          <v-toolbar flat color="#ffc850" dense>
            Recently Viewed Students
          </v-toolbar>
          <v-card-text class="py-0 px-3">
            <p v-if="recentStudents.length == 0" class="mb-0">None yet</p>

            <v-list dense color="#ffffff00" v-if="recentStudents" class="ml-0">
              <div v-for="(item, idx) of recentStudents">
                <v-list-item :to="`/student/${item.id}`" class="pl-1 ml-0 py-2" style="min-height: auto">
                  <v-list-item-content class="py-0">
                    <v-list-item-title> {{ idx + 1 }}. {{ item.first_name }} {{ item.last_name }} </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <v-divider v-if="idx < recentStudents.length - 1" />
              </div>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="default mb-5 d-none">
          <v-toolbar flat color="#ffc850" dense>
            Recently Viewed Applications
          </v-toolbar>
          <v-card-text class="py-0 px-3">
            <p v-if="recentApplications.length == 0" class="mb-0">None yet</p>

            <v-list dense color="#ffffff00" v-if="recentApplications" class="ml-0">
              <div v-for="(item, idx) of recentApplications">
                <v-list-item :to="`/application/${item.id}/personal`" class="pl-1 ml-0 py-2" style="min-height: auto">
                  <v-list-item-content class="py-0">
                    <v-list-item-title>
                      {{ idx + 1 }}. {{ getStudentName(item) }} - {{ item.academic_year_id }}:
                      {{ item.main_institution.name }}
                    </v-list-item-title>
                    <!-- <v-subheader class="my-0 py-0" style="height: 14px">
                      <strong>Flags:</strong>&nbsp; {{ item.flags.replace(/,/g, ", ") }}
                    </v-subheader> -->
                  </v-list-item-content>
                </v-list-item>
                <v-divider v-if="idx < recentApplications.length - 1" />
              </div>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="default">
          <v-toolbar flat color="#ffc850" dense>
            Flagged Applications
          </v-toolbar>
          <v-card-text class="pb-0 px-3">
            <v-select
              label="Select a flag"
              class="my-0"
              v-model="selectedFlag"
              :items="flagOptions"
              dense
              outlined
              background-color="white"
              hide-details
            >
            </v-select>
            <div class="d-flex" style="font-size: .8rem">
              <v-switch v-model="filterFlagged" label="Also apply name filter" hide-details class="my-0" />
            </div>
            <v-divider class="mt-1" />
            <p v-if="filteredFlagMatches.length == 0" class="mb-0 mt-2">None yet</p>

            <v-list dense color="#ffffff00" v-if="filteredFlagMatches" class="mt-0 pt-0">
              <div v-for="(item, idx) of filteredFlagMatches">
                <v-list-item :to="`/application/${item.id}/personal`" class="pl-1">
                  <v-list-item-content>
                    <v-list-item-title>{{ idx + 1 }}. {{ item.title }} </v-list-item-title>
                    <v-subheader class="my-0 py-0 ml-3">
                      <strong>Flags:</strong> {{ item.flags.replace(/,/g, ", ") }}
                    </v-subheader>
                  </v-list-item-content>
                </v-list-item>
                <v-divider v-if="idx < filteredFlagMatches.length - 1" />
              </div>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" sm="6">
        <v-card class="default">
          <v-toolbar flat color="#ffc850" dense>
            New Applications
          </v-toolbar>
          <v-card-text class="py-0 px-3">
            <!-- <h3 class="text-h6 font-weight-regular mb-0">New Applications</h3> -->

            <div v-if="loading">Loading...</div>
            <p v-if="newApplications.length == 0 && !loading" class="mb-0 mt-3">None yet</p>

            <v-list dense color="#ffffff00" v-if="newApplications">
              <div v-for="(item, idx) of newApplications">
                <v-list-item :to="`/application/${item.id}/personal`" class="pl-1">
                  <v-list-item-content class="">
                    <v-list-item-title>{{ idx + 1 }}. {{ item.title }} </v-list-item-title>
                    <v-subheader class="my-0 py-0 ml-3">
                      <strong>Submitted:</strong> {{ getFormattedDate(item.online_submit_date) }}
                    </v-subheader>
                  </v-list-item-content>
                </v-list-item>
                <v-divider v-if="idx < newApplications.length - 1" />
              </div>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" sm="6">
        <v-card class="default mb-5">
          <v-toolbar flat color="#ffc850" dense>
            Recent Updates or Messages
          </v-toolbar>
          <v-card-text class="py-0 px-3">
            <p v-if="recentUpdated.length == 0" class="mb-0 mt-3">None yet</p>

            <v-list dense color="#ffffff00" v-if="recentUpdated">
              <div v-for="(item, idx) of recentUpdated">
                <v-list-item :to="item.url" class="pl-1">
                  <v-list-item-content class="">
                    <v-list-item-title>
                      <v-icon>{{ item.icon }}</v-icon>
                      {{ item.title }}
                    </v-list-item-title>
                    <v-subheader class="my-0  ml-5">
                      <strong>Updated:</strong> {{ getFormattedDate(item.updated_at) }}
                    </v-subheader>
                  </v-list-item-content>
                </v-list-item>
                <v-divider v-if="idx < recentUpdated.length - 1" />
              </div>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-navigation-drawer v-model="drawer" absolute right temporary width="600" loading>
      <v-list-item loading>
        <v-list-item-content>
          <v-list-item-title>
            <div class="float-right">
              <v-btn
                x-small
                color="primary"
                text
                :to="'/search?text=' + search"
                class="my-0"
                style="font-size: 12px !important"
              >
                Advanced search</v-btn
              >
            </div>
            <div class="float-left">Students ({{ resultCount }} matches)</div>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-divider></v-divider>

      <div style="max-height: 90%; overflow-y: scroll">
        <v-data-table
          hide-default-footer
          :headers="[
            { text: '', value: 'action', width: '40px' },
            { text: 'SIN', value: 'sin' },
            { text: 'Name', value: 'name' },
            { text: 'Locator', value: 'locator_number' },
          ]"
          :items="searchResults"
          :items-per-page="-1"
          :loading="isSearching"
          @click:row="selectStudent"
          loading-text="Searching for students"
        >
          <template v-slot:item.action="{ item }">
            <v-btn outlined icon color="primary" :to="`/student/${item.student_id}`" title="View student record"
              ><v-icon>mdi-school</v-icon></v-btn
            >
          </template>
        </v-data-table>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script>
import axios from "axios";
import moment from "moment";
import { mapActions, mapState } from "vuex";
import { get, includes } from "lodash";
import { APPLICATION_URL, STUDENT_SEARCH_URL } from "../urls";

export default {
  name: "Home",
  computed: {
    ...mapState(["flagOptions", "flagMatches"]),
    filteredFlagMatches() {
      if (this.filterFlagged && this.filter.length > 0) {
        let matches = [];

        for (let item of this.filter) {
          matches.push(...this.flagMatches.filter((f) => f.last_name.startsWith(item)));
        }

        return matches;
      } else return this.flagMatches;
    },
  },
  data: () => ({
    selectedFlag: "",
    filterFlagged: false,

    filter: [],
    recentApplications: [],
    recentStudents: [],
    search: "",
    drawer: null,
    selectedStudent: null,
    searchResults: [],
    resultCount: 0,
    isSearching: false,
    newApplications: [],
    recentUpdated: [],
    loading: true,
    filters: [
      {
        name: "Clear",
        code_name: "CLEAR",
      },
      { divider: true },
      {
        name: "A",
        code_name: "A",
      },
      {
        name: "B",
        code_name: "B",
      },
      {
        name: "C",
        code_name: "C",
      },
      {
        name: "D",
        code_name: "D",
      },
      {
        name: "E",
        code_name: "E",
      },
      {
        name: "F",
        code_name: "F",
      },
      {
        name: "G",
        code_name: "G",
      },
      {
        name: "H",
        code_name: "H",
      },
      {
        name: "I",
        code_name: "I",
      },
      {
        name: "J",
        code_name: "J",
      },
      {
        name: "K",
        code_name: "K",
      },
      {
        name: "L",
        code_name: "L",
      },
      {
        name: "M",
        code_name: "M",
      },
      {
        name: "N",
        code_name: "N",
      },
      {
        name: "O",
        code_name: "O",
      },
      {
        name: "P",
        code_name: "P",
      },
      {
        name: "Q",
        code_name: "Q",
      },
      {
        name: "R",
        code_name: "R",
      },
      {
        name: "S",
        code_name: "S",
      },
      {
        name: "T",
        code_name: "T",
      },
      {
        name: "U",
        code_name: "U",
      },
      {
        name: "V",
        code_name: "V",
      },
      {
        name: "W",
        code_name: "W",
      },
      {
        name: "X",
        code_name: "X",
      },
      {
        name: "Y",
        code_name: "Y",
      },
      {
        name: "Z",
        code_name: "Z",
      },
    ],
  }),
  mounted() {
    if (localStorage.DASHBOARD_LASTNAME_FILTER) this.filter = localStorage.DASHBOARD_LASTNAME_FILTER.split(",");
    if (localStorage.RECENT_APPLICATIONS) this.recentApplications = JSON.parse(localStorage.RECENT_APPLICATIONS);
    if (localStorage.RECENT_STUDENTS) this.recentStudents = JSON.parse(localStorage.RECENT_STUDENTS);

    this.getData();
    this.loadFlagOptions();
  },
  watch: {
    selectedFlag(n, o) {
      this.searchApplicationsByFlag(n);
    },
  },
  methods: {
    ...mapActions(["loadFlagOptions", "searchApplicationsByFlag"]),

    getFormattedDate(date) {
      return `${moment(date).format("YYYY-MM-DD")} (${moment(date).fromNow()})`;
    },
    getData() {
      axios
        .get(`${APPLICATION_URL}/all`, {
          params: {
            filter: this.filter,
          },
        })
        .then((response) => {
          this.newApplications = get(response, "data.data", []);
        })
        .catch((error) => console.log(error))
        .finally(() => (this.loading = false));

      axios
        .get(`${APPLICATION_URL}/latest-updates`, {
          params: {
            filter: this.filter,
          },
        })
        .then((response) => {
          this.recentUpdated = get(response, "data.data", []);
        })
        .catch((error) => console.log(error))
        .finally(() => (this.loading = false));
    },
    searchKeyUp(event) {
      if (event.key == "Enter") this.doSearch();
    },
    persistFilter(item_code_name) {
      if (includes(item_code_name, "CLEAR") || includes(item_code_name, "ALL")) {
        localStorage.setItem("DASHBOARD_LASTNAME_FILTER", []);
        this.filter = [];
      } else {
        localStorage.setItem("DASHBOARD_LASTNAME_FILTER", item_code_name);
      }

      this.getData();
    },
    doSearch() {
      this.drawer = true;
      this.selectedStudent = null;
      this.searchResults = [];
      this.resultCount = 0;

      let cleanSearch = this.search.trim().toLowerCase();
      if (cleanSearch.length == 0) return;

      this.isSearching = true;

      axios
        .post(`${STUDENT_SEARCH_URL}`, { terms: cleanSearch })
        .then((resp) => {
          this.searchResults = resp.data.data;
          this.resultCount = resp.data.meta.item_count;
        })
        .catch((err) => {
          this.$emit("showError", err);
        })
        .finally(() => {
          this.isSearching = false;
        });
    },
    searchByFlag() {},

    selectStudent(item) {
      this.selectedStudent = item;
      this.$router.push(`/student/${item.student_id}`);
    },
    getStudentName(application) {
      return `${get(application, "student.first_name", "Not defined")} ${get(application, "student.last_name", "")}`;
    },
    selectApplication(item) {
      this.selectedApplication = item;
      this.$router.push(`/application/${item.id}/personal`);
    },
  },
};
</script>

<style scoped>
.v-list-item__title {
  font-size: 15px !important;
}
.v-subheader {
  height: 16px !important;
  font-size: 14px;
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  padding-left: 19px;
}
</style>
