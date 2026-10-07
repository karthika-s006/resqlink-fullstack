import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Volunteer from "../models/Volunteer.js";
import { protect } from "../middleware/auth.js";

const router = Router();

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt };
}

router.post("/register", async (req, res) => {
  const { name, email, phone, password, role = "user" } = req.body;
  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof phone !== "string" || !phone.trim() || typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Name, email, phone, and password are required." });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
  if (!["user", "volunteer", "organization"].includes(role)) {
    return res.status(400).json({ message: "Choose a valid account type." });
  }

  const user = await User.create({ name, email, phone, password, role });
  if (role === "volunteer") {
    await Volunteer.create({ user: user.id, location: "Not set", skills: [], availability: true });
  }
  res.status(201).json({ token: createToken(user.id), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) return res.status(400).json({ message: "Email and password are required." });
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  res.json({ token: createToken(user.id), user: publicUser(user) });
});

router.get("/me", protect, (req, res) => res.json({ user: publicUser(req.user) }));

router.put("/password", protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new passwords are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }
  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: "Password changed successfully." });
});

export default router;