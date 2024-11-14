import express, { Request, Response } from "express";
import { PortalApplicationService, PortalStudentService } from "../../services/portal";
import StudentApplicationsService from "@/services/portal/students/student-applications-service";
import { DocumentService, DocumentStatus, DocumentationService } from "../../services/shared";
import { isArray } from "lodash";
import { ReferenceService } from "@/services/portal/reference-service";

export const portalApplicationRouter = express.Router();

const applicationService = new PortalApplicationService();
const studentService = new PortalStudentService();
const documentService = new DocumentService();
const documentationService = new DocumentationService();

portalApplicationRouter.get("/:sub", async (req: Request, res: Response) => {
  const { sub } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    // replace the section below with this once we show submitted in portal
    let drafts = await applicationService.getDraftsForStudent(student.id);
    let appService = new StudentApplicationsService({ studentId: student.id });
    let apps = await appService.getApplications();
    return res.json({ data: [...drafts.filter((a) => a.status == "In Progress"), ...apps] });

    //let drafts = await applicationService.getDraftsForStudent(student.id);
    //return res.json({ data: drafts });
  }

  res.status(404).send();
});

// returns the application details for a submitted application
portalApplicationRouter.get("/:sub/application/:applicationId", async (req: Request, res: Response) => {
  const { sub, applicationId } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let appService = new StudentApplicationsService({ studentId: student.id, applicationId: parseInt(applicationId) });

    let application = await appService.getApplication().then((resp) => resp);
    /* .catch((er) => {
        console.log("SERER ERRR", er)
        return res.status(404);
      }); */

    return res.json({ data: application });
  }

  res.status(404).send();
});

// returns the letters associated with a submitted application
portalApplicationRouter.get("/:sub/application/:applicationId/letters", async (req: Request, res: Response) => {
  const { sub, applicationId } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let documents = await documentService.getDocumentsForApplication(parseInt(applicationId));

    documents = documents.filter((d) => d.funding_request_id && d.visible_in_portal);

    return res.json({ data: documents });
  }

  res.status(404).send();
});

// returns the documents associated with a submitted application
portalApplicationRouter.get("/:sub/application/:applicationId/documents", async (req: Request, res: Response) => {
  const { sub, applicationId } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let documents = await documentService.getDocumentsForApplication(parseInt(applicationId));
    documents = documents.filter((d) => d.upload_source == "Portal");

    return res.json({ data: documents });
  }

  res.status(404).send();
});

// returns the documents associated with a draft
portalApplicationRouter.get("/:sub/:draftId/required-documents", async (req: Request, res: Response) => {
  const { sub, draftId } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let applications = await applicationService.getDraftsForStudent(student.id);
    let appIds = applications.map((a) => a.id);

    if (appIds.includes(parseInt(draftId))) {
      let draft = applications.filter((a) => a.id == draftId)[0];
      let app = JSON.parse(draft.application_json);
      let returnDocs = await documentationService.getRequiredDocumentsForDraft(parseInt(draftId), app);
      res.json({ data: returnDocs });
    }
  }

  res.status(404).send();
});

//uploads a document to a draft
portalApplicationRouter.post("/:sub/:draftId/upload", async (req: Request, res: Response) => {
  const { sub, draftId } = req.params;
  const { requirement_type_id, disability_requirement_id, person_id, dependent_id, mimetype, replace, replace_id } =
    req.body;
  let student = await studentService.getBySub(sub);

  if (student) {
    let applications = await applicationService.getDraftsForStudent(student.id);
    let appIds = applications.map((a) => a.id);

    if (appIds.includes(parseInt(draftId))) {
      let email = student.email;

      if (req.files) {
        let file = isArray(req.files.file) ? req.files.file[0] : req.files.file;
        file.mimetype = mimetype;

        await documentService.uploadDraftDocument(
          email,
          student.id,
          draftId,
          file,
          requirement_type_id,
          disability_requirement_id,
          person_id,
          dependent_id
        );

        if (replace_id) {
          let doc = await documentService.getDocument(replace_id);

          if (doc) {
            await documentService.updateDocument(doc.object_key, { status: 4, status_date: new Date() });
          }
        }

        return res.json({ message: "success" });
      }
    }
  }

  res.json({ error: "No files included in request" });
});

//uploads a document to an application
portalApplicationRouter.post("/:sub/application/:applicationId/upload", async (req: Request, res: Response) => {
  const { sub, applicationId } = req.params;
  const { requirement_type_id, disability_requirement_id, person_id, dependent_id, mimetype, comment } = req.body;
  let student = await studentService.getBySub(sub);

  if (student) {
    let applications = await applicationService.getApplicationsForStudent(student.id);
    let appIds = applications.map((a) => a.id);

    if (appIds.includes(parseInt(applicationId))) {
      let email = student.email;

      if (req.files) {
        let file = isArray(req.files.file) ? req.files.file[0] : req.files.file;
        file.mimetype = mimetype;

        await documentService.uploadApplicationDocument({
          email,
          student_id: student.id,
          application_id: parseInt(applicationId),
          file,
          requirement_type_id,
          disability_requirement_id,
          person_id,
          dependent_id,
          source: "Portal",
          comment,
          status: DocumentStatus.REVIEW,
          visible_in_portal: true,
        });

        return res.json({ message: "success" });
      }
    }
  }

  res.json({ error: "No files included in request" });
});

