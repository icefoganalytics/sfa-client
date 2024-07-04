import knex from "knex";
import { DB_CONFIG } from "@/config";
import {
  AddressesFromDraft,
  Application,
  ApplicationFromDraft,
  ConsentFromDraft,
  DependantsFromDraft,
  ExpensesFromDraft,
  FundingFromDraft,
  IncomeFromDraft,
  OtherFundingFromDraft,
  ParentsFromDraft,
  PersonFromDraft,
  ResidenceFromDraft,
  StudentFromDraft,
} from "@/models";
import moment from "moment";

const db = knex(DB_CONFIG);
const schema = "sfa";

export class PortalApplicationService {
  getApplication() {
    return { name: "2022/23" };
  }

  async getDraftsForStudent(student_id: number) {
    let drafts = await db("application_draft")
      .withSchema(schema)
      .where({ student_id, is_active: true })
      .orderBy("status")
      .orderBy("update_date", "desc");

    for (let d of drafts) {
      d.description = `This application was created on ${moment
        .utc(d.create_date)
        .format("MMMM D, YYYY")} and last saved ${moment.utc(d.update_date).fromNow()}.`;
    }

    return drafts;
  }

  async getApplicationsForStudent(student_id: number) {
    let drafts = await db("application_draft").withSchema(schema).where({ student_id, is_active: true });
    let applications = await db("application").withSchema(schema).where({ student_id });

    for (let d of drafts) {
      d.status = "In Progress";
      d.description = "This ";
    }

    for (let d of applications) {
      d.status = "Closed";
    }

    return drafts.concat(applications);
  }

  async createDraft(draft: any) {
    let inserted = await db("application_draft").withSchema(schema).insert(draft).returning("*");

    return inserted[0];
  }

  async updateDraft(id: number, draftPartial: any) {
    return await db("application_draft").withSchema(schema).where({ id }).update(draftPartial);
  }

