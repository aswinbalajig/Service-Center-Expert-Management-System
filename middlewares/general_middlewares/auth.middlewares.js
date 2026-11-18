import jwt from "jsonwebtoken";
import { get_user_profile } from "../../query_respositories/auth_controller.db.js";

const jwt_verify = async function (request, response, next) {
  try {

    const authHeader = request.headers.authorization;

if (!authHeader)
    return response.status(401).json({ message: "TOKEN_MISSING" });

const accessToken = authHeader.split(" ")[1];

    const user = jwt.verify(accessToken, process.env.JWT_SIGN_KEY);

    request.user_id = user.user_id;
    const profile_info=await get_user_profile(user.user_id);


    if (!profile_info) {
    
      return response.status(401).json({
        message: "USER_NOT_FOUND"
      });
    
    }

    request.profile_info=Object.fromEntries(Object.entries(profile_info).filter(([key, value]) => value !== null));

    

    next();

  } catch (err) {
    if(err.name==="TokenExpiredError" || err.name==="JsonWebTokenError")
    {
      return response.status(401).json({
        message: "INVALID_TOKEN"
      });
    }

    next(err);

  }
};


export{jwt_verify};


