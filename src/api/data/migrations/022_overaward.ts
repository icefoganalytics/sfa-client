import { Knex } from "knex";

exports.up = async function (knex: Knex) {
  await knex.schema.createTable("sfa.overaward", (t) => {
    t.increments("id").primary();
    t.integer("student_id").notNullable().references("id").inTable("sfa.student");
    t.integer("academic_year_id").references("id").inTable("sfa.academic_year");
    t.integer("application_id").references("id").inTable("sfa.application");
    t.integer("funding_request_id").references("id").inTable("sfa.funding_request");
    t.integer("assessment_id").references("id").inTable("sfa.assessment");
    t.float("amount").notNullable();
    t.string("created_by", 150).notNullable();
    t.specificType("create_date", "DATETIME2(0)").notNullable().defaultTo(knex.fn.now(), {
      constraintName: "sfa_overaward_create_date_default",
    });
    t.text("note");
  });
};

exports.down = async function (knex: Knex) {
  await knex.schema.dropTable("sfa.overaward");
};