  async submitDraft(
    student: any,
    id: number,
    academicYear: { id: number; start_date: Date; end_date: Date }
  ): Promise<Application | undefined> {
    return new Promise(async (resolve, reject) => {
      let draft = await db("application_draft").withSchema(schema).where({ id }).first();

      if (draft) {
        let trx = await db.transaction();
        let errorMessage = "Error loading application information";

        try {
          let draftApp = JSON.parse(draft.application_json);
          let combinedApp = { ...draft, ...draftApp };
          let conv = ApplicationFromDraft(combinedApp);

          if (
            !moment(conv.classes_start_date).isBetween(moment(academicYear.start_date), moment(academicYear.end_date))
          ) {
            return reject(
              `The start date for classes must between ${moment
                .utc(academicYear.start_date)
                .format("YYYY/MM/DD")} and ${moment.utc(academicYear.end_date).format("YYYY/MM/DD")} for a ${
                academicYear.id
              } application.`
            );
          }
          /* let parents = ParentsFromDraft(combinedApp);
          if (parents && parents[0]) {
            let relationship_id = parents[0].relationship;
            delete parents[0].relationship;

            parents[0].id = 123;
            console.log("I AM IN P1 makind bad",)

            let p1 = await trx("person")
              .withSchema(schema)
              .insert(parents[0])
              .returning("*")
              .then(async (r) => {
                if (r && r.length == 1) {
                  conv.parent1_id = r[0].id;
                  await trx("student_persons").withSchema(schema).insert({
                    student_id: student.id,
                    person_id: r[0].id,
                    relationship_id,
                    is_active: true,
                  });
                }
              });

              console.log("I AM IN P1", p1)

          }

          if (parents && parents[1]) {
            let relationship_id = parents[1].relationship;
            delete parents[1].relationship;
            let p2 = await trx("person").withSchema(schema).insert(parents[1]).returning("*");

            if (p2 && p2.length == 1) {
              conv.parent2_id = p2[0].id;
              await trx("student_persons").withSchema(schema).insert({
                student_id: student.id,
                person_id: p2[0].id,
                relationship_id,
                is_active: true,
              });
            }
          } */

          let errorMessage = "Error creating addresses";
          let addresses = AddressesFromDraft(combinedApp);
          if (addresses && addresses.length > 0) {
            for (let address of addresses) {
              address.person_id = student.person_id;
              let newAddrId = await trx("person_address").withSchema(schema).insert(address).returning("*");

              if (
                newAddrId &&
                newAddrId.length > 0 &&
                combinedApp.addresses.primary == "Permanent" &&
                address.address_type_id == 1
              )
                (conv as any).primary_address_id = newAddrId[0].id;
              else if (
                newAddrId &&
                newAddrId.length > 0 &&
                combinedApp.addresses.primary == "School" &&
                address.address_type_id == 3
              )
                (conv as any).primary_address_id = newAddrId[0].id;
            }
          }

          if (combinedApp.addresses.home_address1_id != -1 && combinedApp.addresses.primary == "Permanent") {
            (conv as any).primary_address_id = combinedApp.addresses.home_address1_id;
          }
          if (combinedApp.addresses.home_address2_id != -1 && combinedApp.addresses.primary == "School") {
            (conv as any).primary_address_id = combinedApp.addresses.home_address2_id;
          }

          errorMessage = "Error updating person record";
          let person = PersonFromDraft(combinedApp);
          await trx("person").withSchema(schema).where({ id: student.person_id }).update(person);

          errorMessage = "Error creating consents";
          let consents = ConsentFromDraft(combinedApp);
          if (consents && consents.length > 0) {
            for (let consent of consents) {
              consent.student_id = student.id;
              await trx("student_consent").withSchema(schema).insert(consent);
            }
          }

          errorMessage = "Error creating residences";
          let residences = ResidenceFromDraft(combinedApp);
          if (residences && residences.length > 0) {
            for (let residence of residences) {
              residence.student_id = student.id;
              await trx("residence").withSchema(schema).insert(residence);
            }
          }
          errorMessage = "Error creating new application";
          let newApplication = await trx("application").withSchema(schema).insert(conv).returning("*");

          if (newApplication) {
            errorMessage = "Error creating funding requests";
            let fundings = FundingFromDraft(combinedApp);
            if (fundings && fundings.length > 0) {
              for (let funding of fundings) {
                funding.application_id = newApplication[0].id;
                await trx("funding_request").withSchema(schema).insert(funding);
              }
            }
            errorMessage = "Error creating other funding";

            let otherFundings = OtherFundingFromDraft(combinedApp);
            if (otherFundings && otherFundings.length > 0) {
              for (let funding of otherFundings) {
                funding.application_id = newApplication[0].id;
                await trx("agency_assistance").withSchema(schema).insert(funding);
              }
            }

            errorMessage = "Error creating income records";
            let incomes = IncomeFromDraft(combinedApp);
            if (incomes && incomes.length > 0) {
              for (let income of incomes) {
                income.application_id = newApplication[0].id;
                await trx("income").withSchema(schema).insert(income);
              }
            }

            errorMessage = "Error creating expense records";
            let expenses = ExpensesFromDraft(combinedApp);
            if (expenses && expenses.length > 0) {
              for (let expense of expenses) {
                expense.application_id = newApplication[0].id;
                await trx("expense").withSchema(schema).insert(expense);
              }
            }

            errorMessage = "Error creating dependent records";
            let depends = DependantsFromDraft(combinedApp);
            if (depends && depends.length > 0) {
              for (let depend of depends) {
                let elig = depend.eligibility;
                delete depend.eligibility;
                depend.student_id = student.id;
                let newDep = await trx("dependent").withSchema(schema).insert(depend).returning("*");

                elig.application_id = newApplication[0].id;
                elig.dependent_id = newDep[0].id;
                await trx("dependent_eligibility").withSchema(schema).insert(elig);
              }
            }

            errorMessage = "Error updating student record";
            let studentUpdate = StudentFromDraft(combinedApp);
            await trx("student").withSchema(schema).where({ id: student.id }).update(studentUpdate);

            errorMessage = "Error setting draft status";
            await trx("application_draft").withSchema(schema).where({ id }).update({
              status: "Submitted",
              application_id: newApplication[0].id,
              submit_date: new Date(),
            });
          }

          errorMessage = "";

          await trx.commit();
          resolve(newApplication[0]);
        } catch (e: any) {
          trx.rollback();
          console.log("ERROR SUBMITTING APPLICATION", e);
          return reject(errorMessage);
        }
      }

      resolve(undefined);
    });
  }

  async deleteDraft(id: number) {
    return await db("application_draft").withSchema(schema).where({ id }).delete();
  }
}
