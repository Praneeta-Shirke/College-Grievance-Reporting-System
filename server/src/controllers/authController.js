import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Department from "../models/Department.js";

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: "student" });

    return res.status(201).json({
      token: createToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
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
    role: req.user.role,
    department: req.user.department
  });
};

export const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role, departmentId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password and role are required" });
    }

    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({ message: "role must be admin or staff" });
    }

    const normalizedEmail = email.toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    let department = null;
    if (role === "staff") {
      if (!departmentId) return res.status(400).json({ message: "departmentId is required for staff" });
      department = await Department.findById(departmentId);
      if (!department) return res.status(404).json({ message: "Department not found" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      department: role === "staff" ? department._id : null
    });

    if (role === "staff") {
      await Department.findByIdAndUpdate(department._id, { $addToSet: { staffMembers: created._id } });
    }

    const withDepartment = await User.findById(created._id).populate("department", "name code");
    return res.status(201).json({
      id: withDepartment._id,
      name: withDepartment.name,
      email: withDepartment.email,
      role: withDepartment.role,
      department: withDepartment.department
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create user", error: error.message });
  }
};
