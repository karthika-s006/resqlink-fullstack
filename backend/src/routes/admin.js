import { Router } from "express";
import EmergencyRequest from "../models/EmergencyRequest.js";
import Resource from "../models/Resource.js";
import User from "../models/User.js";
import Volunteer from "../models/Volunteer.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();
router.use(protect, authorize("admin"));

router.get("/dashboard", async (req, res) => {
  const [totalUsers, totalVolunteers, totalResources, totalRequests, pendingRequests, activeRequests, completedRequests] = await Promise.all([
    User.countDocuments(), Volunteer.countDocuments(), Resource.countDocuments(), EmergencyRequest.countDocuments(),
    EmergencyRequest.countDocuments({ status: "pending" }),
    EmergencyRequest.countDocuments({ status: { $in: ["accepted", "approved", "assigned", "in_progress"] } }),
    EmergencyRequest.countDocuments({ status: "completed" }),
  ]);
  res.json({ dashboard: { totalUsers, totalVolunteers, totalResources, totalRequests, pendingRequests, activeRequests, completedRequests } });
});
router.get("/users", async (req, res) => res.json({ users: await User.find().sort({ createdAt: -1 }) }));
router.get("/requests", async (req, res) => res.json({ requests: await EmergencyRequest.find().populate("requestedBy", "name email").populate({ path: "assignedVolunteer", populate: { path: "user", select: "name phone" } }).populate("assignedResource", "name quantity").sort({ createdAt: -1 }) }));
router.get("/resources", async (req, res) => res.json({ resources: await Resource.find().populate("providedBy", "name").sort({ createdAt: -1 }) }));
router.get("/volunteers", async (req, res) => res.json({ volunteers: await Volunteer.find().populate("user", "name email phone").sort({ createdAt: -1 }) }));

export default router;