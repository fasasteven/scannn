import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { calculateDistanceMeters } from "../utils/calculateDistance.js";
import { verifyPasskey } from "./passkeyController.js";
import { randomInt } from "crypto";

function validCoordinate(value, minimum, maximum) {
	return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function createAccessCode() {
	return String(randomInt(100000, 1000000));
}

export async function createSession(req, res, next) {
	try {
		const course = await Course.findOne({ _id: req.body.courseId, lecturer: req.user._id, active: true });
		if (!course) return res.status(404).json({ message: "That course does not belong to you." });
		const existingSession = await AttendanceSession.exists({ course: course._id, lecturer: req.user._id, active: true });
		if (existingSession) return res.status(409).json({ message: "This course already has an active class. End it before starting another." });
		const { latitude, longitude } = req.body;
		if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) return res.status(400).json({ message: "A valid class location is required." });
		const accessMode = req.body.accessMode;
		if (!["code", "qr"].includes(accessMode)) return res.status(400).json({ message: "Choose either attendance code or QR mode." });
		const session = await AttendanceSession.create({ course: course._id, lecturer: req.user._id, accessMode, accessCode: createAccessCode(), location: { latitude, longitude, radiusMeters: 3 } });
		res.status(201).json({ session: { ...session.toObject(), accessCode: session.accessCode } });
	} catch (error) { next(error); }
}

export async function getActiveSessions(req, res, next) {
	try {
		const filter = req.user.role === "lecturer" ? { active: true, lecturer: req.user._id } : { active: true };
		const query = AttendanceSession.find(filter).populate("course", "code title");
		if (req.user.role === "lecturer") query.select("+accessCode");
		const sessions = await query.lean();
		res.json(sessions);
	} catch (error) { next(error); }
}

export async function checkIn(req, res, next) {
	try {
		const session = await AttendanceSession.findOne({ _id: req.params.sessionId, active: true }).select("+accessCode");
		if (!session) return res.status(404).json({ message: "This attendance class has ended or does not exist." });
		let submittedCode = req.body.attendanceCode?.trim();
		if (req.body.qrPayload) {
			if (session.accessMode !== "qr") return res.status(400).json({ message: "This class requires the six-digit attendance code." });
			try {
				const payload = JSON.parse(req.body.qrPayload);
				if (payload.sessionId !== session._id.toString() || typeof payload.accessCode !== "string") return res.status(400).json({ message: "This QR code is not valid for the selected class." });
				submittedCode = payload.accessCode;
			} catch { return res.status(400).json({ message: "Invalid QR attendance data." }); }
		}
		if (submittedCode !== session.accessCode) return res.status(403).json({ message: "That attendance code is incorrect." });
		if (!req.body.passkeyResponse) return res.status(400).json({ message: "Passkey verification is required for attendance." });
		await verifyPasskey(req.user._id, req.body.passkeyResponse);
		const enrolled = req.user.registeredCourses?.some((courseId) => courseId.toString() === session.course.toString());
		if (!enrolled) return res.status(403).json({ message: "You are not enrolled in this course." });
		const { latitude, longitude, accuracy } = req.body;
		if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) return res.status(400).json({ message: "Your current location is required." });
		if (!Number.isFinite(accuracy) || accuracy > 3) return res.status(400).json({ message: "Your location accuracy must be 3 meters or better." });
		const distance = calculateDistanceMeters(session.location, { latitude, longitude });
		if (distance > session.location.radiusMeters) return res.status(403).json({ message: `You are ${Math.round(distance)} meters away. Move within 3 meters of the class location.` });
		const accessMethod = req.body.qrPayload ? "qr" : "code";
		const record = await AttendanceRecord.create({
			session: session._id,
			course: session.course,
			student: req.user._id,
			studentLatitude: latitude,
			studentLongitude: longitude,
			locationAccuracy: accuracy,
			distanceMeters: distance,
			accessMethod,
			authenticationMethod: "passkey",
			deviceId: req.body.deviceId,
		});
		res.status(201).json({ message: "Attendance recorded.", record });
	} catch (error) {
		if (error.code === 11000) return res.status(409).json({ message: "Attendance already recorded for this session." });
		if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
		next(error);
	}
}

export async function closeSession(req, res, next) {
	try {
		const session = await AttendanceSession.findOneAndUpdate({ _id: req.params.sessionId, lecturer: req.user._id }, { active: false, endsAt: new Date() }, { new: true });
		if (!session) return res.status(404).json({ message: "Attendance session not found." });
		res.json({ session });
	} catch (error) { next(error); }
}

