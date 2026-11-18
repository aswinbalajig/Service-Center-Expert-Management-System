import request from "supertest";
import { app } from "../../index.js";
import { sendEmail } from "../../utils/email_sender.js";

export const api = () => request(app);

export const PASSWORD = "secret123";

let counter = 0;
export const uniqueEmail = (prefix = "user") =>
  `${prefix}${Date.now()}_${++counter}@test.com`;

export function signupPayload(overrides = {}) {
  return {
    userCredentials: {
      email_id: uniqueEmail("sc"),
      password: PASSWORD,
      ...overrides.userCredentials,
    },
    profileCredentials: {
      service_center_name: "Test Service Center",
      service_center_address: "12 Test Street, Chennai",
      ...overrides.profileCredentials,
    },
  };
}

export async function signupServiceCenter(overrides = {}) {
  const payload = signupPayload(overrides);
  const res = await api().post("/auth/service_center_signup").send(payload);
  return { res, email: payload.userCredentials.email_id };
}

export async function login(email_id, password = PASSWORD) {
  const res = await api().post("/auth/login").send({ email_id, password });
  return res.body?.data?.accessToken;
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export async function createServiceCenter() {
  const { res, email } = await signupServiceCenter();
  if (res.status !== 201) {
    throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { email, token: await login(email) };
}

// requires utils/email_sender.js to be mocked with vi.fn() in the calling test file
export function lastInviteToken() {
  const html = sendEmail.mock.calls.at(-1)?.[2] ?? "";
  return html.match(/token=([^"&]+)/)?.[1];
}

export async function sendInvite(inviterToken, email_id) {
  const res = await api()
    .post("/invite/send")
    .set(auth(inviterToken))
    .send({ email_id });
  return { res, token: lastInviteToken() };
}

export function acceptPayload(token, overrides = {}) {
  return {
    token,
    password: PASSWORD,
    first_name: "Test",
    last_name: "User",
    phone_number: "9876543210",
    date_of_joining: "2026-01-15",
    ...overrides,
  };
}

export async function inviteAndAccept(inviterToken, email_id = uniqueEmail("member")) {
  const { res, token } = await sendInvite(inviterToken, email_id);
  if (res.status !== 200) {
    throw new Error(`invite failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const accept = await api().post("/auth/accept-invite").send(acceptPayload(token));
  if (accept.status !== 201) {
    throw new Error(`accept failed: ${accept.status} ${JSON.stringify(accept.body)}`);
  }
  return { email: email_id, token: await login(email_id) };
}
