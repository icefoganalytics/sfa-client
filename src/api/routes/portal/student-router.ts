import express, { Request, Response } from "express";
import { DocumentService, DocumentStatus } from "../../services/shared";
import { PortalStudentService } from "../../services/portal";

export const portalStudentRouter = express.Router();

const studentService = new PortalStudentService();
const documentService = new DocumentService();

portalStudentRouter.get("/:sub", async (req: Request, res: Response) => {
  const { sub } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    delete student.user_password;
  }

  res.json({ data: student });
});

portalStudentRouter.get("/:sub/addresses", async (req: Request, res: Response) => {
  const { sub } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let list = await studentService.getAddresses(student.person_id);

    for (let item of list) {
      item.address_display = `${item.city_name || ""} ${item.province_name || ""} ${item.postal_code || ""}`.trim();

      if (item.address2)
        item.address_display = `${item.address2}
${item.address_display}`;

      if (item.address1)
        item.address_display = `${item.address1}
${item.address_display}`;
    }

    return res.json({ data: list });
  }

  res.json({ data: [] });
});

portalStudentRouter.post("/feedback", async (req: Request, res: Response) => {
  const { date, improve, text, url } = req.body;

  await studentService.saveFeedback({
    create_date: new Date(),
    url,
    feedback: text,
    improve,
  });

  res.json({ data: "success" });
});

portalStudentRouter.post("/:sub", async (req: Request, res: Response) => {
  const { sub } = req.params;
  const { date_of_birth, first_name, last_name, sin, email } = req.body;

  console.log("REQUEST TO CREATE STUDENT");
  let student = await studentService.getBySub(sub);

  if (!student) {
    let result = await studentService.create(
      { first_name, last_name, sin, birth_date: date_of_birth, language_id: 1, sex_id: -1, email },
      sub
    );

    if (result) {
      return res.json({ data: result });
    } else {
      return res.json({ data: undefined });
    }
  } else {
    console.log("* STUDENT EXISTS FOR THIS SUB");
    res.json({ data: student });
  }
});

portalStudentRouter.put("/:sub", async (req: Request, res: Response) => {
  const { sub } = req.params;
  const { email, telephone, address } = req.body;

  let student = await studentService.getBySub(sub);

  let addressUpdate = {
    person_id: student.person_id,
    id: address.id,
    address_type_id: 1, // Home Address
    address1: address.first,
    address2: address.second,
    city_id: address.city,
    province_id: address.region,
    postal_code: address.postal,
  };

  if (student) {
    let result = await studentService.update(sub, {
      person_id: student.person_id,
      email,
      telephone,
      address: addressUpdate,
    });

    return res.json({ data: result });
  }
  res.status(404).send();
});

portalStudentRouter.post("/:sub/link", async (req: Request, res: Response) => {
  const { sub } = req.params;
  const { sin, date_of_birth, first_name, last_name, email_address, home_phone, home_postal, year_completed } =
    req.body;

  let student = await studentService.getBySub(sub);

  if (!student) {
    let foundMatch = await studentService.findStudentLink(
      sin,
      date_of_birth,
      first_name,
      last_name,
      email_address,
      home_phone,
      home_postal,
      year_completed,
      sub
    );

    return res.json({ data: foundMatch });
  } else {
    res.json({ data: false });
  }
});

//uploads a document
portalStudentRouter.post("/:sub/draft/:application_id/files", async (req: Request, res: Response) => {
  const { sub, application_id } = req.params;
  const { requirement_type_id, disability_requirement_id, person_id, dependent_id } = req.body;

  let student = await studentService.getBySub(sub);
  let email = student.email;

  if (req.files) {
    let files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

    for (let file of files) {
      await documentService.uploadDraftDocument(
        email,
        sub,
        application_id,
        file,
        requirement_type_id,
        disability_requirement_id,
        person_id,
        dependent_id
      );
    }
    return res.json({ message: "success" });
  }
  res.json({ error: "No files included in request" });
});

//uploads a document - MJ: I don't think this is currently used...
portalStudentRouter.post("/:sub/application/:application_id/files", async (req: Request, res: Response) => {
  const { sub, application_id } = req.params;
  const { requirement_type_id, disability_requirement_id, person_id, dependent_id } = req.body;

  let student = await studentService.getBySub(sub);
  let email = student.email;

  if (req.files) {
    let files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

    for (let file of files) {
      await documentService.uploadApplicationDocument({
        email,
        student_id: student.id,
        source: "Portal",
        status: DocumentStatus.PENDING,
        application_id: parseInt(application_id.toString()),
        file,
        requirement_type_id,
        disability_requirement_id,
        person_id,
        dependent_id,
        visible_in_portal: true,
      });
    }
    return res.json({ message: "success" });
  }
  res.json({ error: "No files included in request" });
});

// downloads a document
portalStudentRouter.get("/:student_id/application/:application_id/files/:key", async (req: Request, res: Response) => {
  const { student_id, application_id, key } = req.params;

  let fileReference = await documentService.getDocumentWithFile(key);

  if (
    fileReference &&
    fileReference.student_id == parseInt(student_id) &&
    fileReference.application_id == parseInt(application_id)
  ) {
    res.set("Content-disposition", "attachment; filename=" + fileReference.file_name);
    res.set("Content-type", fileReference.mime_type);
    return res.send(fileReference.file_contents);
  }

  res.status(404).send();
});

// at this point you can only update the status of a document
portalStudentRouter.put("/:student_id/application/:application_id/files/:key", async (req: Request, res: Response) => {
  const { student_id, application_id, key } = req.params;
  const { status } = req.body;

  let fileReference = await documentService.getDocument(key);

  if (
    fileReference &&
    fileReference.student_id == parseInt(student_id) &&
    fileReference.application_id == parseInt(application_id)
  ) {
    if (fileReference.status != status) {
      fileReference.status = status;
      fileReference.status_date = new Date();

      await documentService.updateDocument(key, fileReference);
    }
    return res.json({ message: "success" });
  }

  res.status(404).send();
});

// deletes a document
portalStudentRouter.delete(
  "/:student_id/application/:application_id/files/:key",
  async (req: Request, res: Response) => {
    const { student_id, application_id, key } = req.params;

    let fileReference = await documentService.getDocument(key);

    if (
      fileReference &&
      fileReference.student_id == parseInt(student_id) &&
      fileReference.application_id == parseInt(application_id)
    ) {
      await documentService.removeDocument(fileReference.object_key);
      return res.json({ message: "success" });
    }

    res.status(404).send();
  }
);

portalStudentRouter.get("/:sub/standing-documents", async (req: Request, res: Response) => {
  const { sub } = req.params;
  let student = await studentService.getBySub(sub);

  if (student) {
    let returnDocs = await documentService.getStandingDocumentsForStudent(student.id);
    return res.json({ data: returnDocs });
  }

  res.status(404).send();
});
