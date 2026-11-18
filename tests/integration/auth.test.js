import { describe, it, expect, beforeEach, afterAll } from "vitest";
import jwt from "jsonwebtoken";
import { resetDb, closeDb, query } from "../helpers/db.js";
import { flushRedis, closeRedis, redisClient } from "../helpers/redis.js";
import {
  api,
  auth,
  login,
  PASSWORD,
  signupPayload,
  signupServiceCenter,
} from "../helpers/factories.js";
import { ROLE_IDS } from "../../middlewares/general_middlewares/authorization.middleware.js";

beforeEach(async () => {
  await resetDb();
  await flushRedis();
});

afterAll(async () => {
  await closeDb();
  await closeRedis();
});

describe("POST /auth/service_center_signup", () => {
  it("creates a service center user and its profile", async () => {
    const { res, email } = await signupServiceCenter();

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: "USER_CREATED" });

    const [user] = await query(
      "SELECT user_id, role_id, password FROM security.users WHERE email_id = $1",
      [email],
    );
    expect(user.role_id).toBe(ROLE_IDS.SERVICE_CENTER);
    expect(user.password).not.toBe(PASSWORD); // stored hashed

    const profiles = await query(
      "SELECT service_center_name FROM security.service_center_profile WHERE user_id = $1",
      [user.user_id],
    );
    expect(profiles).toHaveLength(1);
    expect(profiles[0].service_center_name).toBe("Test Service Center");
  });

  it("ignores a client-supplied role_id (cannot sign up as ADMIN)", async () => {
    const { res, email } = await signupServiceCenter({
      userCredentials: { role_id: ROLE_IDS.ADMIN },
    });

    expect(res.status).toBe(201);
    const [user] = await query(
      "SELECT role_id FROM security.users WHERE email_id = $1",
      [email],
    );
    expect(user.role_id).toBe(ROLE_IDS.SERVICE_CENTER);
  });

  it("normalises the email to lowercase", async () => {
    const { res } = await signupServiceCenter({
      userCredentials: { email_id: "  MixedCase@Test.com " },
    });

    expect(res.status).toBe(201);
    const users = await query(
      "SELECT 1 FROM security.users WHERE email_id = 'mixedcase@test.com'",
    );
    expect(users).toHaveLength(1);
  });

  it("returns 409 for a duplicate email and creates no extra rows", async () => {
    const { email } = await signupServiceCenter();
    const { res } = await signupServiceCenter({
      userCredentials: { email_id: email },
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("USER_ALREADY_EXISTS");
    const [{ count }] = await query(
      "SELECT count(*)::int AS count FROM security.service_center_profile",
    );
    expect(count).toBe(1);
  });

  it.each([
    ["invalid email", { userCredentials: { email_id: "not-an-email" } }, "userCredentials.email_id"],
    ["short password", { userCredentials: { password: "123" } }, "userCredentials.password"],
    ["missing service center name", { profileCredentials: { service_center_name: "" } }, "profileCredentials.service_center_name"],
    ["short address", { profileCredentials: { service_center_address: "abc" } }, "profileCredentials.service_center_address"],
  ])("returns 400 for %s", async (_label, overrides, field) => {
    const res = await api()
      .post("/auth/service_center_signup")
      .send(signupPayload(overrides));

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty([field]);
    const [{ count }] = await query("SELECT count(*)::int AS count FROM security.users");
    expect(count).toBe(0);
  });
});

describe("POST /auth/login", () => {
  it("returns an access token and sets an httpOnly refresh cookie", async () => {
    const { email } = await signupServiceCenter();

    const res = await api().post("/auth/login").send({ email_id: email, password: PASSWORD });

    expect(res.status).toBe(200);
    const { accessToken } = res.body.data;
    const payload = jwt.verify(accessToken, process.env.JWT_SIGN_KEY);
    expect(payload.user_id).toEqual(expect.any(Number));

    const cookie = res.headers["set-cookie"]?.find((c) => c.startsWith("refreshToken="));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it("accepts the email in any case", async () => {
    const { email } = await signupServiceCenter();
    expect(await login(email.toUpperCase())).toEqual(expect.any(String));
  });

  it("returns 401 for a wrong password", async () => {
    const { email } = await signupServiceCenter();
    const res = await api().post("/auth/login").send({ email_id: email, password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 for an unknown email", async () => {
    const res = await api()
      .post("/auth/login")
      .send({ email_id: "nobody@test.com", password: PASSWORD });

    expect(res.status).toBe(401);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await api().post("/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("email_id");
    expect(res.body.errors).toHaveProperty("password");
  });
});

describe("GET /user/me", () => {
  it("returns 401 without a token", async () => {
    const res = await api().get("/user/me");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("TOKEN_MISSING");
  });

  it("returns 401 for a forged token", async () => {
    const forged = jwt.sign({ user_id: 1 }, "wrong-key");
    const res = await api().get("/user/me").set(auth(forged));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("INVALID_TOKEN");
  });

  it("returns 401 for a valid token of a user that no longer exists", async () => {
    const token = jwt.sign({ user_id: 999999 }, process.env.JWT_SIGN_KEY);
    const res = await api().get("/user/me").set(auth(token));
    expect(res.status).toBe(401);
  });

  it("returns the profile and caches it in redis", async () => {
    const { email } = await signupServiceCenter();
    const token = await login(email);
    const { user_id } = jwt.decode(token);

    const res = await api().get("/user/me").set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.profile_data).toMatchObject({
      user_id,
      email_id: email,
      role_id: ROLE_IDS.SERVICE_CENTER,
      service_center_name: "Test Service Center",
      profile_type: "SERVICE_CENTER",
    });

    const cached = await redisClient.getHash(`profile:user:${user_id}`);
    expect(cached).not.toBeNull();
    expect(cached.email_id).toBe(email);

    // second request is served from the cache and returns the same shape
    const again = await api().get("/user/me").set(auth(token));
    expect(again.status).toBe(200);
    expect(again.body.profile_data).toMatchObject({
      user_id,
      role_id: ROLE_IDS.SERVICE_CENTER,
      service_center_id: res.body.profile_data.service_center_id,
    });
  });
});
