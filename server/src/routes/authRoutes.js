import { Router } from "express";
import { createUserByAdmin, login, me, register } from "../controllers/authController.js";
import { allowRoles, authRequired } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authRequired, me);
router.post("/admin/create-user", authRequired, allowRoles("admin"), createUserByAdmin);

export default router;
