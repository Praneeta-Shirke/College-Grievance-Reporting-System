import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Department from "../models/Department.js";
import CollegeIdentity from "../models/CollegeIdentity.js";
import PendingRegistration from "../models/PendingRegistration.js";
import Grievance from "../models/Grievance.js";
import StatusUpdate from "../models/StatusUpdate.js";
import { sendRegistrationOtpEmail } from "../utils/mailer.js";

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const normalizeCollegeId = (collegeId) => (collegeId || "").trim().toUpperCase();
const allowedStudentClasses = ["Bsc CS", "Bsc EC", "B.Com", "B.Sc BioTech", "B.A Arts", "B.Sc Chemistry"];

const collegeIdPatternByRole = {
  student: /^STU-\d{4}-\d{4}$/,
  staff: /^STF-[A-Z]{2,10}-\d{3}$/,
  admin: /^ADM-\d{4}$/
};

const validateCollegeIdFormat = (role, collegeId) => collegeIdPatternByRole[role]?.test(collegeId);
const validIdentityRoles = ["student", "staff", "admin"];
const otpValidityMs = 10 * 60 * 1000;

const toUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  collegeId: user.collegeId,
  phone: user.phone,
  currentAddress: user.currentAddress,
  birthDate: user.birthDate,
  className: user.className,
  batch: user.batch,
  role: user.role,
  department: user.department
});

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const validateStudentRegistrationPayload = async (payload) => {
  const { name, email, password, confirmPassword, collegeId, phone, currentAddress, birthDate, className, batch } =
    payload;

  if (!name) return { ok: false, status: 400, message: "Name is required" };
  if (!email) return { ok: false, status: 400, message: "Email is required" };
  if (!collegeId) return { ok: false, status: 400, message: "College ID is required" };
  if (!phone) return { ok: false, status: 400, message: "Phone number is required" };
  if (!currentAddress) return { ok: false, status: 400, message: "Current address is required" };
  if (!birthDate) return { ok: false, status: 400, message: "Birth date is required" };
  if (!className) return { ok: false, status: 400, message: "Class is required" };
  if (!batch) return { ok: false, status: 400, message: "Batch is required" };
  if (!password) return { ok: false, status: 400, message: "Password is required" };
  if (!confirmPassword) return { ok: false, status: 400, message: "Confirm password is required" };

  if (!/^\d{10}$/.test(phone)) {
    return { ok: false, status: 400, message: "Phone number must be 10 digits" };
  }
  if (!allowedStudentClasses.includes(className)) {
    return { ok: false, status: 400, message: "Invalid class selection" };
  }
  if (!/^\d{4}$/.test(batch)) {
    return { ok: false, status: 400, message: "Batch must be a single year in YYYY format (e.g., 2026)" };
  }
  if (password.length < 8) {
    return { ok: false, status: 400, message: "Password must be at least 8 characters long" };
  }
  if (password !== confirmPassword) {
    return { ok: false, status: 400, message: "Password and confirmPassword do not match" };
  }

  const birthDateValue = new Date(birthDate);
  if (Number.isNaN(birthDateValue.getTime())) {
    return { ok: false, status: 400, message: "Invalid birthDate" };
  }

  const normalizedEmail = email.toLowerCase();
  const normalizedCollegeId = normalizeCollegeId(collegeId);

  if (!validateCollegeIdFormat("student", normalizedCollegeId)) {
    return { ok: false, status: 400, message: "Invalid student collegeId format. Use STU-YYYY-NNNN" };
  }

  const [emailExists, collegeIdExists, identityExists] = await Promise.all([
    User.findOne({ email: normalizedEmail }),
    User.findOne({ collegeId: normalizedCollegeId }),
    CollegeIdentity.findOne({ collegeId: normalizedCollegeId, role: "student", isActive: true, isClaimed: false })
  ]);

  if (emailExists) return { ok: false, status: 409, message: "Email already in use" };
  if (collegeIdExists) return { ok: false, status: 409, message: "College ID already in use" };
  if (!identityExists) {
    return { ok: false, status: 400, message: "College ID is not authorized for student registration" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return {
    ok: true,
    data: {
      name,
      email: normalizedEmail,
      collegeId: normalizedCollegeId,
      phone,
      currentAddress,
      birthDate: birthDateValue,
      className,
      batch,
      passwordHash
    }
  };
};

const claimIdentity = async (collegeId, role, userId) => {
  return CollegeIdentity.findOneAndUpdate(
    { collegeId, role, isActive: true, isClaimed: false },
    { $set: { isClaimed: true, claimedBy: userId, claimedAt: new Date() } },
    { new: true }
  );
};

export const register = async (req, res) => {
  try {
    const validation = await validateStudentRegistrationPayload(req.body);
    if (!validation.ok) return res.status(validation.status).json({ message: validation.message });

    const otp = generateOtp();
    await PendingRegistration.findOneAndUpdate(
      { email: validation.data.email },
      {
        $set: {
          email: validation.data.email,
          otpHash: hashOtp(otp),
          otpExpiresAt: new Date(Date.now() + otpValidityMs),
          registrationData: validation.data
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendRegistrationOtpEmail(validation.data.email, otp);
    return res.status(200).json({ message: "Registration OTP sent to your email", email: validation.data.email });
  } catch (error) {
    if (error?.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0] || "field";
      const fieldMap = { email: "Email", collegeId: "College ID" };
      return res.status(409).json({ message: `${fieldMap[key] || key} already in use` });
    }
    if (error?.name === "ValidationError") {
      const first = Object.values(error.errors || {})[0];
      return res.status(400).json({ message: first?.message || "Validation failed" });
    }
    if (
      error?.message?.includes("OTP email is not configured") ||
      error?.message?.includes("Invalid login") ||
      error?.message?.includes("Username and Password not accepted") ||
      error?.code === "EAUTH"
    ) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

export const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const pending = await PendingRegistration.findOne({ email: (email || "").toLowerCase() });
    if (!pending) return res.status(400).json({ message: "No pending registration found. Register again." });

    if (pending.otpExpiresAt.getTime() < Date.now()) {
      await PendingRegistration.findByIdAndDelete(pending._id);
      return res.status(400).json({ message: "OTP has expired. Register again." });
    }

    if (pending.otpHash !== hashOtp(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const data = pending.registrationData;

    const [emailExists, collegeIdExists] = await Promise.all([
      User.findOne({ email: data.email }),
      User.findOne({ collegeId: data.collegeId })
    ]);
    if (emailExists) return res.status(409).json({ message: "Email already in use" });
    if (collegeIdExists) return res.status(409).json({ message: "College ID already in use" });

    const user = await User.create({
      name: data.name,
      email: data.email,
      collegeId: data.collegeId,
      phone: data.phone,
      currentAddress: data.currentAddress,
      birthDate: data.birthDate,
      className: data.className,
      batch: data.batch,
      passwordHash: data.passwordHash,
      role: "student"
    });

    const claimed = await claimIdentity(data.collegeId, "student", user._id);
    if (!claimed) {
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({ message: "College ID is not authorized for student registration" });
    }

    await PendingRegistration.findByIdAndDelete(pending._id);

    return res.status(201).json({
      token: createToken(user._id),
      user: toUserPayload(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "OTP verification failed", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() }).populate("department", "name code");

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    return res.json({
      token: createToken(user._id),
      user: toUserPayload(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const me = async (req, res) => {
  return res.json(toUserPayload(req.user));
};

export const updateMyProfile = async (req, res) => {
  try {
    const allowed = ["name", "phone", "currentAddress", "birthDate", "className", "batch"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.phone !== undefined && !/^\d{10}$/.test(String(updates.phone))) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }

    if (updates.birthDate !== undefined) {
      const parsed = new Date(updates.birthDate);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ message: "Invalid birthDate" });
      updates.birthDate = parsed;
    }

    if (req.user.role === "student") {
      if (updates.className !== undefined && !allowedStudentClasses.includes(updates.className)) {
        return res.status(400).json({ message: "Invalid class selection" });
      }
      if (updates.batch !== undefined && !/^\d{4}$/.test(String(updates.batch))) {
        return res.status(400).json({ message: "Batch must be a single year in YYYY format (e.g., 2026)" });
      }
    } else {
      delete updates.className;
      delete updates.batch;
    }

    const updated = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).populate(
      "department",
      "name code"
    );
    return res.json(toUserPayload(updated));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

export const deleteMyAccount = async (req, res) => {
  try {
    const currentPassword = req.body?.currentPassword || req.query?.currentPassword || "";
    if (!currentPassword) return res.status(400).json({ message: "currentPassword is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid password" });

    if (user.role === "staff") {
      const assignedCount = await Grievance.countDocuments({ assignedStaff: user._id });
      if (assignedCount > 0) {
        const replacement = await User.findOne({
          role: "staff",
          department: user.department,
          _id: { $ne: user._id }
        });
        if (!replacement) {
          return res.status(400).json({
            message:
              "Cannot delete account: staff is assigned to grievances and no replacement staff exists in the department"
          });
        }
        await Grievance.updateMany({ assignedStaff: user._id }, { $set: { assignedStaff: replacement._id } });
      }
      await Department.updateMany({ staffMembers: user._id }, { $pull: { staffMembers: user._id } });
    }

    const createdGrievances = await Grievance.find({ createdBy: user._id }).select("_id").lean();
    const createdGrievanceIds = createdGrievances.map((g) => g._id);
    if (createdGrievanceIds.length) {
      await StatusUpdate.deleteMany({ grievance: { $in: createdGrievanceIds } });
      await Grievance.deleteMany({ _id: { $in: createdGrievanceIds } });
    }

    await StatusUpdate.deleteMany({ updatedBy: user._id });

    await Grievance.updateMany(
      { "adminApproval.approvedBy": user._id },
      {
        $set: {
          "adminApproval.approvedBy": null,
          "adminApproval.remarks": "Approver account deleted"
        }
      }
    );
    await Grievance.updateMany(
      { "urgencyValidation.validatedBy": user._id },
      {
        $set: {
          "urgencyValidation.validatedBy": null,
          "urgencyValidation.remarks": "Validator account deleted"
        }
      }
    );
    await Grievance.updateMany(
      { "dismissalRequest.requestedBy": user._id },
      {
        $set: {
          "dismissalRequest.requestedBy": null
        }
      }
    );
    await Grievance.updateMany(
      { "dismissalRequest.reviewedBy": user._id },
      {
        $set: {
          "dismissalRequest.reviewedBy": null
        }
      }
    );

    await PendingRegistration.deleteOne({ email: user.email });
    await CollegeIdentity.findOneAndUpdate(
      { collegeId: user.collegeId, role: user.role },
      { $set: { isClaimed: false, claimedBy: null, claimedAt: null } }
    );

    await User.findByIdAndDelete(user._id);

    return res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("deleteMyAccount error:", error);
    return res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
};

export const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role, departmentId, collegeId, phone, currentAddress, birthDate } =
      req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!role) return res.status(400).json({ message: "Role is required" });
    if (!collegeId) return res.status(400).json({ message: "College ID is required" });
    if (!phone) return res.status(400).json({ message: "Phone number is required" });
    if (!currentAddress) return res.status(400).json({ message: "Current address is required" });
    if (!birthDate) return res.status(400).json({ message: "Birth date is required" });
    if (!password) return res.status(400).json({ message: "Password is required" });
    if (!confirmPassword) return res.status(400).json({ message: "Confirm password is required" });

    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({ message: "Role must be admin or staff" });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password and confirmPassword do not match" });
    }

    const birthDateValue = new Date(birthDate);
    if (Number.isNaN(birthDateValue.getTime())) {
      return res.status(400).json({ message: "Invalid birthDate" });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedCollegeId = normalizeCollegeId(collegeId);
    if (!validateCollegeIdFormat(role, normalizedCollegeId)) {
      const formatHint = role === "admin" ? "ADM-NNNN" : "STF-DEPT-NNN";
      return res.status(400).json({ message: `Invalid ${role} collegeId format. Use ${formatHint}` });
    }

    const [emailExists, collegeIdExists] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ collegeId: normalizedCollegeId })
    ]);
    if (emailExists) return res.status(409).json({ message: "Email already in use" });
    if (collegeIdExists) return res.status(409).json({ message: "College ID already in use" });

    let department = null;
    if (role === "staff") {
      if (!departmentId) return res.status(400).json({ message: "Department is required for staff" });
      department = await Department.findById(departmentId);
      if (!department) return res.status(404).json({ message: "Department not found" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create({
      name,
      email: normalizedEmail,
      collegeId: normalizedCollegeId,
      phone,
      currentAddress,
      birthDate: birthDateValue,
      passwordHash,
      role,
      department: role === "staff" ? department._id : null
    });

    const claimed = await claimIdentity(normalizedCollegeId, role, created._id);
    if (!claimed) {
      await User.findByIdAndDelete(created._id);
      return res.status(400).json({ message: `College ID is not authorized for ${role} creation` });
    }

    if (role === "staff") {
      await Department.findByIdAndUpdate(department._id, { $addToSet: { staffMembers: created._id } });
    }

    const withDepartment = await User.findById(created._id).populate("department", "name code");
    return res.status(201).json({
      ...toUserPayload(withDepartment)
    });
  } catch (error) {
    if (error?.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0] || "field";
      const fieldMap = { email: "Email", collegeId: "College ID" };
      return res.status(409).json({ message: `${fieldMap[key] || key} already in use` });
    }
    if (error?.name === "ValidationError") {
      const first = Object.values(error.errors || {})[0];
      return res.status(400).json({ message: first?.message || "Validation failed" });
    }
    return res.status(500).json({ message: "Failed to create user", error: error.message });
  }
};

const parseBulkIdentityPayload = (payload) => {
  if (Array.isArray(payload?.entries)) {
    return payload.entries.map((item) => ({
      collegeId: normalizeCollegeId(item?.collegeId),
      role: (item?.role || "").toLowerCase().trim(),
      notes: (item?.notes || "").trim()
    }));
  }

  const text = `${payload?.rawText || ""}`.trim();
  if (!text) return [];

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rolePart = "", collegeIdPart = "", ...noteParts] = line.split(",").map((x) => x.trim());
      return {
        role: rolePart.toLowerCase(),
        collegeId: normalizeCollegeId(collegeIdPart),
        notes: noteParts.join(", ").trim()
      };
    });
};

export const bulkAddCollegeIds = async (req, res) => {
  try {
    const rows = parseBulkIdentityPayload(req.body);
    if (!rows.length) {
      return res
        .status(400)
        .json({ message: "No entries found. Send entries[] or rawText with ROLE,COLLEGE_ID[,NOTES] per line." });
    }

    const results = [];
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const itemNo = index + 1;

      if (!row.role || !row.collegeId) {
        results.push({
          row: itemNo,
          collegeId: row.collegeId || "",
          role: row.role || "",
          status: "error",
          message: "Each row must include role and collegeId"
        });
        errorCount += 1;
        continue;
      }

      if (!validIdentityRoles.includes(row.role)) {
        results.push({
          row: itemNo,
          collegeId: row.collegeId,
          role: row.role,
          status: "error",
          message: "Role must be one of student, staff, admin"
        });
        errorCount += 1;
        continue;
      }

      if (!validateCollegeIdFormat(row.role, row.collegeId)) {
        const hintByRole = {
          student: "STU-YYYY-NNNN",
          staff: "STF-DEPT-NNN",
          admin: "ADM-NNNN"
        };
        results.push({
          row: itemNo,
          collegeId: row.collegeId,
          role: row.role,
          status: "error",
          message: `Invalid format for ${row.role}. Use ${hintByRole[row.role]}`
        });
        errorCount += 1;
        continue;
      }

      const existing = await CollegeIdentity.findOne({ collegeId: row.collegeId });
      if (existing) {
        results.push({
          row: itemNo,
          collegeId: row.collegeId,
          role: row.role,
          status: "skipped",
          message: "College ID already exists in identity pool"
        });
        skippedCount += 1;
        continue;
      }

      await CollegeIdentity.create({
        collegeId: row.collegeId,
        role: row.role,
        notes: row.notes || "",
        isActive: true,
        isClaimed: false
      });

      results.push({
        row: itemNo,
        collegeId: row.collegeId,
        role: row.role,
        status: "created",
        message: "College ID added"
      });
      createdCount += 1;
    }

    return res.status(201).json({
      message: "Bulk college ID import processed",
      summary: {
        total: rows.length,
        created: createdCount,
        skipped: skippedCount,
        errors: errorCount
      },
      results
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to import college IDs", error: error.message });
  }
};

export const bulkAddStudentCollegeIdsByStaff = async (req, res) => {
  try {
    const text = `${req.body?.rawText || ""}`.trim();
    if (!text) {
      return res.status(400).json({
        message: "No entries found. Send rawText with STUDENT_COLLEGE_ID[,NOTES] per line."
      });
    }

    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [collegeIdPart = "", ...noteParts] = line.split(",").map((x) => x.trim());
        return {
          collegeId: normalizeCollegeId(collegeIdPart),
          role: "student",
          notes: noteParts.join(", ").trim()
        };
      });

    const results = [];
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const itemNo = index + 1;

      if (!row.collegeId) {
        results.push({
          row: itemNo,
          collegeId: "",
          role: "student",
          status: "error",
          message: "College ID is required"
        });
        errorCount += 1;
        continue;
      }

      if (!validateCollegeIdFormat("student", row.collegeId)) {
        results.push({
          row: itemNo,
          collegeId: row.collegeId,
          role: "student",
          status: "error",
          message: "Invalid format for student. Use STU-YYYY-NNNN"
        });
        errorCount += 1;
        continue;
      }

      const existing = await CollegeIdentity.findOne({ collegeId: row.collegeId });
      if (existing) {
        results.push({
          row: itemNo,
          collegeId: row.collegeId,
          role: "student",
          status: "skipped",
          message: "College ID already exists in identity pool"
        });
        skippedCount += 1;
        continue;
      }

      await CollegeIdentity.create({
        collegeId: row.collegeId,
        role: "student",
        notes: row.notes || "",
        isActive: true,
        isClaimed: false
      });

      results.push({
        row: itemNo,
        collegeId: row.collegeId,
        role: "student",
        status: "created",
        message: "Student college ID added"
      });
      createdCount += 1;
    }

    return res.status(201).json({
      message: "Bulk student college ID import processed",
      summary: {
        total: rows.length,
        created: createdCount,
        skipped: skippedCount,
        errors: errorCount
      },
      results
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to import student college IDs", error: error.message });
  }
};
