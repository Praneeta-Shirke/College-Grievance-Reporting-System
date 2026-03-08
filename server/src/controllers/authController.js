import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Department from "../models/Department.js";
import CollegeIdentity from "../models/CollegeIdentity.js";

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

const claimIdentity = async (collegeId, role, userId) => {
  return CollegeIdentity.findOneAndUpdate(
    { collegeId, role, isActive: true, isClaimed: false },
    { $set: { isClaimed: true, claimedBy: userId, claimedAt: new Date() } },
    { new: true }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, collegeId, phone, currentAddress, birthDate, className, batch } =
      req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!collegeId) return res.status(400).json({ message: "College ID is required" });
    if (!phone) return res.status(400).json({ message: "Phone number is required" });
    if (!currentAddress) return res.status(400).json({ message: "Current address is required" });
    if (!birthDate) return res.status(400).json({ message: "Birth date is required" });
    if (!className) return res.status(400).json({ message: "Class is required" });
    if (!batch) return res.status(400).json({ message: "Batch is required" });
    if (!password) return res.status(400).json({ message: "Password is required" });
    if (!confirmPassword) return res.status(400).json({ message: "Confirm password is required" });

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }
    if (!allowedStudentClasses.includes(className)) {
      return res.status(400).json({ message: "Invalid class selection" });
    }
    if (!/^\d{4}$/.test(batch)) {
      return res.status(400).json({ message: "Batch must be a single year in YYYY format (e.g., 2026)" });
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
    if (!validateCollegeIdFormat("student", normalizedCollegeId)) {
      return res.status(400).json({ message: "Invalid student collegeId format. Use STU-YYYY-NNNN" });
    }

    const [emailExists, collegeIdExists] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ collegeId: normalizedCollegeId })
    ]);
    if (emailExists) return res.status(409).json({ message: "Email already in use" });
    if (collegeIdExists) return res.status(409).json({ message: "College ID already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      collegeId: normalizedCollegeId,
      phone,
      currentAddress,
      birthDate: birthDateValue,
      className,
      batch,
      passwordHash,
      role: "student"
    });

    const claimed = await claimIdentity(normalizedCollegeId, "student", user._id);
    if (!claimed) {
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({ message: "College ID is not authorized for student registration" });
    }

    return res.status(201).json({
      token: createToken(user._id),
      user: {
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
      }
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
    return res.status(500).json({ message: "Registration failed", error: error.message });
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
      user: {
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
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const me = async (req, res) => {
  return res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    collegeId: req.user.collegeId,
    phone: req.user.phone,
    currentAddress: req.user.currentAddress,
    birthDate: req.user.birthDate,
    className: req.user.className,
    batch: req.user.batch,
    role: req.user.role,
    department: req.user.department
  });
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
      id: withDepartment._id,
      name: withDepartment.name,
      email: withDepartment.email,
      collegeId: withDepartment.collegeId,
      phone: withDepartment.phone,
      currentAddress: withDepartment.currentAddress,
      birthDate: withDepartment.birthDate,
      role: withDepartment.role,
      department: withDepartment.department
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
