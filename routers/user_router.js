import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import process from "process";
import {jwt_login,sign_up,get_user_profile} from "../controllers/auth_controller.js";
import {LoginValidator,userSchemaValidator,userProfileSchemaValidator,serviceCenterProfileSchemaValidator} from "../middlewares/validators/auth.validators.js";

import {validate} from "../middlewares/validators/validation.js";



const Router=express.Router();

Router.route("/me").get(get_user_profile);



export default Router;