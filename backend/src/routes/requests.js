import { Router } from "express";
import EmergencyRequest from "../models/EmergencyRequest.js";
import Resource from "../models/Resource.js";
import Volunteer from "../models/Volunteer.js";
import { protect } from "../middleware/auth.js";
import { refreshVolunteerStatus } from "../services/volunteerStatus.js";

const router = Router();
const populateRequest = (query) => query.populate("requestedBy", "name email").populate({ path: "assignedVolunteer", populate: { path: "user", select: "name phone" } }).populate("assignedResource", "name category quantity");
router.use(protect);

router.post("/", async (req, res) => {
  const { title, type, description, location, priority, peopleAffected, requiredResource } = req.body;
  if (!title?.trim() || !type?.trim() || !description?.trim() || !location?.trim() || !requiredResource?.trim()) {
    return res.status(400).json({ message: "Complete all required request fields." });
  }
  const request = await EmergencyRequest.create({ title, type, description, location, priority, peopleAffected, requiredResource, requestedBy: req.user.id });
  res.status(201).json({ request });
});

router.get("/user/:userId", async (req, res) => {
  if (req.user.role !== "admin" && req.user.id !== req.params.userId) return res.status(403).json({ message: "You can only view your own requests." });
  const requests = await populateRequest(EmergencyRequest.find({ requestedBy: req.params.userId }).sort({ createdAt: -1 }));
  res.json({ requests });
});

router.get("/", async (req, res) => {
  let query = { requestedBy: req.user.id };
  if (req.user.role === "admin") query = {};
  if (req.user.role === "volunteer") {
    const volunteer = await Volunteer.findOne({ user: req.user.id }).select("_id");
    query = volunteer ? { assignedVolunteer: volunteer.id } : { _id: null };
  }
  const requests = await populateRequest(EmergencyRequest.find(query).sort({ createdAt: -1 }));
  res.json({ requests });
});

router.get("/:id", async (req, res) => {
  const request = await populateRequest(EmergencyRequest.findById(req.params.id));
  if (!request) return res.status(404).json({ message: "Request not found." });
  const isOwner = request.requestedBy.id === req.user.id;
  const volunteer = req.user.role === "volunteer" ? await Volunteer.findOne({ user: req.user.id }).select("_id") : null;
  const isAssignedVolunteer = volunteer && request.assignedVolunteer?.id === volunteer.id;
  if (req.user.role !== "admin" && !isOwner && !isAssignedVolunteer) return res.status(403).json({ message: "You can only view your own or assigned requests." });
  res.json({ request });
});

router.put("/:id", async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found." });
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && (request.requestedBy.toString() !== req.user.id || request.status !== "pending")) {
    return res.status(403).json({ message: "Only the owner of a pending request can edit it." });
  }
  const priorVolunteerId = request.assignedVolunteer?.toString();
  const editable = isAdmin
    ? ["title", "type", "description", "location", "priority", "peopleAffected", "requiredResource", "status", "assignedVolunteer", "assignedResource"]
    : ["title", "type", "description", "location", "priority", "peopleAffected", "requiredResource"];
  for (const key of editable) if (key in req.body) request[key] = req.body[key];
  if (isAdmin && request.assignedVolunteer) {
    if (!(await Volunteer.exists({ _id: request.assignedVolunteer }))) return res.status(404).json({ message: "Assigned volunteer not found." });
  }
  if (isAdmin && request.assignedResource) {
    if (!(await Resource.exists({ _id: request.assignedResource }))) return res.status(404).json({ message: "Assigned resource not found." });
  }
  await request.save();
  await refreshVolunteerStatus(priorVolunteerId);
  if (request.assignedVolunteer?.toString() !== priorVolunteerId) await refreshVolunteerStatus(request.assignedVolunteer);
  await request.populate("requestedBy", "name email");
  res.json({ request });
});

router.delete("/:id", async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found." });
  if (req.user.role !== "admin" && (request.requestedBy.toString() !== req.user.id || request.status !== "pending")) {
    return res.status(403).json({ message: "Only the owner of a pending request can delete it." });
  }
  const assignedVolunteerId = request.assignedVolunteer?.toString();
  await request.deleteOne();
  await refreshVolunteerStatus(assignedVolunteerId);
  res.json({ message: "Request deleted." });
});

export default router;