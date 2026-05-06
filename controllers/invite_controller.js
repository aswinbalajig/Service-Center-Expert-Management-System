import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db_connection from "../config/db_config.js";
import process from "process";
import get_user_profile from "../query_respositories/auth_controller.db.js";
import { ROLE_IDS } from "../middlewares/general_middlewares/authorization.middleware.js";
import { generateInviteToken } from "../utils/general_util_functions.js";


export async function sendInvite(req,res){
    
    //TODOS:
    //generate a token and send an email to the user with the token.
    //need to create a email service for this.
    /*
    what we receive :
         auth token , email id
`   
    what we need :
     role id , user id 

    get user id from the auth token.
    */

    const user_id = req.user_id;
    const email_id = req.body.email_id;

    const profile_info = await get_user_profile(user_id);

    const service_center_id = profile_info.service_center_id;
    const role_id = profile_info.role_id;

    const token= generateInviteToken({email_id,service_center_id,role_id});

    

    // add entry in db



}   