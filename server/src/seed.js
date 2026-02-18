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
    { name: "Computer Science", code: "CSE" },
    { name: "Electronics", code: "ECE" },
    { name: "Civil", code: "CIVIL" }
  ]);

  const [cse, ece] = departments;

  const admin = await User.create({
    name: "College Admin",
    email: "admin@college.edu",
    passwordHash: await bcrypt.hash("Admin@123", 10),
    role: "admin"
  });

  const cseStaff = await User.create({
    name: "CSE Staff",
    email: "staff.cse@college.edu",
    passwordHash: await bcrypt.hash("Staff@123", 10),
    role: "staff",
    department: cse._id
  });

  const eceStaff = await User.create({
    name: "ECE Staff",
    email: "staff.ece@college.edu",
    passwordHash: await bcrypt.hash("Staff@123", 10),
    role: "staff",
    department: ece._id
  });

  await Department.findByIdAndUpdate(cse._id, { $set: { staffMembers: [cseStaff._id] } });
  await Department.findByIdAndUpdate(ece._id, { $set: { staffMembers: [eceStaff._id] } });

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
