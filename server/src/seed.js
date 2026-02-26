import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import Department from "./models/Department.js";
import User from "./models/User.js";
import CollegeIdentity from "./models/CollegeIdentity.js";
import Grievance from "./models/Grievance.js";
import StatusUpdate from "./models/StatusUpdate.js";

const seed = async () => {
  await connectDB();

  await Promise.all([
    Department.deleteMany({}),
    User.deleteMany({}),
    CollegeIdentity.deleteMany({}),
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

  const identityPool = [
    { collegeId: "ADM-1001", role: "admin", notes: "Seeded main admin" },
    { collegeId: "ADM-1002", role: "admin", notes: "Available for new admin" },
    { collegeId: "ADM-1003", role: "admin", notes: "Available for new admin" },
    { collegeId: "STF-CS-001", role: "staff", notes: "Seeded CS staff" },
    { collegeId: "STF-CS-002", role: "staff", notes: "Available CS staff" },
    { collegeId: "STF-EC-001", role: "staff", notes: "Seeded EC staff" },
    { collegeId: "STF-EC-002", role: "staff", notes: "Available EC staff" },
    { collegeId: "STF-COMMERCE-001", role: "staff", notes: "Seeded Commerce staff" },
    { collegeId: "STF-COMMERCE-002", role: "staff", notes: "Available Commerce staff" },
    { collegeId: "STF-BIOTECH-001", role: "staff", notes: "Seeded BioTech staff" },
    { collegeId: "STF-BIOTECH-002", role: "staff", notes: "Available BioTech staff" },
    { collegeId: "STF-ARTS-001", role: "staff", notes: "Seeded Arts staff" },
    { collegeId: "STF-ARTS-002", role: "staff", notes: "Available Arts staff" },
    { collegeId: "STF-CHEM-001", role: "staff", notes: "Seeded Chemistry staff" },
    { collegeId: "STF-CHEM-002", role: "staff", notes: "Available Chemistry staff" },
    { collegeId: "STU-2026-0001", role: "student", notes: "Seeded student" },
    { collegeId: "STU-2026-0002", role: "student", notes: "Available student" },
    { collegeId: "STU-2026-0003", role: "student", notes: "Available student" }
  ];
  await CollegeIdentity.insertMany(identityPool);

  const admin = await User.create({
    name: "College Admin",
    email: "admin@college.edu",
    collegeId: "ADM-1001",
    phone: "9000000001",
    passwordHash: await bcrypt.hash("Admin@123", 10),
    role: "admin"
  });
  await CollegeIdentity.findOneAndUpdate(
    { collegeId: admin.collegeId, role: "admin" },
    { $set: { isClaimed: true, claimedBy: admin._id, claimedAt: new Date() } }
  );

  const passwordHash = await bcrypt.hash("Staff@123", 10);
  const staffConfigs = [
    { code: "CS", name: "CS Staff", email: "staff.cs@college.edu", collegeId: "STF-CS-001", phone: "9000000101" },
    { code: "EC", name: "EC Staff", email: "staff.ec@college.edu", collegeId: "STF-EC-001", phone: "9000000102" },
    {
      code: "COMMERCE",
      name: "Commerce Staff",
      email: "staff.commerce@college.edu",
      collegeId: "STF-COMMERCE-001",
      phone: "9000000103"
    },
    {
      code: "BIOTECH",
      name: "BioTech Staff",
      email: "staff.biotech@college.edu",
      collegeId: "STF-BIOTECH-001",
      phone: "9000000104"
    },
    { code: "ARTS", name: "Arts Staff", email: "staff.arts@college.edu", collegeId: "STF-ARTS-001", phone: "9000000105" },
    { code: "CHEM", name: "Chemistry Staff", email: "staff.chem@college.edu", collegeId: "STF-CHEM-001", phone: "9000000106" }
  ];

  for (const cfg of staffConfigs) {
    const department = departments.find((d) => d.code === cfg.code);
    if (!department) continue;

    const staff = await User.create({
      name: cfg.name,
      email: cfg.email,
      collegeId: cfg.collegeId,
      phone: cfg.phone,
      passwordHash,
      role: "staff",
      department: department._id
    });
    await CollegeIdentity.findOneAndUpdate(
      { collegeId: cfg.collegeId, role: "staff" },
      { $set: { isClaimed: true, claimedBy: staff._id, claimedAt: new Date() } }
    );

    await Department.findByIdAndUpdate(department._id, { $set: { staffMembers: [staff._id] } });
  }

  const student = await User.create({
    name: "Demo Student",
    email: "student@college.edu",
    collegeId: "STU-2026-0001",
    phone: "9000000201",
    className: "B.Tech CSE",
    batch: "2022-2026",
    passwordHash: await bcrypt.hash("Student@123", 10),
    role: "student"
  });
  await CollegeIdentity.findOneAndUpdate(
    { collegeId: student.collegeId, role: "student" },
    { $set: { isClaimed: true, claimedBy: student._id, claimedAt: new Date() } }
  );

  console.log("Seed complete");
  console.log("Admin:", admin.email, "Admin@123");
  console.log("Student college IDs available for registration: STU-2026-0002, STU-2026-0003");
  console.log("Staff college IDs available for admin creation: STF-CS-002, STF-EC-002, STF-COMMERCE-002...");
  console.log("Admin college IDs available for admin creation: ADM-1002, ADM-1003");
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
