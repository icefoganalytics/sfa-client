import * as dotenv from "dotenv";

export const NODE_ENV = process.env.NODE_ENV || "development";

let path;
switch (process.env.NODE_ENV) {
  case "test":
    path = `.env.test`;
    break;
  case "production":
    path = `.env.production`;
    break;
  default:
    path = `.env.development`;
}
dotenv.config({ path: path });

console.log(`LOADING ${NODE_ENV} CONFIG FROM ${path}`);

export const API_PORT = parseInt(process.env.API_PORT || "3000");
export const FRONTEND_URL = process.env.FRONTEND_URL || "";
export const AUTH_REDIRECT = process.env.AUTH_REDIRECT || process.env.FRONTEND_URL || "";

export const DB_NAME = process.env.DB_NAME || "";
export const DB_USER = process.env.DB_USER || "";
export const DB_PASS = process.env.DB_PASS || "";
export const DB_HOST = process.env.DB_HOST || "";
export const DB_PORT = process.env.DB_PORT || "";
export const DB_DEFAULT_SCHEMA = process.env.DB_DEFAULT_SCHEMA;

export const BASE_URL = process.env.BASE_URL || "";
export const CLIENT_ID = process.env.CLIENT_ID || "";
export const ISSUER_BASE_URL = process.env.ISSUER_BASE_URL || "";
export const CLIENT_SECRET = process.env.CLIENT_SECRET || "";

export const DB_CONFIG = {
  client: "mssql",
  connection: {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    port: parseInt(DB_PORT),
  },
  defaultSchema: DB_DEFAULT_SCHEMA || "dbo",
};

export const MAIL_FROM = process.env.MAIL_FROM || "sfa@yukon.ca";
export const MAIL_HOST = process.env.MAIL_HOST || "smtp.gov.yk.ca";
export const MAIL_PORT = process.env.MAIL_PORT || 25;
export const SUSPEND_EMAIL = process.env.SUSPEND_EMAIL ? true : false;
export const APPLICATION_NAME = process.env.APPLICATION_NAME || "";

export const MAIL_CONFIG = {
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure: false, // true for 465, false for other ports
};

export const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "";
export const AWS_S3_ACCESS_KEY = process.env.AWS_S3_ACCESS_KEY || "";
export const AWS_S3_ACCESS_SECRET = process.env.AWS_S3_ACCESS_SECRET || "";
export const AWS_S3_ENDPOINT = process.env.AWS_S3_ENDPOINT || "";
export const AWS_S3_REGION = process.env.AWS_S3_REGION || "us-west";
export const AWS_S3_PATH = process.env.AWS_S3_PATH || "";

export const AWS_S3_CONFIG = {
  credentials: { accessKeyId: AWS_S3_ACCESS_KEY, secretAccessKey: AWS_S3_ACCESS_SECRET },
  endpoint: AWS_S3_ENDPOINT,
  forcePathStyle: true,
  region: AWS_S3_REGION,
};

export const SENTRY_DSN = process.env.SENTRY_DSN || "";
export const IMAGE_TAG = process.env.IMAGE_TAG || "";

export const PDF_CONVERSION_URL = process.env.PDF_CONVERSION_URL || "";

export const RELEASE_TAG = process.env.RELEASE_TAG || ""
export const AWS_LOGGING_ENABLED = process.env.AWS_LOGGING_ENABLED || "true"
export const AWS_LOGGING_GROUP = process.env.AWS_LOGGING_GROUP || "SFA-TEST"
export const AWS_LOGGING_STREAM = process.env.AWS_LOGGING_STREAM || "combined"
export const AWS_LOGGING_REGION = process.env.AWS_LOGGING_REGION || "ca-central-1"
export const AWS_LOGGING_ACCESS_ID = process.env.AWS_LOGGING_ACCESS_ID || "AKIA2W5NG32L4BEHBDVN"
export const AWS_LOGGING_ACCESS_KEY = process.env.AWS_LOGGING_ACCESS_KEY || "I/mxkv//XRfqxW9UNzxPDGWRySBloz5h7oWWYbqh"
export const DEFAULT_LOG_LEVEL = process.env.DEFAULT_LOG_LEVEL || "debug"