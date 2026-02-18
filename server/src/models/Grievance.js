import mongoose from "mongoose";

const grievanceSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["submitted", "committee_review", "approved", "rejected", "in_progress", "resolved"],
      default: "submitted",
      index: true
    },
    adminApproval: {
      decision: { type: String, enum: ["approved", "rejected", null], default: null },
      remarks: { type: String, default: "" },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approvedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Grievance", grievanceSchema);
