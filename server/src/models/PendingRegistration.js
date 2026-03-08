import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true, index: true },
    registrationData: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      collegeId: { type: String, required: true, uppercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      currentAddress: { type: String, required: true },
      birthDate: { type: Date, required: true },
      className: { type: String, required: true },
      batch: { type: String, required: true },
      passwordHash: { type: String, required: true }
    }
  },
  { timestamps: true }
);

export default mongoose.model("PendingRegistration", pendingRegistrationSchema);
