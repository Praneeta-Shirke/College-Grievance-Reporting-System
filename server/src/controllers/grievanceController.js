import Department from "../models/Department.js";
import Grievance from "../models/Grievance.js";
import StatusUpdate from "../models/StatusUpdate.js";

const grievancePopulate = [
  { path: "department", select: "name code" },
  { path: "createdBy", select: "name email" },
  { path: "assignedStaff", select: "name email" }
];

const parseAnonymousFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "on" || v === "yes";
  }
  return false;
};

const maskAnonymousGrievance = (grievance) => {
  if (!grievance) return grievance;
  const payload = typeof grievance.toObject === "function" ? grievance.toObject() : { ...grievance };
  // Privacy-first fallback: legacy records may not have this field persisted.
  if (payload.isAnonymous === false) return payload;

  const creatorId = payload.createdBy?._id?.toString?.() || payload.createdBy?.toString?.();
  if (payload.createdBy && typeof payload.createdBy === "object") {
    payload.createdBy.name = "Anonymous Student";
    if (payload.createdBy.email) payload.createdBy.email = "hidden@anonymous.local";
  }

  if (Array.isArray(payload.updates)) {
    payload.updates = payload.updates.map((u) => {
      const next = { ...u };
      const updaterId = next.updatedBy?._id?.toString?.() || next.updatedBy?.toString?.();
      if (creatorId && updaterId && creatorId === updaterId && next.updatedBy && typeof next.updatedBy === "object") {
        next.updatedBy = { ...next.updatedBy, name: "Anonymous Student" };
      }
      return next;
    });
  }

  return payload;
};

const emitGrievance = (req, grievance, update = null) => {
  const io = req.app.get("io");
  io.to(`grievance:${grievance._id.toString()}`).emit("grievance:updated", {
    grievance: maskAnonymousGrievance(grievance),
    update
  });
};

export const createGrievance = async (req, res) => {
  try {
    const { description, location, departmentId, isAnonymous, priority } = req.body;
    if (!description || !location || !departmentId) {
      return res.status(400).json({ message: "description, location and departmentId are required" });
    }
    if (!["P1", "P2", "P3"].includes(priority)) {
      return res.status(400).json({ message: "priority is required and must be one of: P1, P2, P3" });
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
      location,
      priorityRequested: priority,
      department: department._id,
      createdBy: req.user._id,
      assignedStaff: assignedStaff._id,
      imageUrl: `/uploads/${req.file.filename}`,
      isAnonymous: parseAnonymousFlag(isAnonymous),
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
    return res.status(201).json(maskAnonymousGrievance(payload));
  } catch (error) {
    return res.status(500).json({ message: "Failed to create grievance", error: error.message });
  }
};

export const validateUrgency = async (req, res) => {
  try {
    const { validatedPriority, remarks = "" } = req.body;
    if (!["P1", "P2", "P3"].includes(validatedPriority)) {
      return res.status(400).json({ message: "validatedPriority must be one of: P1, P2, P3" });
    }

    const grievance = await Grievance.findById(req.params.id).populate(grievancePopulate);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    grievance.urgencyValidation = {
      status: "validated",
      validatedPriority,
      remarks,
      validatedBy: req.user._id,
      validatedAt: new Date()
    };
    await grievance.save();

    const update = await StatusUpdate.create({
      grievance: grievance._id,
      updatedBy: req.user._id,
      message: `Committee validated urgency as ${validatedPriority}${remarks ? ` (${remarks})` : ""}`,
      statusSnapshot: grievance.status
    });

    const refreshed = await Grievance.findById(grievance._id).populate(grievancePopulate);
    emitGrievance(req, refreshed, update);
    return res.json(maskAnonymousGrievance(refreshed));
  } catch (error) {
    return res.status(500).json({ message: "Failed to validate urgency", error: error.message });
  }
};

export const getGrievances = async (req, res) => {
  try {
    const query = {};
    const isStudentAllScope = req.user.role === "student" && req.query.scope === "all";
    const isStaffAllScope = req.user.role === "staff" && req.query.scope === "all";
    if (req.user.role === "student" && !isStudentAllScope) query.createdBy = req.user._id;
    if (req.user.role === "staff" && !isStaffAllScope) query.department = req.user.department?._id;

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

    const payload = grievances
      .map((g) => ({ ...g, updates: updatesByGrievance[g._id.toString()] || [] }))
      .map(maskAnonymousGrievance);
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
    return res.json(maskAnonymousGrievance(refreshed));
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
    if (grievance.status !== "committee_review") {
      return res.status(400).json({ message: "Only committee_review grievances can be approved/rejected" });
    }

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
    return res.json(maskAnonymousGrievance(refreshed));
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
    if (["rejected", "dismissed", "dismissal_requested"].includes(grievance.status)) {
      return res.status(400).json({ message: "Current grievance state cannot be updated by staff" });
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
    return res.json({ grievance: maskAnonymousGrievance(refreshed), update });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add status update", error: error.message });
  }
};

export const requestDismissal = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: "reason is required" });

    const grievance = await Grievance.findById(req.params.id).populate(grievancePopulate);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    const staffDepartmentId = req.user.department?._id?.toString();
    if (req.user.role !== "staff" || grievance.department._id.toString() !== staffDepartmentId) {
      return res.status(403).json({ message: "Only mapped staff can request dismissal" });
    }

    if (!["submitted", "approved", "in_progress"].includes(grievance.status)) {
      return res
        .status(400)
        .json({ message: "Dismissal can be requested only for submitted/approved/in_progress grievances" });
    }

    grievance.dismissalRequest = {
      decision: "pending",
      reason,
      requestedBy: req.user._id,
      requestedAt: new Date(),
      requestedFromStatus: grievance.status
    };
    grievance.status = "dismissal_requested";
    await grievance.save();

    const update = await StatusUpdate.create({
      grievance: grievance._id,
      updatedBy: req.user._id,
      message: `Staff requested grievance dismissal: ${reason}`,
      statusSnapshot: "dismissal_requested"
    });

    const refreshed = await Grievance.findById(grievance._id).populate(grievancePopulate);
    emitGrievance(req, refreshed, update);
    return res.json(maskAnonymousGrievance(refreshed));
  } catch (error) {
    return res.status(500).json({ message: "Failed to request dismissal", error: error.message });
  }
};

