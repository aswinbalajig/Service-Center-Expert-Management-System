import logger from "../../logger/logger.js";

// full details always go to the log; clients only see internal error messages outside production
const error_handler = function (err, request, response, next) {
  logger.error(err.stack || err);

  const statusCode = err.statusCode || 500;
  const hide_details = statusCode >= 500 && process.env.NODE_ENV === "production";
  const message = hide_details
    ? "INTERNAL_SERVER_ERROR"
    : err.message || "Something went wrong!";

  response.status(statusCode).json({ error: message });
};

export { error_handler };
