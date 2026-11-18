import { describe, it, expect } from "vitest";
import { redact_url } from "../../middlewares/general_middlewares/request_logger.js";

describe("redact_url", () => {
  it("masks a token as the first query param", () => {
    expect(redact_url("/invite/validate?token=eyJhbGciOi.abc.def")).toBe(
      "/invite/validate?token=[REDACTED]",
    );
  });

  it("masks a token among other params and keeps the rest", () => {
    expect(redact_url("/x?ref=mail&token=eyJ.abc.def&page=2")).toBe(
      "/x?ref=mail&token=[REDACTED]&page=2",
    );
  });

  it("leaves urls without a token unchanged", () => {
    expect(redact_url("/issue/my?page=1&limit=2")).toBe("/issue/my?page=1&limit=2");
  });

  it("does not touch params that merely end in 'token'", () => {
    expect(redact_url("/x?csrftoken=abc")).toBe("/x?csrftoken=abc");
  });
});
