import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    collegeId: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    currentAddress: { type: String, default: "" },
    birthDate: { type: Date, default: null },
    className: { type: String, default: "" },
    batch: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "staff", "admin"],
      default: "student",
      index: true
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
