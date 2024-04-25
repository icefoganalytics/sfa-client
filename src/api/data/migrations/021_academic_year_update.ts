import { Knex } from "knex";

exports.up = async function (knex: Knex) {
  await knex.schema.alterTable("sfa.academic_year", (t) => {
    t.specificType("start_date", "DATETIME2(0)");
    t.specificType("end_date", "DATETIME2(0)");
    t.boolean("is_open_in_portal");
  });

  await knex.raw(
    "  UPDATE sfa.academic_year SET start_date = CONCAT(year, '-08-01'), end_date = CONCAT(year+1, '-07-31 23:59:59')"
  );
  await knex.raw("ALTER TABLE sfa.academic_year ALTER COLUMN start_date DATETIME2(0) NOT NULL");
  await knex.raw("ALTER TABLE sfa.academic_year ALTER COLUMN end_date DATETIME2(0) NOT NULL");

  await knex.raw("UPDATE sfa.academic_year SET is_open_in_portal = CASE WHEN status = 'Open' THEN 1 ELSE 0 END");
  await knex.raw(
    "ALTER TABLE sfa.academic_year ADD CONSTRAINT academic_year_open_default DEFAULT 0 FOR is_open_in_portal"
  );
  await knex.raw("ALTER TABLE sfa.academic_year ALTER COLUMN is_open_in_portal BIT NOT NULL");
};

exports.down = async function (knex: Knex) {
  await knex.schema.alterTable("sfa.academic_year", (t) => {
    t.dropColumn("start_date");
    t.dropColumn("end_date");
    t.dropChecks("academic_year_open_default");
    t.dropColumn("is_open_in_portal");
  });
};
