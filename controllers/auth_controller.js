
import { use } from "react";
import {check_user_exists,check_password} from "./service.js";
import jwt from "jsonwebtoken";

const login_check =  async function (email_id,password)
{
    let user=check_user_exists(email_id,password);
    
    if(!user)
    {
        return false;
    }
    if  (await bcrypt.compare(password, user.password))
    {
        return true;
    }
    return false;

};


const user_creation=async function(user_credentials)
{
    //step 1 check user already exists or not
    user_credentials.password=await bcrypt.hash(user_credentials.password,10);
    if (await check_user_exists(user_credentials.email_id,user_credentials.password))
    {
        throw new Error("USER_ALEADY_EXISTS");
    }

    //step 2 if not exists create user and return user data
    const user_id=await create_user(user_credentials);
    if(user_id)
    {
        const profile_id=await create_profile(profile_credentials,user_id);
        if(profile_id)
        {
            return user_id;
        }
    }
            // if so return error message user already exists.
}
const sign_up = async function(request,response)
{
    const {user_credentials,profile_credentials}=request.body;
    try{

        const user_data_response=await user_creation(user_credentials);
        
        if (user_data_response)
        {
            response.status(200).json({message:"USER_CREATED"});
        }
    }
    catch(error){
        if (error.message=="USER_ALEADY_EXISTS")
        {
            response.status(409).json({message:"USER_ALEADY_EXISTS"});
            return;
        }
        console.log(error);//change error catching method properly
    }
    
    
}

const jwt_login = async function(request,response)
{
    //response.status(200).send('request recieved');
    //call password decryption function to check password
    //password_decrypt(response.body.username,response.body.password)


    let {username,password}=request.body;
    if (! await login_check(username,password))
    {
        response.status(400).json({message:"Incorrect username or password"});
        return;
    }


    let accessToken=jwt.sign({id:username},process.env.JWT_SIGN_KEY,{expiresIn:'1m'});

    response.status(200).json({accessToken});
    //console.log(`AccessToken=${accessToken}`);
};

const jwt_verify = function(request,response)
{

    let accessToken=request.headers['authorization'].split(' ')[1];
    let user=jwt.verify(accessToken,process.env.JWT_SIGN_KEY);
    response.status(200).json({data:user});
    //console.log(user);

}


module.exports={login_check,jwt_login,jwt_verify};




