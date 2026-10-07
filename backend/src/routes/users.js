import { Router } from "express";
import EmergencyRequest from "../models/EmergencyRequest.js";
import Resource from "../models/Resource.js";
import User from "../models/User.js";
import Volunteer from "../models/Volunteer.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", authorize("admin"), async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
});

router.get("/:id", async (req, res) => {
  if (req.user.role !== "admin" && req.user.id !== req.params.id) {
    return res.status(403).json({ message: "You can only view your own profile." });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user });
});

router.put("/:id", async (req, res) => {
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && req.user.id !== req.params.id) return res.status(403).json({ message: "You can only edit your own profile." });
  const allowed = ["name", "email", "phone"];
  if (isAdmin) allowed.push("role");
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user });
});

router.delete("/:id", authorize("admin"), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  const volunteer = await Volunteer.findOne({ user: user.id }).select("_id");
  const resources = await Resource.find({ providedBy: user.id }).select("_id");
  await Promise.all([
    EmergencyRequest.deleteMany({ requestedBy: user.id }),
    Resource.deleteMany({ providedBy: user.id }),
    Volunteer.deleteMany({ user: user.id }),
    ...(volunteer ? [EmergencyRequest.updateMany({ assignedVolunteer: volunteer.id }, { $set: { assignedVolunteer: null } })] : []),
    ...(resources.length ? [EmergencyRequest.updateMany({ assignedResource: { $in: resources.map((resource) => resource.id) } }, { $set: { assignedResource: null } })] : []),
  ]);
  await user.deleteOne();
  res.json({ message: "User deleted." });
});

export default router;