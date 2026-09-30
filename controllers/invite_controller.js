import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db_connection from "../config/db_config.js";
import process from "process";
import { get_user_profile, check_user_exists } from "../query_respositories/auth_controller.db.js";
import { createInvite, getInviteByToken } from "../query_respositories/invite.db.js";
import { ROLE_IDS } from "../middlewares/general_middlewares/authorization.middleware.js";
import { generateInviteToken } from "../utils/general_util_functions.js";
import { sendEmail } from "../utils/email_sender.js";

export async function sendInvite(req, res) {
  const user_id = req.user_id;
  const email_id = req.body.email_id;

  const profile_info = await get_user_profile(user_id);

  const role_id = profile_info.role_id; //role id of user who initiated the invite

  // SERVICE_CENTER owns a service center (profile_info.service_center_id);
  // ADMIN/EXPERT belong to one (profile_info.user_service_center_id).
  const service_center_id =
    role_id === ROLE_IDS.SERVICE_CENTER
      ? profile_info.service_center_id
      : profile_info.user_service_center_id;

  function roleAssign(role_id) {
    if (role_id === ROLE_IDS.EXPERT || !Object.values(ROLE_IDS).includes(role_id)) {
      return null;
    } else if (role_id === ROLE_IDS.SERVICE_CENTER) {
      return ROLE_IDS.ADMIN;
    } else if (role_id === ROLE_IDS.ADMIN) {
      return ROLE_IDS.EXPERT;
    }
    return null;
  }

  const assignableRoleId = roleAssign(role_id);
  if (!assignableRoleId) {
    return res
      .status(403)
      .json({ message: "You are not authorized to send invites" });
  }

  const existingUser = await check_user_exists(email_id);
  if (existingUser) {
    return res.status(409).json({ message: "USER_ALREADY_EXISTS" });
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
    role_id: assignableRoleId,
    service_center_id,
    invited_by_user_id: user_id,
    token,
    is_used: false,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // token expires in 24 hours
  };

  const invite_id = await createInvite(data);

  await sendEmail(
    email_id,
    "You are invited to join the service center management system",
    `<p>You have been invited to join the service center management system. Please click the link below to accept the invitation:</p>
<p><a href="${process.env.FRONTEND_URL}/accept-invite?token=${token}">Accept Invitation</a></p>
<p>This invitation will expire in 24 hours.</p>
    `,
  );

  res.status(200).json({ message: "Invite sent successfully" });
}

export async function validateInvite(req, res) {
  const { token } = req.query;

  let invitePayload;
  try {
    invitePayload = jwt.verify(token, process.env.JWT_INVITE_KEY);
  } catch (error) {
    return res.status(401).json({ message: "INVALID_OR_EXPIRED_INVITE" });
  }

  const inviteRecord = await getInviteByToken(token);

  if (
    !inviteRecord ||
    inviteRecord.is_used ||
    new Date(inviteRecord.expires_at) < new Date()
  ) {
    return res.status(410).json({ message: "INVITE_ALREADY_USED_OR_EXPIRED" });
  }

  return res.status(200).json({
    data: {
      email_id: invitePayload.email_id,
      role_id: invitePayload.assignableRoleId,
    },
  });
}
