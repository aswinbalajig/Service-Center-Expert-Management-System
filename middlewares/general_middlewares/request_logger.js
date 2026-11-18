import morgan from "morgan";

const redact_url = (url) => url.replace(/([?&]token=)[^&]*/g, "$1[REDACTED]");

morgan.token("safe-url", (request) => redact_url(request.originalUrl || request.url));

// production masks invite tokens in logged URLs; development shows full URLs; tests skip request logs
const request_logger =
  process.env.NODE_ENV === "production"
    ? morgan(":remote-addr :method :safe-url :status :res[content-length] - :response-time ms")
    : morgan("dev", { skip: () => process.env.NODE_ENV === "test" });

export { request_logger, redact_url };
