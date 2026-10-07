import mongoose from "mongoose";

const emergencyRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    priority: { type: String, enum: ["critical", "high", "medium", "low"], required: true },
    peopleAffected: { type: Number, required: true, min: 1 },
    requiredResource: { type: String, required: true, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: ["pending", "accepted", "approved", "assigned", "in_progress", "completed", "rejected"],
      default: "pending",
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: "Volunteer", default: null },
    assignedResource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export default mongoose.model("EmergencyRequest", emergencyRequestSchema);