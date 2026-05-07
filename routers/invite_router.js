/*
Can Create an entry in the db table for the invite.
Can send invites to users.
Can check for token validity and expiry.



*/


import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import process from "process";
import {jwt_login,sign_up} from "../controllers/auth_controller.js";
import {sendInviteValidator} from "../middlewares/validators/invite.validators.js";
import {validate} from "../middlewares/validators/validation.js";
import {
  ROLE_IDS,
  authorization,
} from "../middlewares/general_middlewares/authorization.middleware.js";
import { sendInvite } from "../controllers/invite_controller.js";




const Router=express.Router();

Router.route("/send").post(
  authorization([ROLE_IDS.SERVICE_CENTER,ROLE_IDS.ADMIN]),
  sendInviteValidator,validate,
    sendInvite
);




Router.route('/validate').post(
authorization([ROLE_IDS.SERVICE_CENTER,ROLE_IDS.ADMIN]),
/* validateInviteToken */
);

export default Router;

