import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import jwt from "jsonwebtoken";

vi.mock("../../utils/email_sender.js", () => ({ sendEmail: vi.fn() }));

import { resetDb, closeDb, query } from "../helpers/db.js";
import { flushRedis, closeRedis } from "../helpers/redis.js";
import {
  api,
  auth,
  createServiceCenter,
  inviteAndAccept,
} from "../helpers/factories.js";

const serviceCenterOf = async (token) => {
  const { user_id } = jwt.decode(token);
  const [row] = await query(
    "SELECT service_center_id FROM security.service_center_profile WHERE user_id = $1",
    [user_id],
  );
  return { user_id, service_center_id: row.service_center_id };
};

// inserts directly so listing tests don't depend on POST /issue/create
const seedIssue = async ({ service_center_id, user_id }, overrides = {}) => {
  const issue = {
    description: "Seeded issue",
    priority: "low",
    status: "open",
    ...overrides,
  };
  const [row] = await query(
    `INSERT INTO main.issues (service_center_id, created_by, description, priority, status, created_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING issue_id`,
    [
      service_center_id,
      user_id,
      issue.description,
      issue.priority,
      issue.status,
    ],
  );
  return row.issue_id;
};

const getIssue = async (issue_id) =>
  (await query("SELECT * FROM main.issues WHERE issue_id = $1", [issue_id]))[0];

let sc;
let owner;

beforeEach(async () => {
  await resetDb();
  await flushRedis();
  sc = await createServiceCenter();
  owner = await serviceCenterOf(sc.token);
});

afterAll(async () => {
  await closeDb();
  await closeRedis();
});

describe("access control", () => {
  const routes = [
    ["post", "/issue/create"],
    ["patch", "/issue/update_status"],
    ["patch", "/issue/update_priority"],
    ["get", "/issue/my"],
  ];

  it.each(routes)("%s %s returns 401 without a token", async (method, url) => {
    const res = await api()[method](url);
    expect(res.status).toBe(401);
  });

  it.each(routes)("%s %s returns 403 for an ADMIN", async (method, url) => {
    const admin = await inviteAndAccept(sc.token);
    const res = await api()[method](url).set(auth(admin.token));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("ACCESS_DENIED");
  });
});

describe("POST /issue/create", () => {
  it("creates an open issue owned by the caller's service center", async () => {
    const res = await api()
      .post("/issue/create")
      .set(auth(sc.token))
      .send({ description: "Engine noise", priority: "high" });

    expect(res.status).toBeLessThan(300);
    const issues = await query("SELECT * FROM main.issues");
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      description: "Engine noise",
      priority: "high",
      status: "open",
      service_center_id: owner.service_center_id,
      created_by: owner.user_id,
    });
  });

  it("makes a new issue findable with the status=open filter", async () => {
    await api()
      .post("/issue/create")
      .set(auth(sc.token))
      .send({ description: "Engine noise", priority: "high" });

    const res = await api().get("/issue/my").query({ status: "open" }).set(auth(sc.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].description).toBe("Engine noise");
  });

  it.each([
    ["missing description", { description: "", priority: "high" }, "description"],
    ["invalid priority", { description: "Engine noise", priority: "urgent" }, "priority"],
  ])("returns 400 for %s and creates nothing", async (_label, body, field) => {
    const res = await api().post("/issue/create").set(auth(sc.token)).send(body);

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty(field);
    expect(await query("SELECT 1 FROM main.issues")).toHaveLength(0);
  });
});

