import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db_connection from "../config/db_config.js";
import process from "process";
import { get_user_profile } from "../query_respositories/auth_controller.db.js";
import { ROLE_IDS } from "../middlewares/general_middlewares/authorization.middleware.js";
import { generateInviteToken } from "../utils/general_util_functions.js";
import { sendEmail } from "../utils/email_sender.js";

export async function sendInvite(req, res) {
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
  const role_id = profile_info.role_id; //role id of user who initiated the invite

  function roleAssign(role_id) {
    if (role_id === ROLE_IDS.EXPERT || !(role_id in ROLE_IDS)) {
      return null;
    } else if (role_id === ROLE_IDS.SERVICE_CENTER) {
      return ROLE_IDS.ADMIN;
    } else if (role_id === ROLE_IDS.ADMIN) {
      return ROLE_IDS.EXPERT;
    }
  }

  const assignableRoleId = roleAssign(role_id);
  if (!assignableRole) {
    return res
      .status(403)
      .json({ message: "You are not authorized to send invites" });
  }

  try {
    
  } catch (error) {
    
  }
  const token = generateInviteToken({
    email_id,
    service_center_id,
    assignableRoleId,
  });

  const data = {
    edit_id: 0,
    delete_id: 0,
    invitee_email: email_id,
    role_id,
    service_center_id,
    invited_by_user_id: user_id,
    token,
    is_used: false,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // token expires in 24 hours
  };

  // add entry in db

  const invite_id = await createInvite(data);
  //send the url and token via email to the user.
  sendEmail(
    email_id,
    "You are invited to join the service center management system",
    `<p>You have been invited to join the service center management system. Please click the link below to accept the invitation:</p>
<p><a href="${process.env.FRONTEND_URL}/accept-invite?token=${token}">Accept Invitation</a></p>
<p>This invitation will expire in 24 hours.</p>
    `,
  );
  res.status(200).json({ message: "Invite sent successfully" });
}

export async function validateInvite(req, res) {}
