import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import process from "process";
import {jwt_login,service_center_sign_up,get_user_profile,accept_invite} from "../controllers/auth_controller.js";
import {LoginValidator,userSchemaValidator,userProfileSchemaValidator,serviceCenterProfileSchemaValidator,acceptInviteValidator} from "../middlewares/validators/auth.validators.js";

import {validate} from "../middlewares/validators/validation.js";
//import {"check_user_exists","check_password"} from "./service.js";

const Router=express.Router();

/*
Router.use((request,response,next)=>{
    if( request.method=='POST' &&  (!request.body['username'] || !request.body['password']))
    {
        response.status(402).json({message:'no username or password'});
    }
    next();
})
*/

Router.route("/login")
  .post(LoginValidator, validate, jwt_login);




Router.route("/service_center_signup")
  .post(userSchemaValidator, serviceCenterProfileSchemaValidator, validate, service_center_sign_up);



Router.route("/accept-invite")
  .post(acceptInviteValidator, validate, accept_invite);


Router.route('/me')
  .get(get_user_profile);

export default Router;