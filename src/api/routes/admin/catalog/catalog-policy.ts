export class CatalogPolicy {
  readonly policies = [
    csgLookupPolicy,
    csgThresholdPolicy,
    cslLookupPolicy,
    standardOfLivingPolicy,
    studentLivingAllowancePolicy,
    childCareCeilingPolicy,
    staLookupPolicy,
    ygCostPolicy,
    parentContributionPolicy,
    transportationPolicy,
  ];

  get(tableName: string) {
    return this.policies.find((t) => t.tableName == tableName);
  }
}

const csgLookupPolicy = {
  tableName: "csg_lookup",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const csgThresholdPolicy = {
  tableName: "csg_threshold",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const cslLookupPolicy = {
  tableName: "csl_lookup",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const standardOfLivingPolicy = {
  tableName: "standard_of_living",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const studentLivingAllowancePolicy = {
  tableName: "student_living_allowance",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const childCareCeilingPolicy = {
  tableName: "child_care_ceiling",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const staLookupPolicy = {
  tableName: "sta_lookup",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const ygCostPolicy = {
  tableName: "yg_cost",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const parentContributionPolicy = {
  tableName: "parent_contribution_formula",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
const transportationPolicy = {
  tableName: "transportation",
  schema: "sfa",
  readonly: false,
  idColumn: "id",
};
