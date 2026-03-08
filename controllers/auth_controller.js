import {
  check_user_exists,
  create_user,
  profile_creation
} from "../query_respositories/auth_controller.db.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db_connection from "../config/db_config.js";



const login_check = async function (email_id, password) {

  const user = await check_user_exists(email_id);

  if (!user) return false;

  const match = await bcrypt.compare(password, user.password);

  if (match) return user.user_id;

  return false;
};



const user_creation = async function (user_credentials, profile_credentials) {

  user_credentials.password = await bcrypt.hash(user_credentials.password, 10);

  if (await check_user_exists(user_credentials.email_id)) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  try {

    await db_connection.query("BEGIN");

    const user_id = await create_user(user_credentials, 0, 0);

    if (!user_id) {
      throw new Error("USER_CREATION_FAILED");
    }

    const profile_id = await profile_creation(
      profile_credentials,
      user_id,
      0,
      0
    );

    if (!profile_id) {
      throw new Error("PROFILE_CREATION_FAILED");
    }

    await db_connection.query("COMMIT");

    return user_id;

  } catch (error) {

    await db_connection.query("ROLLBACK");
    throw error;

  }
};



const sign_up = async function (request, response) {

  const { userCredentials, profileCredentials } = request.body;

  try {

    const user_id = await user_creation(userCredentials, profileCredentials);

    return response.status(201).json({
      message: "USER_CREATED"
    });

  } catch (error) {

    if (error.message === "USER_ALREADY_EXISTS") {
      return response.status(409).json({
        message: "USER_ALREADY_EXISTS"
      });
    }

    console.error(error);

    return response.status(500).json({
      message: "INTERNAL_SERVER_ERROR"
    });
  }
};



const jwt_login = async function (request, response) {

  const { email, password } = request.body;

  const user_id = await login_check(email, password);

  if (!user_id) {
    return response.status(401).json({
      message: "INVALID_CREDENTIALS"
    });
  }

  const accessToken = jwt.sign(
    { user_id },
    process.env.JWT_SIGN_KEY,
    { expiresIn: process.env.JWT_SIGN_KEY_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { user_id },
    process.env.JWT_REFRESH_KEY,
    { expiresIn: process.env.JWT_REFRESH_KEY_EXPIRY }
  );

  return response.status(200).json({
    data: {
      accessToken,
      refreshToken
    }
  });
};


export { jwt_login, sign_up };