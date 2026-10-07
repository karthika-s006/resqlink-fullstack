import { Router } from "express";
import EmergencyRequest from "../models/EmergencyRequest.js";
import Resource from "../models/Resource.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.get("/", async (req, res) => {
  const resources = await Resource.find().populate("providedBy", "name role").sort({ createdAt: -1 });
  res.json({ resources });
});

router.get("/:id", async (req, res) => {
  const resource = await Resource.findById(req.params.id).populate("providedBy", "name role");
  if (!resource) return res.status(404).json({ message: "Resource not found." });
  res.json({ resource });
});

router.post("/", protect, async (req, res) => {
  const { name, category, quantity, location } = req.body;
  if (!name?.trim() || !category?.trim() || !location?.trim() || quantity === undefined) return res.status(400).json({ message: "Name, category, quantity, and location are required." });
  const resource = await Resource.create({ name, category, quantity, location, availability: req.body.availability ?? true, providedBy: req.user.id });
  res.status(201).json({ resource });
});

router.put("/:id", protect, async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) return res.status(404).json({ message: "Resource not found." });
  if (req.user.role !== "admin" && resource.providedBy.toString() !== req.user.id) return res.status(403).json({ message: "Only the provider or an admin can update this resource." });
  for (const key of ["name", "category", "quantity", "location", "availability"]) if (key in req.body) resource[key] = req.body[key];
  await resource.save();
  res.json({ resource });
});

router.delete("/:id", protect, async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) return res.status(404).json({ message: "Resource not found." });
  if (req.user.role !== "admin" && resource.providedBy.toString() !== req.user.id) return res.status(403).json({ message: "Only the provider or an admin can delete this resource." });
  await EmergencyRequest.updateMany({ assignedResource: resource.id }, { $set: { assignedResource: null } });
  await resource.deleteOne();
  res.json({ message: "Resource deleted." });
});

export default router;