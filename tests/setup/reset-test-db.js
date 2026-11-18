// Drops and recreates the test database from db/schema.sql + db/seed.sql.
// Usage: npm run db:test:reset
import fs from "node:fs";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true, quiet: true });
const { Client } = pkg;

const DB_NAME = process.env.DB_NAME;
if (!DB_NAME?.endsWith("_test")) {
  throw new Error(`Refusing to reset non-test database "${DB_NAME}"`);
}

const connection = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
};

// pg_dump output can contain psql meta-commands (\restrict ...) that the server doesn't understand
const readSql = (file) =>
  fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("\\"))
    .join("\n");

const admin = new Client({ ...connection, database: "postgres" });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB_NAME}"`);
await admin.end();

const db = new Client({ ...connection, database: DB_NAME });
await db.connect();
await db.query(readSql("db/schema.sql"));
await db.query(readSql("db/seed.sql"));
await db.end();

console.log(`Test database "${DB_NAME}" recreated`);
