import Department from "../models/Department.js";

export const getDepartments = async (_req, res) => {
  try {
    const departments = await Department.find().select("name code").sort({ name: 1 });
    return res.json(departments);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch departments", error: error.message });
  }
};
