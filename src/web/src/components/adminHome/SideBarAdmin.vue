<template>
  <v-navigation-drawer permanent clipped :app="show" :class="{ 'd-none': !show }" color="bgAdminBar" width="350">
    <v-list-item>
      <v-list-item-content class="my-5 d-flex justify-center align-center">
        <v-list-item-title class="text-h6 ml-5">
          Administration
        </v-list-item-title>
        <v-list-item-subtitle class="ml-5">
          SFA
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>

    <div class="line"></div>

    <v-list dense nav>
      <v-list-item
        v-for="(item, index) in itemsList"
        :key="item.title"
        link
        :to="item.path"
        :light="true"
        @click="setPosition(index)"
        color="rgba(0,0,0,0)"
      >
        <template v-slot:default="props">
          <div class="flex-column" id="itemsContainer">
            <div class="d-flex justify-center align-center w-100" id="itemsList">
              <v-list-item-icon class="headline my-5 ml-5">
                <!-- <v-icon>{{ item.icon }}</v-icon> -->
                <font-awesome-icon :icon="item.icon" />
              </v-list-item-icon>

              <v-list-item-content>
                <v-list-item-title class="subtitle-1 font-weight-medium">{{ item.title }}</v-list-item-title>
              </v-list-item-content>
            </div>
            <div v-if="item?.subItems?.length && position === index" id="sub-list">
              <v-list-item
                v-for="(itm, idx) in item.subItems"
                :key="idx"
                link
                :to="itm.path"
                @click="setCurrentLink(index, itm.path)"
              >
                <template v-slot:default="vals">
                  <v-list-item-title id="sub-list-item" class="ml-5 subtitle-3">{{ itm.title }}</v-list-item-title>
                </template>
              </v-list-item>
            </div>
          </div>
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
import SubRoutesSideBar from "./SubRoutesSideBar";
export default {
  name: "SideBarAdmin",
  data() {
    return {
      drawer: true,
      items: [
        {
          icon: "fa-solid fa-users",
          title: "Students",
          path: "/administration/students",
          subItems: SubRoutesSideBar.students,
        },
        {
          icon: "fa-solid fa-school",
          title: "Institutions",
          path: "/administration/institutions",
          subItems: SubRoutesSideBar.institutions,
        },
        {
          icon: "fa-solid fa-location-pin",
          title: "Location",
          path: "/administration/province",
          subItems: SubRoutesSideBar.location,
        },
        {
          icon: "fa-solid fa-list-check",
          title: "Assessment",
          path: "/administration/assessment-type",
          subItems: SubRoutesSideBar.assessment,
        },
        {
          icon: "fa-solid fa-clipboard-check",
          title: "Application",
          path: "/administration/study-field",
          subItems: SubRoutesSideBar.application,
        },
        { icon: "fa-solid fa-calendar-days", title: "Academic Years", path: "/administration/academic-year" },
        { icon: "fa-solid fa-user", title: "Officer Table", path: "/administration/officers" },
        { icon: "fa-solid fa-file-import", title: "CSL MSFAA Receive", path: "/administration/csl-msfaa-receive" },
        {
          icon: "fa-solid fa-comments",
          title: "CSL Entitlement Feedback",
          path: "/administration/csl-entitlement-feedback",
        },
        {
          icon: "fa-solid fa-file",
          title: "CSL Certificate Audit Report",
          path: "/administration/csl-certificate-audit-report",
        },
        {
          icon: "fa-solid fa-file-export",
          title: "CSL Certificate Export",
          path: "/administration/csl-certificate-export",
        },
        { icon: "fa-solid fa-paper-plane", title: "CSL MSFAA Send", path: "/administration/csl-msfaa-send" },
        { icon: "fa-solid fa-file-shield", title: "CSL Restricted Data", path: "/administration/csl-restricted-data" },
        { icon: "fa-solid fa-money-check", title: "Cheque Req List", path: "/administration/cheque-req-list" },
        { icon: "fa-solid fa-chart-simple", title: "Reports", path: "/administration/reports" },
      ],
      currentLink: null,
      position: null,
    };
  },
  props: {
    show: Boolean,
  },
  methods: {
    setTrue(active) {
      const setA = active;
      setA.active = true;
    },
    setCurrentLink(idx, path) {
      this.currentLink = path;
      this.position = idx;
    },
    setPosition(idx) {
      this.position = idx;
      this.currentLink = null;
    },
  },
  computed: {
    itemsList() {
      const newItems = JSON.parse(JSON.stringify([...this.items]));
      if (this.position >= 0 && this.currentLink) {
        newItems[this.position].path = this.currentLink;
      }
      return newItems;
    },
  },
};
</script>

<style scoped>
.line {
  box-sizing: border-box;
  height: 2px;
  width: 100%;
  border: 1px solid #f3b228;
}
#sub-list .v-list-item--active {
  background: transparent !important;
  color: transparent !important;
}
#itemsList {
  color: #212121 !important;
}

#itemsContainer {
  width: 100%;
}

#sub-list .v-list-item--active #sub-list-item {
  background: transparent !important;
  color: #0097a9 !important;
}

#sub-list #sub-list-item {
  background: transparent !important;
  color: #8a8885 !important;
}
</style>
