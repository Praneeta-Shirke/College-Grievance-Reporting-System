import mongoose from "mongoose";

const statusUpdateSchema = new mongoose.Schema(
  {
    grievance: { type: mongoose.Schema.Types.ObjectId, ref: "Grievance", required: true, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true },
    statusSnapshot: {
      type: String,
      enum: ["submitted", "committee_review", "approved", "rejected", "in_progress", "resolved"],
      required: true
    },
    visibleToStudent: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("StatusUpdate", statusUpdateSchema);
