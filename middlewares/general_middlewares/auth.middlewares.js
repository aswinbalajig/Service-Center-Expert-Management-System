import jwt from "jsonwebtoken";

const jwt_verify = async function (request, response, next) {
  try {

    const authHeader = request.headers.authorization;

if (!authHeader)
    return response.status(401).json({ message: "TOKEN_MISSING" });

const accessToken = authHeader.split(" ")[1];

    const user = jwt.verify(accessToken, process.env.JWT_SIGN_KEY);

    request.user_id = user.user_id;
    const profile_info=await get_user_profile(user_id);
    request.profile_info=profile_info;

    next();

  } catch (err) {

    return response.status(401).json({
      message: "INVALID_TOKEN"
    });

  }
};


export{jwt_verify};


