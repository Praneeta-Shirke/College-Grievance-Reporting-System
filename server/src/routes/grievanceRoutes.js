import { Router } from "express";
import {
  addStatusUpdate,
  adminApproval,
  createGrievance,
  getGrievances,
  notifyAdmin
} from "../controllers/grievanceController.js";
import { allowRoles, authRequired } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", authRequired, getGrievances);
router.post("/", authRequired, allowRoles("student"), upload.single("image"), createGrievance);
router.patch("/:id/notify-admin", authRequired, allowRoles("staff"), notifyAdmin);
router.patch("/:id/admin-approval", authRequired, allowRoles("admin"), adminApproval);
router.post("/:id/updates", authRequired, allowRoles("staff"), addStatusUpdate);

export default router;
