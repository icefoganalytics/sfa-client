import express, { Request, Response } from "express";
import knex from "knex";
import { DB_CONFIG } from "../../config";
import { UploadedFile } from "express-fileupload";
import { isArray, isNaN } from "lodash";

const db = knex(DB_CONFIG);

export const yeaImportRouter = express.Router();

yeaImportRouter.post("/", async (req: Request, res: Response) => {
  let files = req.files?.file;
  let file = isArray(files) ? files[0] : files;

  if (file) {
    if (file.mimetype != "text/plain") return res.status(400).send("File must be text");

    let parsed = parseFile(file);

    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    } else if (parsed.lines) {
      let insertedCount = 0;

      for (let line of parsed.lines) {
        let exists = await db("sfa.yea")
          .where({ yukon_id: line.yukon_id, course: line.course, yea_amount: line.yea_amount })
          .select("id")
          .first();

        if (!exists) {
          await db("sfa.yea").insert(line);
          insertedCount++;
        }
      }

      return res.send(
        `Import Completed Successfully: File contained ${parsed.lines.length} lines and ${insertedCount} were new`
      );
    }
  }

  res.status(400).json({ error: "File not found" });
});

function parseFile(file: UploadedFile) {
  let string = file.data.toString();
  let lines = string.replace(/\n+$/, "").split(/\r?\n/);
  let output = new Array<any>();

  if (lines.length == 0) return { error: "File has no lines" };

  for (let i = 0; i < lines.length; i++) {
    try {
      let line = lines[i];
      let first_name = line.substring(0, 30).trim(); //30
      let last_name = line.substring(30, 60).trim(); // 30
      let birth_date = line.substring(60, 71).trim(); // 11
      let yukon_id = line.substring(71, 85).trim(); // 14
      let school_year = line.substring(85, 99).trim(); // 14
      let school_month = line.substring(99, 113).trim();
      let course = line.substring(113, 163).trim();
      let yea_amount = line.substring(163).trim();

      if (first_name.length == 0) return { error: `Invalid Format: First name on line ${i + 1} is empty` };
      if (last_name.length == 0) return { error: `Invalid Format: Last name on line ${i + 1} is empty` };
      if (yukon_id.length == 0) return { error: `Invalid Format: Yukon ID on line ${i + 1} is empty` };
      if (course.length == 0) return { error: `Invalid Format: Course on line ${i + 1} is empty` };
      if (yea_amount.length == 0) return { error: `Invalid Format: Amount on line ${i + 1} is empty` };
      if (isNaN(parseFloat(yea_amount)))
        return { error: `Invalid Format: Amount on line ${i + 1} is not a valid number` };

      output.push({
        first_name,
        last_name,
        birth_date,
        yukon_id,
        school_year,
        school_month,
        course,
        yea_amount: parseFloat(yea_amount),
      });
    } catch (err: any) {
      return { error: `Error on line ${i + 1}` };
    }
  }

  return { lines: output };
}
