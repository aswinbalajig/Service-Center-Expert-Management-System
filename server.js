import dotenv from "dotenv";
dotenv.config();
import { app } from "./index.js";


const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});



function shutdown(signal) {
  console.log(`${signal} received. Starting graceful shutdown`);

  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forcing shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on('uncaughtException', (error) => {
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  shutdown('unhandledRejection');
});

 


// Handle termination signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);


