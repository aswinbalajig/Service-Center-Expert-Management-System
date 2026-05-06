import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db_connection from "../config/db_config.js";
import process from "process";

export function generateInviteToken(payload){


    const token = jwt.sign(payload, process.env.JWT_INVITE_KEY, {
        expiresIn: process.env.JWT_INVITE_KEY_EXPIRY});

    return token;
    
}
