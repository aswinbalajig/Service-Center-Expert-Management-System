import jwt from "jsonwebtoken";
import { get_user_profile } from "../../query_respositories/auth_controller.db.js";

const jwt_verify = async function (request, response, next) {
  try {

    const authHeader = request.headers.authorization;

if (!authHeader)
    return response.status(401).json({ message: "TOKEN_MISSING" });

const accessToken = authHeader.split(" ")[1];
    console.log("Access Token:", accessToken);

    const user = jwt.verify(accessToken, process.env.JWT_SIGN_KEY);

    request.user_id = user.user_id;
    const profile_info=await get_user_profile(user.user_id);
    console.log("Profile Info:", profile_info);
    request.profile_info=Object.fromEntries(Object.entries(profile_info).filter(([key, value]) => value !== null));

    next();

  } catch (err) {
    console.log(err.message);
    return response.status(401).json({
      message: "INVALID_TOKEN"
    });

  }
};


export{jwt_verify};


