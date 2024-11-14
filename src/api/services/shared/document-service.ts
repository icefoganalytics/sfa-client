import knex from "knex";
import { nanoid } from "nanoid";
import { UploadedFile } from "express-fileupload";
import { Readable } from "stream";
import {
  DB_CONFIG,
  AWS_S3_BUCKET,
  AWS_S3_PATH,
  AWS_S3_ACCESS_SECRET,
  AWS_S3_ACCESS_KEY,
  AWS_S3_REGION,
  AWS_S3_ENDPOINT,
} from "../../config";
import { FileReference, FileReferenceBase, FileStatus } from "../../models";
import { S3Worker } from "../../utils/document-storage";
import { clone } from "lodash";
import { PdfConverterIntegration } from "./pdf-conversion-service";

const db = knex(DB_CONFIG);

const pdfConverter = new PdfConverterIntegration();

export class DocumentService {
  readonly s3Helper: S3Worker;

  constructor() {
    this.s3Helper = new S3Worker(
      AWS_S3_ENDPOINT,
      AWS_S3_ACCESS_KEY,
      AWS_S3_ACCESS_SECRET,
      AWS_S3_BUCKET,
      AWS_S3_REGION
    );
  }

  async verify(): Promise<any> {
    try {
      let list = await this.s3Helper.listFiles();

      //console.log(list);

      return { connection: true, bucket_exists: true };

      /*   const command = new ListBucketsCommand({});
      const bucketList = await this.client.send(command);

      if (bucketList.Buckets && bucketList.Buckets.length > 0) {
        let docBucket = bucketList.Buckets?.filter((b) => b.Name == AWS_S3_BUCKET);

        if (docBucket && docBucket.length > 0) {
          const countCommand = new ListObjectsV2Command({ Bucket: AWS_S3_BUCKET, MaxKeys: 1 });
          const count = await this.client.send(countCommand);

          return {
            connection: true,
            bucket_exists: docBucket?.length > 0,
            contains_objects: (count.Contents || []).length > 0,
          };
        }
      } else {
        return { connection: true, bucket_exists: false };
      } */
    } catch (e) {
      return { connection: false, e };
    }
  }

  //return the Document metadata
  async getDocument(object_key: string): Promise<FileReferenceBase | undefined> {
    return await db<FileReferenceBase>("sfa.file_reference").where({ object_key }).first();
  }

  //return the Document metadata
  async getDocumentsForStudent(student_id: number): Promise<FileReferenceBase[]> {
    return await db<FileReferenceBase>("sfa.file_reference").where({ student_id });
  }

  //return the Document metadata
  async getStandingDocumentsForStudent(student_id: number): Promise<FileReferenceBase[]> {
    return await db<FileReferenceBase>("sfa.file_reference")
      .innerJoin("sfa.requirement_type", "requirement_type.id", "file_reference.requirement_type_id")
      .where({ student_id, is_standing_document: true });
  }

  //return the Document metadata
  async getDocumentsForApplication(application_id: number): Promise<FileReferenceBase[]> {
    return await db<FileReferenceBase>("sfa.file_reference")
      .where({ application_id })
      .leftJoin("sfa.requirement_type", "file_reference.requirement_type_id", "requirement_type.id")
      .select("file_reference.*", "requirement_type.description as requirementTypeDescription");
  }

  //return the Document metadata
  async getDocumentsForFundingRequest(funding_request_id: number): Promise<FileReferenceBase[]> {
    return await db<FileReferenceBase>("sfa.file_reference").where({ funding_request_id });
  }

  //return the Document metadata
  async getDocumentsForDraft(application_draft_id: number): Promise<FileReferenceBase[]> {
    return await db<FileReferenceBase>("sfa.file_reference")
      .innerJoin("sfa.document_status", "file_reference.status", "document_status.id")
      .select(["file_reference.*", "document_status.description as status_description"])
      .where({ application_draft_id, visible_in_portal: true });
  }

  //return the Document metadata and file
  async getDocumentWithFile(object_key: string): Promise<FileReference | undefined> {
    // pull the
    let docRef = await db<FileReference>("sfa.file_reference").where({ object_key }).first();

    if (docRef) {
      const response = await this.s3Helper.download(`${AWS_S3_PATH}/${docRef.object_key}`);

      if (response.Body) {
        docRef.file_name = docRef.file_name.replace(/,/g, ""); // this was causing problems with downloads

        docRef.file_contents = response.Body; // = await streamToBuffer(response.Body as Readable);
        return docRef;
      }
    }

    return undefined;
  }

  //return the Document metadata and file
  async getPdfDocumentWithFile(object_key_pdf: string): Promise<FileReference | undefined> {
    // pull the
    let docRef = await db<FileReference>("sfa.file_reference").where({ object_key_pdf }).first();

    if (docRef) {
      const response = await this.s3Helper.download(`${AWS_S3_PATH}/${docRef.object_key_pdf}`);

      if (response.Body) {
        docRef.file_name = docRef.file_name.replace(/,/g, ""); // this was causing problems with downloads

        docRef.file_contents = response.Body; // = await streamToBuffer(response.Body as Readable);
        return docRef;
      }
    }

    return undefined;
  }

  //return the Document metadata
  async deleteDocumentsForDraft(application_draft_id: number): Promise<any> {
    let draftFiles = await db<FileReferenceBase>("sfa.file_reference").where({ application_draft_id });

    for (let file of draftFiles) {
      await this.removeDocument(file.object_key);
    }
  }

