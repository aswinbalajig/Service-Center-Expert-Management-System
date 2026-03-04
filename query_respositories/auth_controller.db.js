import db_obj from "../utils/db_query_class.js";

const check_user_exists = async function (email_id) {

  let result = await db_obj.prepare(
    `SELECT user_id, password, email_id 
     FROM security.users 
     WHERE email_id = :email_id`,
    { email_id }
  );
  return result.rows[0];

};


const create_user = async function (user_credentials, edit_id, delete_id) {

  let result = await db_obj.prepare(
    `SELECT security.manage_users(
        :edit_id,
        :delete_id,
        :email_id,
        :password
     ) AS user_id;`,
    {
      edit_id,
      delete_id,
      email_id: user_credentials.email_id,
      password: user_credentials.password
    }
  );

  return result.rows[0].user_id;

};


const profile_creation = async function (profile_credentials, user_id, edit_id, delete_id) {

  let result = await db_obj.prepare(
    `SELECT security.manage_user_profile(
        :edit_id,
        :delete_id,
        :user_id,
        :date_of_joining,
        :phone_number,
        :role_id,
        :first_name,
        :last_name
     ) AS profile_id;`,
    {
      edit_id,
      delete_id,
      user_id,
      date_of_joining: profile_credentials.date_of_joining,
      phone_number: profile_credentials.phone_number,
      role_id: profile_credentials.role_id,
      first_name: profile_credentials.first_name,
      last_name: profile_credentials.last_name
    }
  );

  return result.rows[0].profile_id;

};


export {
  check_user_exists,
  create_user,
  profile_creation
};