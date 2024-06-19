import { DB_CONFIG } from "@/config";
import knex from "knex";
import { DocumentService } from "./document-service";
import { clone, groupBy, sortBy, uniq } from "lodash";
import { FundingFromDraft } from "@/models";

const db = knex(DB_CONFIG);
const schema = "sfa";

const documentService = new DocumentService();

export class DocumentationService {
  async getRequiredDocumentsForApplication(applicationId: number, app: any) {
    let existingDocs = await documentService.getDocumentsForApplication(applicationId);
    existingDocs = existingDocs.filter((d) => d.status_description != "Replaced");

    let appDetail = await db("application")
      .withSchema(schema)
      .leftOuterJoin("dependent_eligibility", "dependent_eligibility.application_id", "application.id")
      .leftOuterJoin("agency_assistance", "agency_assistance.application_id", "application.id")
      .select("application.csl_classification")
      .count("dependent_eligibility.dependent_id as dependents")
      .count("agency_assistance.id as other_funding")
      .groupBy("csl_classification")
      .where({ "application.id": applicationId })
      .first();

    if (!appDetail) return [];

    let funding = await db("funding_request")
      .withSchema(schema)
      .innerJoin("request_type", "funding_request.request_type_id", "request_type.id")
      .select("funding_request.*", "request_type.description")
      .where({ application_id: applicationId });

    let requestTypes = uniq(funding.map((f) => f.request_type_id));
    let reqDocs = await this.getDocumentRequirementsFor(requestTypes);
    let returnDocs = new Array<any>();
    let usedKeys = new Array<string>();

    for (let doc of reqDocs) {
      let existing = existingDocs.filter((d) => d.requirement_type_id == doc.requirement_type_id);
      existing = sortBy(existing, "upload_date");

      doc.status_description = "Missing";
      doc.required_for = "Required for ";

      for (let relevant of doc.relevant_to) {
        let f = funding.find((f) => f.request_type_id == relevant)?.description;
        doc.required_for += `${f}, `;
      }

      doc.required_for = doc.required_for.replace(/, $/, "");

      for (let i = 0; i < existing.length; i++) {
        usedKeys.push(existing[i].object_key);

        if (i == 0) {
          doc.upload = existing[i];
          doc = { ...doc, ...existing[i] };
          doc.status_description = existing[i].status_description;
        } else {
          let d1 = clone(doc);

          d1.upload = existing[i];
          d1 = { ...d1, ...existing[i] };
          d1.status_description = existing[i].status_description;
          returnDocs.push(d1);
        }
      }

      returnDocs.push(doc);
    }

    let missing = existingDocs.filter((d) => !usedKeys.includes(d.object_key) && !d.funding_request_id);

    missing.map((d) => {
      (d as any).description = (d as any).requirementTypeDescription;
      returnDocs.push(d);
    });

    for (let doc of returnDocs) {
      doc.meets_conditions = true;

      // if (doc.condition) console.log(doc, doc.condition);

      switch (doc.condition) {
        case "CSL Only":
          // I don't currently know how to handle this...
          // But I belive it's handled by not having the requirement
          break;
        case "Dependent":
          if (appDetail.csl_classification != 1) doc.meets_conditions = false;
          break;
        case "Has Dependant":
          if (appDetail.dependents == 0) doc.meets_conditions = false;
          break;
        case "Married/Common Law":
          if (appDetail.csl_classification != 3) doc.meets_conditions = false;
          break;
        case "Not CSL":
          // I don't currently know how to handle this...
          // But I belive it's handled by not having the requirement
          break;
        case "Not Dependent Student":
          if (appDetail.csl_classification == 1) doc.meets_conditions = false;
          break;
        case "Other Agency Funding":
          if (appDetail.other_funding == 0) doc.meets_conditions = false;
          break;
        case "Private/Distance/Outside Canada":
          break;
        case "Spouse as Dependent":
          // I don't currently know how to handle this...
          break;
        case "Yukon and Previous CSL":
          // I don't currently know how to handle this...
          // But I belive it's handled by not having the requirement
          break;
      }
    }

    returnDocs = returnDocs.filter((r) => r.meets_conditions == true || r.object_key);
    returnDocs = sortBy(returnDocs, ["description", "upload_date"]);
    return returnDocs;
  }

