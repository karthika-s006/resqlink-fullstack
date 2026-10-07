import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import User from "../models/User.js";

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD, JWT_SECRET } = process.env;
if (!JWT_SECRET) throw new Error("Set JWT_SECRET in backend/.env before creating an admin.");
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PHONE || !ADMIN_PASSWORD) {
  throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, and ADMIN_PASSWORD in backend/.env for this command.");
}
if (ADMIN_PASSWORD.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");

try {
  await connectDatabase();
  const user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase().trim() });
  if (user) {
    user.role = "admin";
    user.name = ADMIN_NAME;
    user.phone = ADMIN_PHONE;
    await user.save();
    console.log(`Promoted ${user.email} to administrator.`);
  } else {
    const admin = await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, phone: ADMIN_PHONE, password: ADMIN_PASSWORD, role: "admin" });
    console.log(`Administrator account created: ${admin.email}`);
  }
} finally {
  await mongoose.disconnect();
}