describe("PATCH /issue/update_status and /issue/update_priority", () => {
  it("updates the status of an issue", async () => {
    const issue_id = await seedIssue(owner);

    const res = await api()
      .patch("/issue/update_status")
      .set(auth(sc.token))
      .send({ issue_id, status: "resolved" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ issue_id });
    expect((await getIssue(issue_id)).status).toBe("resolved");
  });

  it("updates the priority of an issue", async () => {
    const issue_id = await seedIssue(owner);

    const res = await api()
      .patch("/issue/update_priority")
      .set(auth(sc.token))
      .send({ issue_id, priority: "high" });

    expect(res.status).toBe(200);
    expect((await getIssue(issue_id)).priority).toBe("high");
  });

  it("does not let a service center change another service center's issue", async () => {
    const issue_id = await seedIssue(owner, {
      status: "open",
      priority: "low",
    });
    const intruder = await createServiceCenter();

    const statusRes = await api()
      .patch("/issue/update_status")
      .set(auth(intruder.token))
      .send({ issue_id, status: "resolved" });
    const priorityRes = await api()
      .patch("/issue/update_priority")
      .set(auth(intruder.token))
      .send({ issue_id, priority: "high" });

    expect(statusRes.status).toBeGreaterThanOrEqual(400);
    expect(priorityRes.status).toBeGreaterThanOrEqual(400);
    expect(await getIssue(issue_id)).toMatchObject({
      status: "open",
      priority: "low",
    });
  });

  it("rejects an invalid status value", async () => {
    const issue_id = await seedIssue(owner);

    const res = await api()
      .patch("/issue/update_status")
      .set(auth(sc.token))
      .send({ issue_id, status: "banana" });

    expect(res.status).toBe(400);
    expect((await getIssue(issue_id)).status).toBe("open");
  });

  it("rejects an invalid priority value", async () => {
    const issue_id = await seedIssue(owner);

    const res = await api()
      .patch("/issue/update_priority")
      .set(auth(sc.token))
      .send({ issue_id, priority: "urgent" });

    expect(res.status).toBe(400);
    expect((await getIssue(issue_id)).priority).toBe("low");
  });

  it("rejects a missing or non-numeric issue_id", async () => {
    const res = await api()
      .patch("/issue/update_status")
      .set(auth(sc.token))
      .send({ issue_id: "abc", status: "resolved" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("issue_id");
  });
});

describe("GET /issue/my", () => {
  it("lists only the caller's issues, newest first", async () => {
    const other = await serviceCenterOf((await createServiceCenter()).token);
    const first = await seedIssue(owner);
    const second = await seedIssue(owner);
    await seedIssue(other);

    const res = await api().get("/issue/my").set(auth(sc.token));

    expect(res.status).toBe(200);
    expect(res.body.data.map((i) => i.issue_id)).toEqual([second, first]);
    expect(res.body.meta.total).toBe(2);
  });

  it("returns an empty list when there are no issues", async () => {
    const res = await api().get("/issue/my").set(auth(sc.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it("filters by status, priority and issue_id", async () => {
    const target = await seedIssue(owner, {
      status: "resolved",
      priority: "high",
    });
    await seedIssue(owner, { status: "open", priority: "high" });
    await seedIssue(owner, { status: "resolved", priority: "low" });

    const byStatus = await api()
      .get("/issue/my")
      .query({ status: "resolved" })
      .set(auth(sc.token));
    const byBoth = await api()
      .get("/issue/my")
      .query({ status: "resolved", priority: "high" })
      .set(auth(sc.token));
    const byId = await api()
      .get("/issue/my")
      .query({ issue_id: target })
      .set(auth(sc.token));

    expect(byStatus.body.data).toHaveLength(2);
    expect(byBoth.body.data.map((i) => i.issue_id)).toEqual([target]);
    expect(byId.body.data.map((i) => i.issue_id)).toEqual([target]);
  });

  it("paginates with page and limit", async () => {
    for (let i = 0; i < 3; i++) await seedIssue(owner);

    const page1 = await api()
      .get("/issue/my")
      .query({ page: 1, limit: 2 })
      .set(auth(sc.token));
    const page2 = await api()
      .get("/issue/my")
      .query({ page: 2, limit: 2 })
      .set(auth(sc.token));

    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page2.body.data).toHaveLength(1);
    expect(page1.body.meta.total).toBe(3);
  });

  it.each([
    ["unknown query parameter", { foo: "bar" }],
    ["invalid status", { status: "banana" }],
    ["invalid page", { page: 0 }],
    ["limit above max", { limit: 101 }],
    ["zero limit", { limit: 0 }],
  ])("returns 400 for %s", async (_label, params) => {
    const res = await api().get("/issue/my").query(params).set(auth(sc.token));
    expect(res.status).toBe(400);
  });
});
