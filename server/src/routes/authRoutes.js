import { Router } from "express";
import {
  bulkAddCollegeIds,
  bulkAddStudentCollegeIdsByStaff,
  createUserByAdmin,
  deleteMyAccount,
  login,
  verifyRegistrationOtp,
  me,
  updateMyProfile,
  register
} from "../controllers/authController.js";
import { allowRoles, authRequired } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/register/verify-otp", verifyRegistrationOtp);
router.post("/login", login);
router.get("/me", authRequired, me);
router.patch("/me", authRequired, updateMyProfile);
router.delete("/me", authRequired, deleteMyAccount);
router.post("/admin/create-user", authRequired, allowRoles("admin"), createUserByAdmin);
router.post("/admin/college-ids/bulk", authRequired, allowRoles("admin"), bulkAddCollegeIds);
router.post("/staff/student-college-ids/bulk", authRequired, allowRoles("staff"), bulkAddStudentCollegeIdsByStaff);

export default router;