export const reviewDismissalRequest = async (req, res) => {
  try {
    const { decision, remarks = "" } = req.body;
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "decision must be approved or rejected" });
    }

    const grievance = await Grievance.findById(req.params.id).populate(grievancePopulate);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    if (grievance.status !== "dismissal_requested" || grievance.dismissalRequest?.decision !== "pending") {
      return res.status(400).json({ message: "No pending dismissal request found for this grievance" });
    }

    const previousStatus = grievance.dismissalRequest?.requestedFromStatus || "approved";
    grievance.dismissalRequest.decision = decision;
    grievance.dismissalRequest.adminRemarks = remarks;
    grievance.dismissalRequest.reviewedBy = req.user._id;
    grievance.dismissalRequest.reviewedAt = new Date();
    grievance.status = decision === "approved" ? "dismissed" : previousStatus;
    await grievance.save();

    const update = await StatusUpdate.create({
      grievance: grievance._id,
      updatedBy: req.user._id,
      message:
        decision === "approved"
          ? "Committee approved dismissal request. Grievance dismissed."
          : "Committee rejected dismissal request. Grievance returned to previous state.",
      statusSnapshot: grievance.status
    });

    const refreshed = await Grievance.findById(grievance._id).populate(grievancePopulate);
    emitGrievance(req, refreshed, update);
    return res.json(maskAnonymousGrievance(refreshed));
  } catch (error) {
    return res.status(500).json({ message: "Failed to review dismissal request", error: error.message });
  }
};

export const deleteGrievance = async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id).populate(grievancePopulate);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    const isAdmin = req.user.role === "admin";
    const isOwnerStudent =
      req.user.role === "student" && grievance.createdBy?._id?.toString() === req.user._id.toString();

    if (!isAdmin && !isOwnerStudent) {
      return res.status(403).json({ message: "You are not allowed to delete this grievance" });
    }

    await StatusUpdate.deleteMany({ grievance: grievance._id });
    await Grievance.findByIdAndDelete(grievance._id);

    const io = req.app.get("io");
    io.to(`grievance:${grievance._id.toString()}`).emit("grievance:deleted", {
      grievanceId: grievance._id.toString()
    });

    return res.json({ message: "Grievance deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete grievance", error: error.message });
  }
};
