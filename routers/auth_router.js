import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import process from "process"
import { access } from "fs";
import {jwt_login,jwt_verify} from auth_controller.js
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

Router.route('/jwt-login').get(jwt_login);

Router.route('/jwt-verify').get(jwt_verify);

export default Router;