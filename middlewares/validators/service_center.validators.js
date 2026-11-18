import { body, checkExact, query } from "express-validator";

const ISSUE_STATUSES = ["open", "in-progress", "resolved"];
const ISSUE_PRIORITIES = ["low", "medium", "high"];

export const get_my_issues_validators = checkExact([
  query("status").optional().isIn(ISSUE_STATUSES),
  query("priority").optional().isIn(ISSUE_PRIORITIES),
  query("issue_id").optional().isInt().toInt(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
]);

export const create_issue_validators = [
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("priority")
    .isIn(ISSUE_PRIORITIES)
    .withMessage(`Priority must be one of: ${ISSUE_PRIORITIES.join(", ")}`),
];

export const update_status_validators = [
  body("issue_id").isInt({ min: 1 }).withMessage("Valid issue_id is required").toInt(),
  body("status")
    .isIn(ISSUE_STATUSES)
    .withMessage(`Status must be one of: ${ISSUE_STATUSES.join(", ")}`),
];

export const update_priority_validators = [
  body("issue_id").isInt({ min: 1 }).withMessage("Valid issue_id is required").toInt(),
  body("priority")
    .isIn(ISSUE_PRIORITIES)
    .withMessage(`Priority must be one of: ${ISSUE_PRIORITIES.join(", ")}`),
];
