 
 

import { body,query } from "express-validator";

export const sendInviteValidator=[
    body("email_id").notEmpty().withMessage("Please provide the invitee's email ID").isEmail().withMessage("Invalid invitee's email id"),
];

export const inviteTokenValidator=[
    query('token').notEmpty().withMessage("Token is required"),
    query('token').isJWT().withMessage("Invalid token format")  
];