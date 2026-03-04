import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import auth_router from "./routers/auth_router.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth',auth_router);

// Error handling middleware


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});


export { app };
