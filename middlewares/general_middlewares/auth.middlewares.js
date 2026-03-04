import jwt from "jsonwebtoken";
const jwt_verify = function(request,response,next)
{

    let accessToken=request.headers['authorization'].split(' ')[1];
    let user=jwt.verify(accessToken,process.env.JWT_SIGN_KEY);
    if(user)
    {
        request.user=user;
        next();
    }
    else
        response.status(401).json({message:"INVALID_TOKEN"});
}


export{jwt_verify};