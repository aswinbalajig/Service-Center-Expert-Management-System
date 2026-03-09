import { checkExact, query } from "express-validator";

export const get_my_issues_validators = checkExact([
  query("status").optional().isIn(["open", "in-progress", "resolved"]),
  query("priority").optional().isIn(["low", "medium", "high"]),
  query("issue_id").optional().isInt().toInt(),
  query("page").optional().isInt({ min: 1 }).toInt(),
]);
