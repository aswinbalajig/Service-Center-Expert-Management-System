import {
  check_user_exists,
  create_user,
  profile_creation,
  service_center_creation
} from "../query_respositories/auth_controller.db.js";
import { getInviteByToken, markInviteUsed } from "../query_respositories/invite.db.js";
import db_obj from "../utils/db_query_class.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import process from "process";
import { ROLE_IDS } from "../middlewares/general_middlewares/authorization.middleware.js";
const login_check = async function (email_id, password) {
  const user = await check_user_exists(email_id);

  if (!user) return false;

  const match = await bcrypt.compare(password, user.password);

  if (match) return user.user_id;

  return false;
};

const user_creation = async function (user_credentials, profile_credentials) {
  return db_obj.withTransaction(async () => {
    if (await check_user_exists(user_credentials.email_id)) {
      throw new Error("USER_ALREADY_EXISTS");
    }

    const user_id = await create_user(user_credentials, 0, 0);

    if (!user_id) {
      throw new Error("USER_CREATION_FAILED");
    }
    let profile_id;
    if (user_credentials.role_id !== ROLE_IDS.SERVICE_CENTER) {
      profile_id = await profile_creation(
        profile_credentials,
        user_id,
        0,
        0,
      );
    } else {
      profile_id = await service_center_creation(
        profile_credentials,0,0,user_id
      );
    }
    if (!profile_id) {
      throw new Error("PROFILE_CREATION_FAILED");
    }

    return user_id;
  });
};

const service_center_sign_up = async function (request, response) {
  const { userCredentials, profileCredentials } = request.body;
  // public signup is only for service centers; admins/experts join via invite
  userCredentials.role_id = ROLE_IDS.SERVICE_CENTER;
  userCredentials.password = await bcrypt.hash(userCredentials.password, 10);


  try {
    const user_id = await user_creation(userCredentials, profileCredentials);
    //console.log("User created with ID:", user_id);
    //return;

    return response.status(201).json({
      message: "USER_CREATED",
    });
  } catch (error) {
    if (error.message === "USER_ALREADY_EXISTS" ||
        error.message.includes("EMAIL_ALREADY_EXISTS")) {
      return response.status(409).json({
        message: "USER_ALREADY_EXISTS",
      });
    }
    else if (error.message === "USER_CREATION_FAILED"||error.message === "PROFILE_CREATION_FAILED" ) {
    
      return response.status(500).json({
        message: error.message,
      });
    }

    //console.error(error);

    return response.status(500).json({
      message: "INTERNAL_SERVER_ERROR",
    });
  }
};

const accept_invite = async function (request, response) {
  const { token, password, first_name, last_name, phone_number, date_of_joining } = request.body;

  let invitePayload;
  try {
    invitePayload = jwt.verify(token, process.env.JWT_INVITE_KEY);
  } catch (error) {
    return response.status(401).json({ message: "INVALID_OR_EXPIRED_INVITE" });
  }

  const inviteRecord = await getInviteByToken(token);

  if (!inviteRecord || inviteRecord.is_used || new Date(inviteRecord.expires_at) < new Date()) {
    return response.status(410).json({ message: "INVITE_ALREADY_USED_OR_EXPIRED" });
  }

  const hashed_password = await bcrypt.hash(password, 10);
  const user_credentials = {
    email_id: inviteRecord.invitee_email,
    password: hashed_password,
    role_id: inviteRecord.role_id,
  };
  const profile_credentials = {
    first_name, last_name, phone_number, date_of_joining,
    service_center_id: inviteRecord.service_center_id,
  };

  try {
    await db_obj.withTransaction(async () => {
      const claimed = await markInviteUsed(inviteRecord.invite_id);   
      if (!claimed) {
        throw new Error("INVITE_ALREADY_USED");
      }
      await user_creation(user_credentials, profile_credentials);
    });

    return response.status(201).json({ message: "USER_CREATED" });

  } catch (error) {
    
    if (error.message === "INVITE_ALREADY_USED") {
      return response.status(410).json({ message: "INVITE_ALREADY_USED_OR_EXPIRED" });
    }
    if (error.message === "USER_ALREADY_EXISTS" ||
        error.message.includes("EMAIL_ALREADY_EXISTS")) {
      return response.status(409).json({ message: "USER_ALREADY_EXISTS" });
    }
    console.error(error);
    return response.status(500).json({ message: "INTERNAL_SERVER_ERROR" });
  }
};

const jwt_login = async function (request, response) {
  const { email_id, password } = request.body;

  const user_id = await login_check(email_id, password);

  if (!user_id) {
    return response.status(401).json({
      message: "INVALID_CREDENTIALS",
    });
  }

  const accessToken = jwt.sign({ user_id }, process.env.JWT_SIGN_KEY, {
    expiresIn: process.env.JWT_SIGN_KEY_EXPIRY,
  });

  const refreshToken = jwt.sign({ user_id }, process.env.JWT_REFRESH_KEY, {
    expiresIn: process.env.JWT_REFRESH_KEY_EXPIRY,
  });

  response.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return response.status(200).json({
    data: {
      accessToken,
    },
  });
};


const get_user_profile = async function (request, response) {
  
  console.log

  return response.status(200).json({profile_data:request.profile_info});

}


export { jwt_login, service_center_sign_up, get_user_profile, accept_invite };
