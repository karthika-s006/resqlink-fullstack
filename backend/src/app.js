import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import { errorHandler, notFound } from "./middleware/errors.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import requestRoutes from "./routes/requests.js";
import resourceRoutes from "./routes/resources.js";
import userRoutes from "./routes/users.js";
import volunteerRoutes from "./routes/volunteers.js";

export function createApp({ databaseReady = () => mongoose.connection.readyState === 1 } = {}) {
  const app = express();
  const allowedOrigins = new Set(
    (process.env.CLIENT_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  if (process.env.NODE_ENV !== "production") {
    for (const host of ["localhost", "127.0.0.1"]) {
      allowedOrigins.add(`http://${host}:5173`);
      allowedOrigins.add(`http://${host}:5174`);
    }
  }

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", (req, res, next) => {
    if (["POST", "PUT", "PATCH"].includes(req.method) && (!req.body || typeof req.body !== "object" || Array.isArray(req.body))) {
      return res.status(400).json({ message: "Request body must be a JSON object." });
    }
    next();
  });
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));

  app.get("/api/health", (req, res) => {
    const connected = databaseReady();
    res.status(connected ? 200 : 503).json({
      status: connected ? "ok" : "unavailable",
      database: connected ? "connected" : "disconnected",
      ...(!connected && { message: "MongoDB is unavailable. Start the configured MongoDB service or check MONGODB_URI." }),
    });
  });

  app.use("/api", (req, res, next) => {
    if (!databaseReady()) {
      return res.status(503).json({ message: "MongoDB is unavailable. Start the configured MongoDB service or check MONGODB_URI." });
    }
    next();
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/requests", requestRoutes);
  app.use("/api/resources", resourceRoutes);
  app.use("/api/volunteers", volunteerRoutes);
  app.use("/api/admin", adminRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}