  // returns the number of documents removed (0 or 1)
  async removeDocument(object_key: string): Promise<number> {
    let docRef = await db<FileReferenceBase>("sfa.file_reference").where({ object_key }).first();

    if (docRef) {
      this.s3Helper.delete(`${AWS_S3_PATH}/${docRef.object_key}`);

      if (docRef.object_key_pdf) {
        this.s3Helper.delete(`${AWS_S3_PATH}/${docRef.object_key_pdf || ""}`);
      }

      await db("sfa.file_reference").where({ object_key }).delete();
      return 1;
    }

    return 0;
  }

  async uploadDraftDocument(
    email: string,
    student_id: string | number,
    application_id: string | number,
    file: UploadedFile,
    requirement_type_id: number,
    disability_requirement_id: string | number,
    person_id: string | number,
    dependent_id: string | number
  ) {
    let fRef = {
      object_key: nanoid(),
      object_key_pdf: nanoid(),
      bucket: AWS_S3_BUCKET,
      upload_date: new Date(),
      upload_user: email,
      upload_source: "Portal",
      file_name: file.name,
      file_contents: file.data,
      student_id: parseInt(student_id.toString()),
      application_id: undefined,
      application_draft_id: parseInt(application_id.toString()),
      requirement_type_id,
      mime_type: file.mimetype,
      file_size: file.size,
      comment: "",
      status: 1,
      status_date: new Date(),
      disability_requirement_id,
      person_id,
      dependent_id,
      visible_in_portal: true,
    } as FileReference;

    console.log("Portal File Upload:", fRef);

    await this.uploadFile(fRef);
  }

  async uploadApplicationDocument(t: UploadMetadata) {
    let fRef = {
      object_key: nanoid(),
      object_key_pdf: nanoid(),
      bucket: AWS_S3_BUCKET,
      upload_date: new Date(),
      upload_user: t.email,
      upload_source: t.source,
      file_name: t.file.name,
      file_contents: t.file.data,
      student_id: t.student_id,
      application_id: t.application_id,
      application_draft_id: undefined,
      requirement_type_id: t.requirement_type_id,
      mime_type: t.file.mimetype,
      file_size: t.file.size,
      comment: t.comment,
      status: t.status,
      status_date: new Date(),
      disability_requirement_id: t.disability_requirement_id,
      person_id: t.person_id,
      dependent_id: t.dependent_id,
      funding_request_id: t.funding_request_id,
      visible_in_portal: t.visible_in_portal,
    } as FileReference;

    return this.uploadFile(fRef);
  }

  async updateDocument(object_key: string, input: any) {
    return await db("sfa.file_reference").where({ object_key }).update(forUpdate(input));
  }

  async draftToApplication(application_draft_id: number, application_id: number) {
    await db<FileReferenceBase>("sfa.file_reference").where({ application_draft_id }).update({ application_id });
  }

  // writes a document to storage and the database
  async uploadFile(input: FileReference): Promise<FileReference> {
    await db("sfa.file_reference")
      .insert(forInsert(input))
      .then(async () => {
        await this.s3Helper.upload(`${AWS_S3_PATH}/${input.object_key}`, input.file_contents);
        // this feature is awaiting some sort of universal PDF conversion
        /* if (input.object_key_pdf) {
          try {
            let pdf = await pdfConverter.convertStream(input.file_contents);

            await this.s3Helper.upload(`${AWS_S3_PATH}/${input.object_key_pdf}`, pdf);
          } catch (err) {
            console.log("Failed to convert file to PDF", err);
          }
        } */
      })
      .catch((e) => {
        let i = clone(input) as any;
        delete i.file_contents;
        console.log("ERROR: writing to file_reference", i);
        console.log("--", e);
      });

    return input;
  }
}

function forInsert(input: FileReference | FileReferenceBase) {
  return {
    object_key: input.object_key,
    object_key_pdf: input.object_key_pdf,
    student_id: input.student_id,
    application_id: input.application_id,
    application_draft_id: input.application_draft_id,
    comment: input.comment,
    status: input.status,
    status_date: input.status_date,
    bucket: input.bucket,
    file_name: input.file_name,
    mime_type: input.mime_type,
    file_size: input.file_size,
    upload_user: input.upload_user,
    upload_date: input.upload_date,
    upload_source: input.upload_source,
    requirement_type_id: input.requirement_type_id,
    funding_request_id: input.funding_request_id,
    visible_in_portal: input.visible_in_portal,
  };
}

function forUpdate(input: FileReference | FileReferenceBase) {
  return {
    status: input.status,
    status_date: input.status_date,
    visible_in_portal: input.visible_in_portal,
    comment: input.comment,
    upload_date: input.upload_date,
  };
}

const streamToBuffer = (stream: Readable) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });

export function bufferToUploadedFileStub(buffer: Buffer, fileName: string, mimeType: string): UploadedFile {
  return {
    name: fileName,
    data: buffer,
    mimetype: mimeType,
    size: buffer.length,
    // all these are not relevant for this stub
    encoding: "not-relevant",
    tempFilePath: "not-relevant",
    truncated: false,
    md5: "not-relevant",
    async mv(path: string): Promise<void> {},
  };
}

export interface UploadMetadata {
  email: string;
  student_id: number;
  application_id: number;
  file: UploadedFile;
  source: string;
  status: DocumentStatus;
  requirement_type_id?: number;
  disability_requirement_id?: number;
  person_id?: number;
  dependent_id?: number;
  comment?: string;
  funding_request_id?: number;
  visible_in_portal?: boolean;
}

export enum DocumentStatus {
  PENDING = 1,
  APPROVED = 2,
  REJECTED = 3,
  REPLACED = 4,
  REVIEW = 5,
}

export enum DocumentSource {
  ADMIN = "Admin",
  PORTAL = "Portal",
}
