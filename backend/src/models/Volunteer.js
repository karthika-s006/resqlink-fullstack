import mongoose from "mongoose";

const volunteerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    skills: [{ type: String, trim: true, maxlength: 60 }],
    location: { type: String, required: true, trim: true, maxlength: 200 },
    availability: { type: Boolean, default: true },
    status: { type: String, enum: ["available", "assigned", "inactive"], default: "available" },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export default mongoose.model("Volunteer", volunteerSchema);