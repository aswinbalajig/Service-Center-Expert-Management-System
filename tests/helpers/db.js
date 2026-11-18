import db_connection from "../../config/db_config.js";

const TABLES = [
  "main.status_history",
  "main.work_orders",
  "main.experts",
  "main.expert_types",
  "main.issues",
  "main.invites",
  "security.invites",
  "security.user_profile",
  "security.service_center_profile",
  "security.users",
];

export async function resetDb() {
  await db_connection.query(
    `TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function query(sql, params = []) {
  const result = await db_connection.query(sql, params);
  return result.rows;
}

export async function closeDb() {
  await db_connection.end();
}
