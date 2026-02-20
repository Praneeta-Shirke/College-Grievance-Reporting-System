import Department from "../models/Department.js";
import Grievance from "../models/Grievance.js";
import StatusUpdate from "../models/StatusUpdate.js";

const grievancePopulate = [
  { path: "department", select: "name code" },
  { path: "createdBy", select: "name email" },
  { path: "assignedStaff", select: "name email" }
];

const emitGrievance = (req, grievance, update = null) => {
  const io = req.app.get("io");
  io.to(`grievance:${grievance._id.toString()}`).emit("grievance:updated", { grievance, update });
};

export const createGrievance = async (req, res) => {
  try {
    const { description, departmentId } = req.body;
    if (!description || !departmentId) {
      return res.status(400).json({ message: "description and departmentId are required" });
    }
    if (!req.file) return res.status(400).json({ message: "Image is required" });

    const department = await Department.findById(departmentId).populate("staffMembers", "_id role");
    if (!department) return res.status(404).json({ message: "Department not found" });

    const assignedStaff = department.staffMembers.find((m) => m.role === "staff");
    if (!assignedStaff) {
      return res.status(400).json({ message: "No staff member mapped to this department" });
    }

    const grievance = await Grievance.create({
      description,
      department: department._id,
      createdBy: req.user._id,
      assignedStaff: assignedStaff._id,
      imageUrl: `/uploads/${req.file.filename}`,
      status: "submitted"
    });

    await StatusUpdate.create({
      grievance: grievance._id,
      updatedBy: req.user._id,
      message: "Grievance submitted",
      statusSnapshot: "submitted"
    });

    const payload = await Grievance.findById(grievance._id).populate(grievancePopulate);
    emitGrievance(req, payload);
    return res.status(201).json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create grievance", error: error.message });
  }
};

export const getGrievances = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "student") query.createdBy = req.user._id;
    if (req.user.role === "staff") query.department = req.user.department?._id;

    const grievances = await Grievance.find(query).populate(grievancePopulate).sort({ createdAt: -1 }).lean();
    const grievanceIds = grievances.map((g) => g._id);
    const updates = await StatusUpdate.find({ grievance: { $in: grievanceIds } })
      .populate("updatedBy", "name role")
      .sort({ createdAt: 1 })
      .lean();

    const updatesByGrievance = updates.reduce((acc, upd) => {
      const id = upd.grievance.toString();
      if (!acc[id]) acc[id] = [];
      acc[id].push(upd);
      return acc;
    }, {});

    const payload = grievances.map((g) => ({ ...g, updates: updatesByGrievance[g._id.toString()] || [] }));
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch grievances", error: error.message });
  }
};

export const notifyAdmin = async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id).populate(grievancePopulate);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    const staffDepartmentId = req.user.department?._id?.toString();
    if (req.user.role !== "staff" || grievance.department._id.toString() !== staffDepartmentId) {
      return res.status(403).json({ message: "Only mapped department staff can notify admin" });
    }

    grievance.status = "committee_review";
    await grievance.save();

    const update = await StatusUpdate.create({
      grievance: grievance._id,
      updatedBy: req.user._id,
      message: "Staff forwarded grievance to college committee for approval",
      statusSnapshot: "committee_review"
    });

    const refreshed = await Grievance.findById(grievance._id).populate(grievancePopulate);
    emitGrievance(req, refreshed, update);
    return res.json(refreshed);
  } catch (error) {
    return res.status(500).json({ message: "Failed to notify admin", error: error.message });
  }
};

export const adminApproval = async (req, res) => {
  try {
    const { decision, remarks = "" } = req.body;
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "decision must be approved or rejected" });
    }

    const grievance = await Grievance.findById(req.params.id).populate(grievancePopulate);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    grievance.status = decision;
    grievance.adminApproval = {
      decision,
      remarks,
      approvedBy: req.user._id,
      approvedAt: new Date()
    };
    await grievance.save();

    const update = await StatusUpdate.create({
      grievance: grievance._id,
      updatedBy: req.user._id,
      message: decision === "approved" ? "Committee approved the grievance" : "Committee rejected the grievance",
      statusSnapshot: decision
    });

    const refreshed = await Grievance.findById(grievance._id).populate(grievancePopulate);
    emitGrievance(req, refreshed, update);
    return res.json(refreshed);
  } catch (error) {
    return res.status(500).json({ message: "Failed to process approval", error: error.message });
  }
};

export const addStatusUpdate = async (req, res) => {
  try {
    const { message, nextStatus } = req.body;
    if (!message) return res.status(400).json({ message: "message is required" });

    const grievance = await Grievance.findById(req.params.id).populate(grievancePopulate);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    const staffDepartmentId = req.user.department?._id?.toString();
    if (req.user.role !== "staff" || grievance.department._id.toString() !== staffDepartmentId) {
      return res.status(403).json({ message: "Only mapped staff can update status" });
    }
    if (["rejected"].includes(grievance.status)) {
      return res.status(400).json({ message: "Rejected grievance cannot be updated" });
    }

    if (nextStatus && ["in_progress", "resolved"].includes(nextStatus)) {
      grievance.status = nextStatus;
      await grievance.save();
    }

    const update = await StatusUpdate.create({
      grievance: grievance._id,
      updatedBy: req.user._id,
      message,
      statusSnapshot: grievance.status
    });

    const refreshed = await Grievance.findById(grievance._id).populate(grievancePopulate);
    emitGrievance(req, refreshed, update);
    return res.json({ grievance: refreshed, update });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add status update", error: error.message });
  }
};
