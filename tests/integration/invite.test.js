import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import jwt from "jsonwebtoken";

vi.mock("../../utils/email_sender.js", () => ({ sendEmail: vi.fn() }));

import { sendEmail } from "../../utils/email_sender.js";
import { resetDb, closeDb, query } from "../helpers/db.js";
import { flushRedis, closeRedis } from "../helpers/redis.js";
import {
  api,
  auth,
  login,
  uniqueEmail,
  createServiceCenter,
  signupServiceCenter,
  sendInvite,
  acceptPayload,
  inviteAndAccept,
} from "../helpers/factories.js";
import { ROLE_IDS } from "../../middlewares/general_middlewares/authorization.middleware.js";

const getInvite = async (email) =>
  (await query("SELECT * FROM security.invites WHERE invitee_email = $1", [email]))[0];

const serviceCenterIdOf = async (email) =>
  (
    await query(
      `SELECT sc.service_center_id FROM security.service_center_profile sc
       JOIN security.users u ON u.user_id = sc.user_id WHERE u.email_id = $1`,
      [email],
    )
  )[0].service_center_id;

beforeEach(async () => {
  await resetDb();
  await flushRedis();
  sendEmail.mockReset();
});

afterAll(async () => {
  await closeDb();
  await closeRedis();
});

describe("POST /invite/send", () => {
  it("lets a SERVICE_CENTER invite an ADMIN into its service center", async () => {
    const sc = await createServiceCenter();
    const invitee = uniqueEmail("admin");

    const { res, token } = await sendInvite(sc.token, invitee);

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toBe(invitee);
    expect(token).toBeDefined();

    const invite = await getInvite(invitee);
    expect(invite).toMatchObject({
      role_id: ROLE_IDS.ADMIN,
      service_center_id: await serviceCenterIdOf(sc.email),
      is_used: false,
      token,
    });
    expect(new Date(invite.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("lets an ADMIN invite an EXPERT into the same service center", async () => {
    const sc = await createServiceCenter();
    const admin = await inviteAndAccept(sc.token);
    const invitee = uniqueEmail("expert");

    const { res } = await sendInvite(admin.token, invitee);

    expect(res.status).toBe(200);
    const invite = await getInvite(invitee);
    expect(invite.role_id).toBe(ROLE_IDS.EXPERT);
    expect(invite.service_center_id).toBe(await serviceCenterIdOf(sc.email));
  });

  it("forbids an EXPERT from sending invites", async () => {
    const sc = await createServiceCenter();
    const admin = await inviteAndAccept(sc.token);
    const expert = await inviteAndAccept(admin.token);
    sendEmail.mockClear();

    const { res } = await sendInvite(expert.token, uniqueEmail());

    expect(res.status).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 401 without a token", async () => {
    const res = await api().post("/invite/send").send({ email_id: uniqueEmail() });
    expect(res.status).toBe(401);
  });

  it("returns 409 when the invitee already has an account", async () => {
    const sc = await createServiceCenter();
    const other = await createServiceCenter();

    const { res } = await sendInvite(sc.token, other.email);

    expect(res.status).toBe(409);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await getInvite(other.email)).toBeUndefined();
  });

  it("returns 400 for an invalid email", async () => {
    const sc = await createServiceCenter();
    const { res } = await sendInvite(sc.token, "not-an-email");
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("email_id");
  });
});

describe("GET /invite/validate", () => {
  it("returns the invite's email and role for a valid token", async () => {
    const sc = await createServiceCenter();
    const invitee = uniqueEmail("admin");
    const { token } = await sendInvite(sc.token, invitee);

    const res = await api().get("/invite/validate").query({ token });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ email_id: invitee, role_id: ROLE_IDS.ADMIN });
  });

  it("returns 400 for a token that is not a JWT", async () => {
    const res = await api().get("/invite/validate").query({ token: "garbage" });
    expect(res.status).toBe(400);
  });

  it("returns 401 for a JWT signed with the wrong key", async () => {
    const forged = jwt.sign({ email_id: "x@test.com", assignableRoleId: 1 }, "wrong-key");
    const res = await api().get("/invite/validate").query({ token: forged });
    expect(res.status).toBe(401);
  });

  it("returns 410 for a validly signed token with no invite record", async () => {
    const orphan = jwt.sign({ email_id: "x@test.com" }, process.env.JWT_INVITE_KEY);
    const res = await api().get("/invite/validate").query({ token: orphan });
    expect(res.status).toBe(410);
  });

  it("returns 410 once the invite has expired", async () => {
    const sc = await createServiceCenter();
    const invitee = uniqueEmail();
    const { token } = await sendInvite(sc.token, invitee);
    await query(
      "UPDATE security.invites SET expires_at = now() - interval '1 minute' WHERE invitee_email = $1",
      [invitee],
    );

    const res = await api().get("/invite/validate").query({ token });
    expect(res.status).toBe(410);
  });

  it("returns 410 once the invite has been used", async () => {
    const sc = await createServiceCenter();
    const invitee = uniqueEmail();
    const { token } = await sendInvite(sc.token, invitee);
    await api().post("/auth/accept-invite").send(acceptPayload(token));

    const res = await api().get("/invite/validate").query({ token });
    expect(res.status).toBe(410);
  });
});

describe("POST /auth/accept-invite", () => {
  it("creates the user with the invited role and service center, then they can log in", async () => {
    const sc = await createServiceCenter();
    const invitee = uniqueEmail("admin");
    const { token } = await sendInvite(sc.token, invitee);

    const res = await api().post("/auth/accept-invite").send(acceptPayload(token));

    expect(res.status).toBe(201);
    const [user] = await query(
      `SELECT u.role_id, p.first_name, p.service_center_id
       FROM security.users u JOIN security.user_profile p ON p.user_id = u.user_id
       WHERE u.email_id = $1`,
      [invitee],
    );
    expect(user).toEqual({
      role_id: ROLE_IDS.ADMIN,
      first_name: "Test",
      service_center_id: await serviceCenterIdOf(sc.email),
    });
    expect((await getInvite(invitee)).is_used).toBe(true);
    expect(await login(invitee)).toEqual(expect.any(String));
  });

  it("rejects a second use of the same invite", async () => {
    const sc = await createServiceCenter();
    const { token } = await sendInvite(sc.token, uniqueEmail());
    await api().post("/auth/accept-invite").send(acceptPayload(token));

    const res = await api().post("/auth/accept-invite").send(acceptPayload(token));

    expect(res.status).toBe(410);
  });

  it("creates exactly one user when the same invite is accepted concurrently", async () => {
    const sc = await createServiceCenter();
    const invitee = uniqueEmail();
    const { token } = await sendInvite(sc.token, invitee);

    const results = await Promise.all([
      api().post("/auth/accept-invite").send(acceptPayload(token)),
      api().post("/auth/accept-invite").send(acceptPayload(token)),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 410]);
    const users = await query("SELECT 1 FROM security.users WHERE email_id = $1", [invitee]);
    expect(users).toHaveLength(1);
  });

  it("rolls back the invite claim when the email was registered in the meantime", async () => {
    const sc = await createServiceCenter();
    const invitee = uniqueEmail();
    const { token } = await sendInvite(sc.token, invitee);
    await signupServiceCenter({ userCredentials: { email_id: invitee } });

    const res = await api().post("/auth/accept-invite").send(acceptPayload(token));

    expect(res.status).toBe(409);
    expect((await getInvite(invitee)).is_used).toBe(false);
  });

  it("returns 410 for an expired invite and creates no user", async () => {
    const sc = await createServiceCenter();
    const invitee = uniqueEmail();
    const { token } = await sendInvite(sc.token, invitee);
    await query(
      "UPDATE security.invites SET expires_at = now() - interval '1 minute' WHERE invitee_email = $1",
      [invitee],
    );

    const res = await api().post("/auth/accept-invite").send(acceptPayload(token));

    expect(res.status).toBe(410);
    expect(await query("SELECT 1 FROM security.users WHERE email_id = $1", [invitee])).toHaveLength(0);
  });

  it("returns 401 for a forged token", async () => {
    const forged = jwt.sign({ email_id: "x@test.com" }, "wrong-key");
    const res = await api().post("/auth/accept-invite").send(acceptPayload(forged));
    expect(res.status).toBe(401);
  });

  it.each([
    ["short password", { password: "123" }, "password"],
    ["missing first name", { first_name: "" }, "first_name"],
    ["invalid phone number", { phone_number: "12345" }, "phone_number"],
    ["invalid date of joining", { date_of_joining: "not-a-date" }, "date_of_joining"],
  ])("returns 400 for %s", async (_label, overrides, field) => {
    const sc = await createServiceCenter();
    const { token } = await sendInvite(sc.token, uniqueEmail());

    const res = await api().post("/auth/accept-invite").send(acceptPayload(token, overrides));

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty(field);
  });
});
