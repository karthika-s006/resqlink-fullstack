import { Router } from "express";
import EmergencyRequest from "../models/EmergencyRequest.js";
import Volunteer from "../models/Volunteer.js";
import { refreshVolunteerStatus } from "../services/volunteerStatus.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const volunteerView = (query) => query.populate("user", "name role").sort({ createdAt: -1 });
router.get("/", async (req, res) => {
  const volunteers = await volunteerView(Volunteer.find());
  res.json({ volunteers });
});
router.get("/:id", async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id).populate("user", "name role");
  if (!volunteer) return res.status(404).json({ message: "Volunteer not found." });
  res.json({ volunteer });
});
router.post("/", protect, async (req, res) => {
  if (req.user.role !== "volunteer" && req.user.role !== "admin") return res.status(403).json({ message: "A volunteer account is required." });
  const { location, skills = [], availability = true } = req.body;
  if (!location?.trim() || !Array.isArray(skills)) return res.status(400).json({ message: "Location and a valid skills list are required." });
  const volunteer = await Volunteer.findOneAndUpdate(
    { user: req.user.id },
    { location, skills, availability },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await refreshVolunteerStatus(volunteer.id);
  res.status(201).json({ volunteer });
});
router.put("/:id", protect, async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id);
  if (!volunteer) return res.status(404).json({ message: "Volunteer not found." });
  if (req.user.role !== "admin" && volunteer.user.toString() !== req.user.id) return res.status(403).json({ message: "You can only update your own volunteer profile." });
  for (const key of ["skills", "location", "availability"]) if (key in req.body) volunteer[key] = req.body[key];
  await volunteer.save();
  await refreshVolunteerStatus(volunteer.id);
  await volunteer.populate("user", "name role");
  res.json({ volunteer });
});
router.delete("/:id", protect, async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id);
  if (!volunteer) return res.status(404).json({ message: "Volunteer not found." });
  if (req.user.role !== "admin" && volunteer.user.toString() !== req.user.id) return res.status(403).json({ message: "You can only remove your own volunteer profile." });
  await EmergencyRequest.updateMany({ assignedVolunteer: volunteer.id }, { $set: { assignedVolunteer: null } });
  await volunteer.deleteOne();
  res.json({ message: "Volunteer profile removed." });
});

export default router;