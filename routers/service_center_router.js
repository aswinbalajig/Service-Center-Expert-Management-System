import express from "express";
import {
  create_issue,
  update_status,
  update_priority,
  get_my_issues,
} from "../controllers/service_center_controller.js";
import {
  ROLE_IDS,
  authorization,
} from "../middlewares/general_middlewares/authorization.middleware.js";
import { get_my_issues_validators } from "../middlewares/validators/service_center.validators.js";
import { validate } from "../middlewares/validators/validation.js";

const Router = express.Router();

Router.route("/create").post(
  authorization([ROLE_IDS.SERVICE_CENTER]),
  create_issue,
);
Router.route("/update_status").patch(
  authorization([ROLE_IDS.SERVICE_CENTER]),
  update_status,
);
Router.route("/update_priority").patch(
  authorization([ROLE_IDS.SERVICE_CENTER]),
  update_priority,
);

Router.route("/my").get(
  authorization([ROLE_IDS.SERVICE_CENTER]),
  get_my_issues_validators,
  validate,
  get_my_issues,
);
export default Router;