  async getRequiredDocumentsForDraft(draftId: number, app: any) {
    let existingDocs = await documentService.getDocumentsForDraft(draftId);
    existingDocs = existingDocs.filter((d) => d.status_description != "Replaced");

    let funding = FundingFromDraft(app);
    let requestTypes = uniq(funding.map((f) => f.request_type_id));

    let reqDocs = await this.getDocumentRequirementsFor(requestTypes);
    let returnDocs = new Array<any>();
    let usedKeys = new Array<string>();

    for (let doc of reqDocs) {
      let existing = existingDocs.filter((d) => d.requirement_type_id == doc.requirement_type_id);
      existing = sortBy(existing, "upload_date");
      doc.status_description = "Missing";

      for (let i = 0; i < existing.length; i++) {
        usedKeys.push(existing[i].object_key);

        if (i == 0) {
          doc.upload = existing[i];
          doc.status_description = existing[i].status_description;
        } else {
          let d1 = clone(doc);

          d1.upload = existing[i];
          d1.status_description = existing[i].status_description;
          returnDocs.push(d1);
        }
      }

      returnDocs.push(doc);
    }

    let missing = existingDocs.filter((d) => !usedKeys.includes(d.object_key) && !d.funding_request_id);

    missing.map((d) => {
      (d as any).description = (d as any).requirementTypeDescription;
      returnDocs.push(d);
    });

    for (let doc of returnDocs) {
      doc.meets_conditions = true;

      // if (doc.condition) console.log(doc, doc.condition);

      switch (doc.condition) {
        case "CSL Only":
          // I don't currently know how to handle this...
          // But I belive it's handled by not having the requirement
          break;
        case "Dependent":
          if (app.personal_details.category != 1) doc.meets_conditions = false;
          break;
        case "Has Dependant":
          if (app.student_dependants.has_dependants == false) doc.meets_conditions = false;
          break;
        case "Married/Common Law":
          if (app.personal_details.category != 2) doc.meets_conditions = false;
          break;
        case "Not CSL":
          // I don't currently know how to handle this...
          // But I belive it's handled by not having the requirement
          break;
        case "Not Dependent Student":
          if (app.personal_details.category == 1) doc.meets_conditions = false;
          break;
        case "Other Agency Funding":
          if (app.other_funding.has_funding == true) {
          } else doc.meets_conditions = false;
          break;
        case "Private/Distance/Outside Canada":
          break;
        case "Spouse as Dependent":
          // I don't currently know how to handle this...
          break;
        case "Permanent Resident":
          if (app.statistical.citizenship != "3") doc.meets_conditions = false;
          break;
        case "Second Residence":
          if (app.funding_sources.second_residence != true) doc.meets_conditions = false;
          break;
        case "Yukon and Previous CSL":
          // I don't currently know how to handle this...
          // But I belive it's handled by not having the requirement
          break;
      }
    }

    returnDocs = returnDocs.filter((r) => r.meets_conditions == true || r.object_key);
    returnDocs = sortBy(returnDocs, "description");
    return returnDocs;
  }

  async getDocumentRequirementsFor(reqTypes: number[]): Promise<any[]> {
    let docs = await db("request_requirement")
      .withSchema(schema)
      .innerJoin("requirement_type", "requirement_type.id", "request_requirement.requirement_type_id")
      .where({ "requirement_type.show_online": 1, "requirement_type.is_active": 1 })
      .whereIn("request_requirement.request_type_id", reqTypes)
      .select([
        "requirement_type.description",
        "requirement_type.document_location",
        "request_requirement.requirement_type_id",
        "request_requirement.request_type_id",
      ])
      .min("request_requirement.condition as condition")
      .groupBy([
        "requirement_type.description",
        "requirement_type.document_location",
        "request_requirement.requirement_type_id",
        "request_requirement.request_type_id",
      ])
      .orderBy("requirement_type.description");

    let rows = new Array<any>();

    for (let line of docs) {
      let exist = rows.find((r) => r.requirement_type_id == line.requirement_type_id);

      if (exist) {
        exist.relevant_to.push(line.request_type_id);
      } else {
        rows.push({
          description: line.description,
          document_location: line.document_location,
          requirement_type_id: line.requirement_type_id,
          condition: line.condition,
          relevant_to: [line.request_type_id],
        });
      }
    }
    return rows;
  }
}
