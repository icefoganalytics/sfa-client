export default [
  {
    path: "/administration",
    name: "AdministrationHome",
    component: () => import("../views/AdministrationHome.vue"),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: "/administration/reports",
    name: "AdministrationHome",
    component: () => import("../views/ReportHome.vue"),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: "/administration/yea-import",
    name: "YEAImport",
    component: () => import("../views/YEAImport.vue"),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: "/administration/academic-year",
    name: "AcademicYear",
    component: () => import("../views/AcademicYear.vue"),
    meta: {
      requiresAuth: true,
    },
  },
];
