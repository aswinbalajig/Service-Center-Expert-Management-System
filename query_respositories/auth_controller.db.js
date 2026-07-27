import db_obj from "../utils/db_query_class.js";
import redisClient from "../utils/redis.js";

const PROFILE_CACHE_TTL_SECONDS = 600;

const build_profile_cache_payload = (profile) => ({
  user_id: profile?.user_id != null ? String(profile.user_id) : "",
  email_id: profile?.email_id ?? "",
  role_id: profile?.role_id != null ? String(profile.role_id) : "",
  profile_id: profile?.profile_id != null ? String(profile.profile_id) : "",
  first_name: profile?.first_name ?? "",
  last_name: profile?.last_name ?? "",
  phone_number: profile?.phone_number ?? "",
  date_of_joining: profile?.date_of_joining ?? "",
  user_service_center_id:
    profile?.user_service_center_id != null
      ? String(profile.user_service_center_id)
      : "",
  service_center_id:
    profile?.service_center_id != null ? String(profile.service_center_id) : "",
  service_center_name: profile?.service_center_name ?? "",
  service_center_address: profile?.service_center_address ?? "",
  profile_type: profile?.profile_type ?? "",
});

const parse_cached_profile = (cachedProfile) => ({
  ...cachedProfile,
  user_id: cachedProfile?.user_id ? Number(cachedProfile.user_id) : null,
  role_id: cachedProfile?.role_id ? Number(cachedProfile.role_id) : null,
  profile_id: cachedProfile?.profile_id
    ? Number(cachedProfile.profile_id)
    : null,
  user_service_center_id: cachedProfile?.user_service_center_id
    ? Number(cachedProfile.user_service_center_id)
    : null,
  service_center_id: cachedProfile?.service_center_id
    ? Number(cachedProfile.service_center_id)
    : null,
});

const invalidate_profile_cache = async function (user_id) {
  try {
    await redisClient.deleteKey(`profile:user:${user_id}`);
  } catch (error) {
    throw error;
  }
};

const check_user_exists = async function (email_id) {
  let result = await db_obj.prepare(
    `SELECT user_id, password, email_id 
     FROM security.users 
     WHERE email_id = :email_id`,
    { email_id },
  );
  return result.rows[0];
};

const create_user = async function (user_credentials, edit_id, delete_id) {
  let result = await db_obj.prepare(
    `SELECT security.manage_users(
        :edit_id,
        :delete_id,
        :role_id,
        :email_id,
        :password
     ) AS user_id;`,
    {
      edit_id,
      delete_id,
      role_id: user_credentials.role_id,
      email_id: user_credentials.email_id,
      password: user_credentials.password,
    },
  );

  return result.rows[0].user_id;
};

const profile_creation = async function (
  profile_credentials,
  user_id,
  edit_id,
  delete_id,
) {
  let result = await db_obj.prepare(
    `SELECT security.manage_user_profile(
      :edit_id,
      :delete_id,
      :user_id,
      :date_of_joining,
      :first_name,
      :last_name,
      :phone_number,
      :service_center_id
   ) AS profile_id;`,
    {
      edit_id,
      delete_id,
      user_id,
      date_of_joining: profile_credentials.date_of_joining,
      first_name: profile_credentials.first_name,
      last_name: profile_credentials.last_name,
      phone_number: profile_credentials.phone_number,
      service_center_id: profile_credentials.service_center_id,
    },
  );

  await invalidate_profile_cache(user_id);

  return result.rows[0].profile_id;
};

const service_center_creation = async function (
  service_center,
  edit_id,
  delete_id,
  user_id,
) {
  let result = await db_obj.prepare(
    `SELECT security.manage_service_center_profile(
        :edit_id,
        :delete_id,
        :service_center_name,
        :service_center_address,
        :user_id
     ) AS service_center_id;`,
    {
      edit_id,
      delete_id,
      service_center_name: service_center.service_center_name,
      service_center_address: service_center.service_center_address,
      user_id,
    },
  );

  await invalidate_profile_cache(user_id);

  return result.rows[0].service_center_id;
};

const get_user_profile = async function (user_id) {
  const cacheKey = `profile:user:${user_id}`;

  try {
    const cachedProfile = await redisClient.getHash(cacheKey);
    if (cachedProfile && Object.keys(cachedProfile).length > 0) {
      return parse_cached_profile(cachedProfile);
    }
  } catch (error) {
    throw create_app_error("Redis profile cache read failed", error);
  }

  let result = await db_obj.prepare(
    `SELECT 
    A.user_id,
    A.email_id,
    A.role_id,
    B.profile_id,
    B.first_name,
    B.last_name,
    B.phone_number,
    B.date_of_joining,
    B.service_center_id AS user_service_center_id,
    C.service_center_id,
    C.service_center_name,
    C.service_center_address,

    CASE 
        WHEN A.role_id = 3 THEN 'SERVICE_CENTER'
        ELSE 'INDIVIDUAL'
    END AS profile_type

FROM "security".users AS A 
LEFT JOIN "security".user_profile AS B 
    ON A.user_id = B.user_id 
LEFT JOIN "security".service_center_profile AS C 
    ON A.user_id = C.user_id

WHERE A.user_id = :user_id;`,
    {
      user_id,
    },
  );

  const profile = result.rows[0];

  if (profile) {
    try {
      await redisClient.setHash(
        cacheKey,
        build_profile_cache_payload(profile),
        PROFILE_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      throw create_app_error("Redis profile cache write failed", error);
    }
  }

  return profile;
};

const update_service_center_id = async function (user_id, service_center_id) {
  let result = await db_obj.prepare(
    `UPDATE security.user_profile 
     SET service_center_id = :service_center_id 
     WHERE user_id = :user_id`,
    {
      user_id,
      service_center_id,
    },
  );
  if (result.rowCount > 0) {
    await invalidate_profile_cache(user_id);
  }

  return result.rowCount > 0;
};

export {
  check_user_exists,
  create_user,
  profile_creation,
  get_user_profile,
  service_center_creation,
};
