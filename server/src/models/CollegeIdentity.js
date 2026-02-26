import mongoose from "mongoose";

const collegeIdentitySchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    role: { type: String, enum: ["student", "staff", "admin"], required: true, index: true },
    isActive: { type: Boolean, default: true },
    isClaimed: { type: Boolean, default: false, index: true },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    claimedAt: { type: Date, default: null },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("CollegeIdentity", collegeIdentitySchema);
