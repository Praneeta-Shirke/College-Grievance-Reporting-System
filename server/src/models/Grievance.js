import mongoose from "mongoose";

const grievanceSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    isAnonymous: { type: Boolean, default: false },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: [
        "submitted",
        "committee_review",
        "approved",
        "rejected",
        "in_progress",
        "resolved",
        "dismissal_requested",
        "dismissed"
      ],
      default: "submitted",
      index: true
    },
    adminApproval: {
      decision: { type: String, enum: ["approved", "rejected", null], default: null },
      remarks: { type: String, default: "" },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approvedAt: { type: Date, default: null }
    },
    dismissalRequest: {
      decision: { type: String, enum: ["pending", "approved", "rejected", null], default: null },
      reason: { type: String, default: "" },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      requestedAt: { type: Date, default: null },
      requestedFromStatus: {
        type: String,
        enum: ["submitted", "approved", "in_progress", "resolved", null],
        default: null
      },
      adminRemarks: { type: String, default: "" },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reviewedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Grievance", grievanceSchema);