// downloads a document
portalApplicationRouter.get("/:sub/:draftId/files/:key", async (req: Request, res: Response) => {
  const { sub, draftId, key } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let applications = await applicationService.getDraftsForStudent(student.id);
    let appIds = applications.map((a) => a.id);

    if (appIds.includes(parseInt(draftId))) {
      let fileReference = await documentService.getDocumentWithFile(key);

      if (
        fileReference &&
        fileReference.student_id == student.id &&
        fileReference.application_draft_id == parseInt(draftId)
      ) {
        res.set("Content-disposition", "attachment; filename=" + fileReference.file_name);
        res.set("Content-type", fileReference.mime_type);
        return res.send(fileReference.file_contents);
      }
    }
  }

  res.status(404).send();
});

// downloads a document from an application
portalApplicationRouter.get("/:sub/application/:applicationId/files/:key", async (req: Request, res: Response) => {
  const { sub, applicationId, key } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let applications = await applicationService.getApplicationsForStudent(student.id);
    let appIds = applications.map((a) => a.id);

    if (appIds.includes(parseInt(applicationId))) {
      let fileReference = await documentService.getDocumentWithFile(key);

      if (
        fileReference &&
        fileReference.student_id == student.id &&
        fileReference.application_id == parseInt(applicationId)
      ) {
        res.set("Content-disposition", "attachment; filename=" + fileReference.file_name);
        res.set("Content-type", fileReference.mime_type);
        return res.send(fileReference.file_contents);
      }
    }
  }

  res.status(404).send();
});

// creates a new draft application
portalApplicationRouter.post("/:sub", async (req: Request, res: Response) => {
  const { sub } = req.params;
  const { academic_year_id, student_id, application_json, is_active, create_date, update_date } = req.body;

  let newDraft = {
    student_id,
    academic_year_id,
    create_date,
    update_date,
    is_active,
    application_json,
  };

  let draft = await applicationService.createDraft(newDraft);

  res.json({ data: draft });
});

// saves a draft application
portalApplicationRouter.put("/:sub/:draftId", async (req: Request, res: Response) => {
  const { sub, draftId } = req.params;
  const { application_json, is_active } = req.body;

  let student = await studentService.getBySub(sub);

  if (student) {
    let applications = await applicationService.getDraftsForStudent(student.id);
    let appIds = applications.map((a) => a.id);

    if (appIds.includes(parseInt(draftId))) {
      let result = await applicationService.updateDraft(parseInt(draftId), {
        application_json,
        is_active,
        update_date: new Date(),
      });
      res.json({ data: result });
    }
  }

  res.status(404).send();
});

// submits a draft application and creates a real application
portalApplicationRouter.put("/:sub/:draftId/submit", async (req: Request, res: Response) => {
  const { sub, draftId } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let applications = await applicationService.getDraftsForStudent(student.id);
    let appIds = applications.map((a) => a.id);

    if (appIds.includes(parseInt(draftId))) {
      const db = new ReferenceService();

      // this returns only active and available year for portal submission
      // if it's not a match, it can't be submitted
      let academicYears = await db.getAcademicYears();

      let toSubmit = applications.find((a) => a.id == draftId);
      let yearToSubmit = academicYears.find((a) => a.id == toSubmit.academic_year_id);

      if (!yearToSubmit) {
        return res.json({
          error: "The academic year associated with this application is not currently open for submissions.",
        });
      }

      await applicationService
        .submitDraft(student, parseInt(draftId), yearToSubmit)
        .then(async (application) => {
          if (application && application.id) {
            await documentService.getDocumentsForDraft(parseInt(draftId));
            documentService.draftToApplication(parseInt(draftId), application?.id);

            return res.json({ data: application });
          } else {
            console.log("Application created, but returned empty", application);
          }
        })
        .catch((err) => {
          console.log("Error Submitting Application:", err);
          return res.json({ error: err });
        });

      return;
    }
  }

  res.status(404).send("Not found");
});

// deletes a draft application
portalApplicationRouter.delete("/:sub/:draftId", async (req: Request, res: Response) => {
  const { sub, draftId } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let applications = await applicationService.getDraftsForStudent(student.id);
    let appIds = applications.map((a) => a.id);

    if (appIds.includes(parseInt(draftId))) {
      await documentService.deleteDocumentsForDraft(parseInt(draftId));
      await applicationService.deleteDraft(parseInt(draftId));
    }

    res.json({ data: "success" });
  }

  res.status(404).send();
});
