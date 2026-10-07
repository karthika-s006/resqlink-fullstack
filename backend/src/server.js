import "dotenv/config";
import { connectDatabase } from "./config/db.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 5000;
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Set it in backend/.env before starting the server.");
}

const app = createApp();
app.listen(port, () => console.log(`ResQLInk API listening on port ${port}`));

connectDatabase()
  .then(() => console.log("MongoDB connection is ready."))
  .catch((error) => console.error(`MongoDB connection failed: ${error.message}`));