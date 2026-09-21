import { Router } from "express";
import { checkIn, closeSession, createSession, exportLecturerReport, getActiveSessions, getLecturerReport, getStudentProgress } from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { attendanceLimiter } from "../middleware/rateLimiters.js";

const router = Router();
router.get("/sessions", protect, getActiveSessions);
router.get("/progress", protect, allowRoles("student"), getStudentProgress);
router.get("/courses/:courseId/report", protect, allowRoles("lecturer"), getLecturerReport);
router.get("/courses/:courseId/export", protect, allowRoles("lecturer"), exportLecturerReport);
router.post("/sessions", protect, allowRoles("lecturer"), createSession);
router.patch("/sessions/:sessionId/close", protect, allowRoles("lecturer"), closeSession);
router.post("/sessions/:sessionId/check-in", attendanceLimiter, protect, allowRoles("student"), checkIn);
export default router;