export async function getStudentProgress(req, res, next) {
	try {
		const courseIds = req.user.registeredCourses || [];
		const courses = await Course.find({ _id: { $in: courseIds }, active: true }).select("code title units").lean();
		const sessions = await AttendanceSession.find({ course: { $in: courseIds }, active: false }).sort({ startsAt: 1 }).lean();
		const records = await AttendanceRecord.find({ student: req.user._id, course: { $in: courseIds } }).select("session course status recordedAt").lean();
		const progress = courses.map((course) => {
			const courseSessions = sessions.filter((session) => session.course.toString() === course._id.toString());
			const courseRecords = records.filter((record) => record.course.toString() === course._id.toString());
			const present = courseRecords.filter((record) => record.status === "present").length;
			return {
				...course,
				totalSessions: courseSessions.length,
				present,
				absent: Math.max(courseSessions.length - present, 0),
				percentage: courseSessions.length ? Math.round((present / courseSessions.length) * 100) : 0,
				sessions: courseSessions.map((session) => ({ id: session._id, date: session.startsAt, status: courseRecords.some((record) => record.session.toString() === session._id.toString() && record.status === "present") ? "present" : "absent" })),
			};
		});
		res.json(progress);
	} catch (error) { next(error); }
}

export async function getLecturerReport(req, res, next) {
	try {
		const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id, active: true }).select("code title").lean();
		if (!course) return res.status(404).json({ message: "Course not found or not owned by you." });
		const sessions = await AttendanceSession.find({ course: course._id, active: false }).sort({ startsAt: 1 }).select("startsAt endsAt").lean();
		const students = await User.find({ role: "student", registeredCourses: course._id }).select("name matricNumber email").sort({ name: 1 }).lean();
		const records = await AttendanceRecord.find({ course: course._id, session: { $in: sessions.map((session) => session._id) } }).select("student session status recordedAt").lean();
		const rows = students.map((student) => {
			const studentRecords = records.filter((record) => record.student.toString() === student._id.toString());
			const present = studentRecords.filter((record) => record.status === "present").length;
			return {
				...student,
				attendance: sessions.map((session) => ({ sessionId: session._id, status: studentRecords.some((record) => record.session.toString() === session._id.toString() && record.status === "present") ? "present" : "absent" })),
				present,
				absent: sessions.length - present,
				percentage: sessions.length ? Math.round((present / sessions.length) * 100) : 0,
			};
		});
		res.json({ course, sessions, students: rows });
	} catch (error) { next(error); }
}

function csvCell(value) {
	const text = value === null || value === undefined ? "" : String(value);
	return `"${text.replaceAll('"', '""')}"`;
}

export async function exportLecturerReport(req, res, next) {
	try {
		const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id, active: true }).select("code title").lean();
		if (!course) return res.status(404).json({ message: "Course not found or not owned by you." });
		const sessions = await AttendanceSession.find({ course: course._id, active: false }).sort({ startsAt: 1 }).select("_id startsAt").lean();
		const students = await User.find({ role: "student", registeredCourses: course._id }).select("name matricNumber email").sort({ name: 1 }).lean();
		const records = await AttendanceRecord.find({ course: course._id, session: { $in: sessions.map((session) => session._id) } }).lean();
		const headers = ["Student", "Matric Number", "Email", ...sessions.map((session) => new Date(session.startsAt).toISOString()), "Present", "Absent", "Percentage"];
		const rows = students.map((student) => {
			const studentRecords = records.filter((record) => record.student.toString() === student._id.toString());
			const present = studentRecords.filter((record) => record.status === "present").length;
			const cells = sessions.map((session) => {
				const record = studentRecords.find((item) => item.session.toString() === session._id.toString());
				return record ? `Present (${record.accessMethod || "unknown"}, ${record.authenticationMethod || "unknown"}, ${Number(record.distanceMeters || 0).toFixed(2)}m, accuracy ${record.locationAccuracy ?? "unknown"}m)` : "Absent";
			});
			const percentage = sessions.length ? Math.round((present / sessions.length) * 100) : 0;
			return [student.name, student.matricNumber, student.email, ...cells, present, sessions.length - present, `${percentage}%`];
		});
		const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
		res.setHeader("Content-Type", "text/csv; charset=utf-8");
		res.setHeader("Content-Disposition", `attachment; filename="${course.code}-attendance.csv"`);
		res.send(csv);
	} catch (error) { next(error); }
}
