import { describe, it, expect, afterEach, vi } from "vitest";
import { error_handler } from "../../middlewares/general_middlewares/error_handler.js";
import logger from "../../logger/logger.js";

const original_env = process.env.NODE_ENV;

const fake_response = () => {
  const response = {};
  response.status = vi.fn(() => response);
  response.json = vi.fn(() => response);
  return response;
};

const run = (err, env) => {
  process.env.NODE_ENV = env;
  const response = fake_response();
  error_handler(err, {}, response, () => {});
  return { status: response.status.mock.calls[0][0], body: response.json.mock.calls[0][0] };
};

// keep the intentional errors below out of the test output
vi.spyOn(logger, "error").mockImplementation(() => {});

afterEach(() => {
  process.env.NODE_ENV = original_env;
});

describe("error_handler", () => {
  it("hides internal error details from clients in production", () => {
    const res = run(new Error('relation "security.users" does not exist'), "production");
    expect(res).toEqual({ status: 500, body: { error: "INTERNAL_SERVER_ERROR" } });
  });

  it("shows internal error details in development", () => {
    const res = run(new Error("Redis profile cache read failed"), "development");
    expect(res).toEqual({ status: 500, body: { error: "Redis profile cache read failed" } });
  });

  it("keeps intentional client error messages in production", () => {
    const err = Object.assign(new Error("USER_ALREADY_EXISTS"), { statusCode: 409 });
    expect(run(err, "production")).toEqual({ status: 409, body: { error: "USER_ALREADY_EXISTS" } });
  });

  it("always logs the full error", () => {
    const err = new Error("db exploded");
    run(err, "production");
    expect(logger.error).toHaveBeenCalledWith(err.stack);
  });
});
