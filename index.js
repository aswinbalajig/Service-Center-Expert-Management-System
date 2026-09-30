import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import auth_router from "./routers/auth_router.js";
import issue_router from "./routers/service_center_router.js";
import invite_router from "./routers/invite_router.js";
import user_router from "./routers/user_router.js";
import { jwt_verify } from "./middlewares/general_middlewares/auth.middlewares.js";
import process from "process";
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", auth_router);
app.use("/user", jwt_verify, user_router);
app.use("/issue", jwt_verify, issue_router);
app.use("/invite", invite_router);
//app.use('/service_center',service_center_router);

// Error handling middleware

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong!";
  res.status(statusCode).json({ error: message });
});

export { app };
