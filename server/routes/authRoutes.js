import { Router } from "express";
import { login, logout, signup, verifyEmail } from "../controllers/authController.js";
import { authenticationOptions, registrationOptions, registrationVerify } from "../controllers/passkeyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { revokeUserAccess } from "../controllers/recoveryController.js";

const router = Router();
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.get("/verify-email", verifyEmail);
router.post("/logout", logout);
router.post("/recovery/:userId/revoke", protect, allowRoles("admin"), revokeUserAccess);
router.post("/passkey/register/options", protect, registrationOptions);
router.post("/passkey/register/verify", protect, registrationVerify);
router.post("/passkey/authenticate/options", protect, authenticationOptions);
export default router;
