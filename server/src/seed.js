import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import Department from "./models/Department.js";
import User from "./models/User.js";
import Grievance from "./models/Grievance.js";
import StatusUpdate from "./models/StatusUpdate.js";

const seed = async () => {
  await connectDB();

  await Promise.all([
    Department.deleteMany({}),
    User.deleteMany({}),
    Grievance.deleteMany({}),
    StatusUpdate.deleteMany({})
  ]);

  const departments = await Department.insertMany([
    { name: "Computer Science", code: "CS" },
    { name: "Electronics", code: "EC" },
    { name: "Commerce", code: "Commerce" },
    { name: "BioTech", code: "BioTech" },
    { name: "Arts", code: "Arts" },
    { name: "Chemistry", code: "Chem" }
  ]);

  const admin = await User.create({
    name: "College Admin",
    email: "admin@college.edu",
    passwordHash: await bcrypt.hash("Admin@123", 10),
    role: "admin"
  });

  const passwordHash = await bcrypt.hash("Staff@123", 10);
  const staffConfigs = [
    { code: "CS", name: "CS Staff", email: "staff.cs@college.edu" },
    { code: "EC", name: "EC Staff", email: "staff.ec@college.edu" },
    { code: "COMMERCE", name: "Commerce Staff", email: "staff.commerce@college.edu" },
    { code: "BIOTECH", name: "BioTech Staff", email: "staff.biotech@college.edu" },
    { code: "ARTS", name: "Arts Staff", email: "staff.arts@college.edu" },
    { code: "CHEM", name: "Chemistry Staff", email: "staff.chem@college.edu" }
  ];

  for (const cfg of staffConfigs) {
    const department = departments.find((d) => d.code === cfg.code);
    if (!department) continue;

    const staff = await User.create({
      name: cfg.name,
      email: cfg.email,
      passwordHash,
      role: "staff",
      department: department._id
    });

    await Department.findByIdAndUpdate(department._id, { $set: { staffMembers: [staff._id] } });
  }

  await User.create({
    name: "Demo Student",
    email: "student@college.edu",
    passwordHash: await bcrypt.hash("Student@123", 10),
    role: "student"
  });

  console.log("Seed complete");
  console.log("Admin:", admin.email, "Admin@123");
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
