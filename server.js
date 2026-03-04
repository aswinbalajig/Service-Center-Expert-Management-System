import dotenv from "dotenv";
dotenv.config();
import { app } from "./index.js";


const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});









server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});


