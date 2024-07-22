import moment from "moment";
import { DB_CONFIG } from "../../config";
import knex from "knex";
import { countBy } from "lodash";

const db = knex(DB_CONFIG);
const schema = "sfa";

export class PortalStudentService {
  async getBySub(sub: string): Promise<any> {
    return (
      db("student_auth")
        .withSchema(schema)
        .where({ sub, "student_auth.is_active": true })
        //.where({ sub, "student_auth.is_active": true, "student.is_active": true }) too many students are inactive, not sure why
        .innerJoin("student", "student_auth.student_id", "student.id")
        .innerJoin("person", "student.person_id", "person.id")
        .select([
          "student.*",
          "language_id",
          "sex_id",
          "birth_city_id",
          "birth_province_id",
          "birth_country_id",
          "first_name",
          "last_name",
          "initials",
          "previous_last_name",
          db.raw("'******' +RIGHT(sin,3) as sin"),
          "citizenship_code",
          "birth_date",
          "telephone",
          "email",
        ])
        .first()
    );
  }

  async create(student: Person_Create, sub: string) {
    let sinMatch = await db("person")
      .withSchema(schema)
      .innerJoin("student", "student.person_id", "person.id")
      .where({ sin: student.sin });
    //let emailMatch = await db("person").withSchema(schema).where({ sin: student.email });

    if (sinMatch && sinMatch.length > 0) {
      return undefined;
    }

    let person = await db("person").withSchema(schema).insert(student).returning("*");

    console.log("* PERSON CREATED");

    if (person && person[0].id) {
      let studentCr = {
        person_id: person[0].id,
        checked_for_yukon_id: false,
        is_crown_ward: false,
        is_active: true,
      } as Student_Create;

      let newStudent = await db("student").withSchema(schema).insert(studentCr).returning("*");
      console.log("* STUDENT CREATED");

      if (newStudent && newStudent[0].id) {
        await db("student_auth").withSchema(schema).insert({ student_id: newStudent[0].id, sub });
        console.log("* PERSON LINKED TO AUTH AND STUDENT");
      }

      return newStudent[0];
    }

    return undefined;
  }

  async findStudentLink(
    sin: string,
    date_of_birth: Date,
    first_name: string,
    last_name: string,
    email_address: string,
    home_phone: string,
    home_postal: string,
    year_completed: string,
    sub: string
  ): Promise<boolean> {
    let sinMatch = (
      await db("person")
        .withSchema(schema)
        .innerJoin("student", "student.person_id", "person.id")
        .where({ sin })
        .select("student.id")
        .distinct()
    ).map((i) => i.id);

    let nameMatch = (
      await db("person")
        .withSchema(schema)
        .innerJoin("student", "student.person_id", "person.id")
        .whereRaw("LOWER(first_name) like ? AND LOWER(last_name) like ?", [
          first_name.toLowerCase().trim(),
          last_name.toLowerCase().trim(),
        ])
        .select("student.id")
        .distinct()
    ).map((i) => i.id);

    let dobMatch = (
      await db("person")
        .withSchema(schema)
        .innerJoin("student", "student.person_id", "person.id")
        .where({ birth_date: moment.utc(date_of_birth).format("YYYY-MM-DD") })
        .select("student.id")
        .distinct()
    ).map((i) => i.id);

    if (year_completed) {
      year_completed = year_completed.substring(0, 4);
    }

    let yearMatch = (
      await db("person")
        .withSchema(schema)
        .innerJoin("student", "student.person_id", "person.id")
        .where({ high_school_left_year: year_completed })
        .select("student.id")
        .distinct()
    ).map((i) => i.id);

    let phoneMatch = (
      await db("person")
        .withSchema(schema)
        .innerJoin("student", "student.person_id", "person.id")
        .whereRaw(
          "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telephone, '-', ''),'.',''),'(',''),')',''),'+',''), ' ','') like ?",
          [`%${home_phone}%`]
        )
        .select("student.id")
        .distinct()
    ).map((i) => i.id);

    let emailMatch = (
      await db("person")
        .withSchema(schema)
        .innerJoin("student", "student.person_id", "person.id")
        .whereRaw("REPLACE(LOWER(email),' ','') = ?", [`${email_address.toLowerCase().trim()}`])
        .select("student.id")
        .distinct()
    ).map((i) => i.id);

    let postalMatch = (
      await db("person_address")
        .withSchema(schema)
        .innerJoin("student", "student.person_id", "person_address.person_id")
        .whereRaw("REPLACE(LOWER(postal_code),' ','') = ?", [home_postal])
        .select("student.id")
        .distinct()
    ).map((i) => i.id);

    if (sinMatch.length == 0) {
      let fullList = [
        nameMatch,
        dobMatch,
        phoneMatch.length > 20 ? [] : phoneMatch,
        postalMatch,
        emailMatch,
        yearMatch,
      ];
      let flat = fullList.flatMap((e) => e);
      let counts = countBy(flat);
      let flatCount = Object.entries(counts).map(([key, val]) => ({ key, val }));
      flatCount = flatCount.filter((i) => i.val > 2);

      if (flatCount.length == 1) {
        await db("student_auth")
          .withSchema(schema)
          .insert({ student_id: parseInt(flatCount[0].key), sub });
        return true;
      }
    } else if (sinMatch.length == 1) {
      let sinStudentId = sinMatch[0];
      let nameMatchSin = nameMatch.indexOf(sinStudentId) >= 0;
      let dobMatchSin = dobMatch.indexOf(sinStudentId) >= 0;

      if (nameMatchSin || dobMatchSin) {
        await db("student_auth").withSchema(schema).insert({ student_id: sinStudentId, sub });

        return true;
      }
    }

    return false;
  }

  async update(sub: string, { person_id, telephone, email, address }: any): Promise<any> {
    if (address) {
      if (address.id) {
        let id = address.id;
        delete address.id;
        delete address.address_display;
        await db("person_address").withSchema(schema).where({ id }).update(address);
      } else {
        delete address.id;
        await db("person_address").withSchema(schema).insert(address);
      }
    }

    return db("person").withSchema(schema).where({ id: person_id }).update({ telephone, email });
  }

  async updateEmail({ person_id, email }: any): Promise<any> {
    return db("person").withSchema(schema).where({ id: person_id }).update({ email });
  }

  async getAddresses(person_id: number): Promise<any[]> {
    return db("person_address")
      .withSchema(schema)
      .where({ person_id, "person_address.is_active": true })
      .leftOuterJoin("city", "city.id", "person_address.city_id")
      .leftOuterJoin("province", "province.id", "person_address.province_id")
      .leftOuterJoin("country", "country.id", "person_address.country_id")
      .select([
        "person_address.*",
        "city.description as city_name",
        "province.description as province_name",
        "country.description as country_name",
      ]);
  }

  async saveFeedback(feedback: any): Promise<any> {
    return db("portal_feedback").withSchema(schema).insert(feedback);
  }
}

export interface Student_Create {
  person_id: number;
  checked_for_yukon_id: boolean;
  is_crown_ward: boolean;
}

export interface Person_Create {
  first_name: string;
  last_name: string;
  language_id: number;
  sex_id: number;
  sin: string;
  birth_date: Date;
  email: string;
}
