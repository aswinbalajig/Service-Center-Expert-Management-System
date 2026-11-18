import { describe, it, expect } from "vitest";
import logger from "../../logger/logger.js";

describe("logger", () => {
  it("is always defined, even outside development/production", () => {
    expect(logger).not.toBeNull();
    expect(logger.info).toEqual(expect.any(Function));
    expect(logger.error).toEqual(expect.any(Function));
  });

  it("only prints errors under the test environment", () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(logger.level).toBe("error");
    expect(logger.isDebugEnabled()).toBe(false);
    expect(logger.isErrorEnabled()).toBe(true);
  });

  it("can be called without throwing", () => {
    expect(() => logger.info("info from test")).not.toThrow();
    expect(() => logger.debug("debug from test")).not.toThrow();
  });
});
