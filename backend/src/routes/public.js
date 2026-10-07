import { Router } from "express";
import EmergencyRequest from "../models/EmergencyRequest.js";
import Resource from "../models/Resource.js";
import Volunteer from "../models/Volunteer.js";

const router = Router();
router.get("/overview", async (req, res) => {
  const [requests, pendingRequests, activeRequests, completedRequests, resources, volunteers, activeResources, availableVolunteers] = await Promise.all([
    EmergencyRequest.countDocuments({ status: { $nin: ["completed", "rejected"] } }),
    EmergencyRequest.countDocuments({ status: "pending" }),
    EmergencyRequest.countDocuments({ status: { $in: ["accepted", "approved", "assigned", "in_progress"] } }),
    EmergencyRequest.countDocuments({ status: "completed" }),
    Resource.countDocuments(), Volunteer.countDocuments(), Resource.countDocuments({ availability: true, quantity: { $gt: 0 } }),
    Volunteer.countDocuments({ availability: true, status: "available" }),
  ]);
  res.json({ overview: { requests, pendingRequests, activeRequests, completedRequests, resources, volunteers, activeResources, availableVolunteers } });
});
export default router;