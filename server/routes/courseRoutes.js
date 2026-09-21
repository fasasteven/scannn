import { Router } from "express";
import { createCourse, getCatalog, getEnrollments, getLecturerCourses, getRegistration, saveLecturerFaculty, saveRegistration } from "../controllers/courseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = Router();
router.get("/catalog", protect, getCatalog);
router.put("/lecturer-faculty", protect, allowRoles("lecturer"), saveLecturerFaculty);
router.post("/manage", protect, allowRoles("lecturer"), createCourse);
router.get("/manage", protect, allowRoles("lecturer"), getLecturerCourses);
router.get("/registration", protect, allowRoles("student"), getRegistration);
router.put("/registration", protect, allowRoles("student"), saveRegistration);
router.get("/enrollments", protect, allowRoles("lecturer"), getEnrollments);
export default router;
