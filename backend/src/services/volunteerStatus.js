import EmergencyRequest from "../models/EmergencyRequest.js";
import Volunteer from "../models/Volunteer.js";

export async function refreshVolunteerStatus(volunteerId) {
  if (!volunteerId) return;
  const volunteer = await Volunteer.findById(volunteerId);
  if (!volunteer) return;

  const hasActiveAssignment = await EmergencyRequest.exists({
    assignedVolunteer: volunteer.id,
    status: { $nin: ["completed", "rejected"] },
  });
  const status = hasActiveAssignment ? "assigned" : volunteer.availability ? "available" : "inactive";
  if (volunteer.status !== status) {
    volunteer.status = status;
    await volunteer.save();
  }
}