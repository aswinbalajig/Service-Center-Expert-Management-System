import express from "express";
import { create_issue} from "../controllers/issue_controller.js";
const Router=express.Router();

Router.route('/').post(create_issue);
Router.route('/update_status').patch(update_issue_status);
Router.route('/update_priority').patch(update_issue_priority);


export default Router;