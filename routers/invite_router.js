/*
Can Create an entry in the db table for the invite.
Can send invites to users.
Can check for token validity and expiry.



*/


import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import process from "process";
import {sendInviteValidator,inviteTokenValidator} from "../middlewares/validators/invite.validators.js";
import {validate} from "../middlewares/validators/validation.js";
import {
  ROLE_IDS,
  authorization,
} from "../middlewares/general_middlewares/authorization.middleware.js";
import { jwt_verify } from "../middlewares/general_middlewares/auth.middlewares.js";
import { sendInvite, validateInvite } from "../controllers/invite_controller.js";




const Router=express.Router();

Router.route("/send").post(
  jwt_verify,
  authorization([ROLE_IDS.SERVICE_CENTER,ROLE_IDS.ADMIN]),
  sendInviteValidator,validate,
    sendInvite
);




Router.route('/validate').get(
  inviteTokenValidator,validate,
  validateInvite
);

export default Router;

