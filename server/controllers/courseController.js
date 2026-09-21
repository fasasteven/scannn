import Faculty from "../models/Faculty.js";
import Department from "../models/Department.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import AttendanceRecord from "../models/AttendanceRecord.js";

const defaultCatalog = [
	["Faculty of Science", ["Computer Science", "Biochemistry"]],
	["Faculty of Engineering", ["Electrical Engineering", "Civil Engineering"]],
	["Faculty of Arts", ["English", "History"]],
	["Faculty of Social Sciences", ["Economics", "Mass Communication"]],
	["Faculty of Management Sciences", ["Accounting", "Business Administration"]],
];

async function ensureCatalog() {
	if (await Faculty.exists()) return;
	for (const [facultyName, departmentNames] of defaultCatalog) {
		const faculty = await Faculty.create({ name: facultyName });
		const departments = await Department.insertMany(departmentNames.map((name) => ({ name, faculty: faculty._id })));
		faculty.departments = departments.map((department) => department._id);
		await faculty.save();
		await Course.insertMany(departments.flatMap((department, index) => [
			{ code: `${facultyName.slice(8, 11).toUpperCase()}${index + 101}`, title: `${department.name} Fundamentals`, department: department._id },
			{ code: `${facultyName.slice(8, 11).toUpperCase()}${index + 201}`, title: `${department.name} Research Methods`, department: department._id },
		]));
	}
}

export async function getCatalog(req, res, next) {
	try {
		await ensureCatalog();
		const faculties = await Faculty.find({ active: true }).lean();
		const departments = await Department.find({ active: true }).lean();
		const courseFilter = req.user.role === "student" ? { active: true, lecturer: { $ne: null } } : { active: true };
		const courses = await Course.find(courseFilter).lean();
		const coursesByDepartment = courses.reduce((result, course) => ({ ...result, [course.department.toString()]: [...(result[course.department.toString()] || []), course] }), {});
		res.json(faculties.map((faculty) => ({ ...faculty, departments: departments.filter((department) => department.faculty.toString() === faculty._id.toString()).map((department) => ({ ...department, courses: coursesByDepartment[department._id.toString()] || [] })) })));
	} catch (error) { next(error); }
}

export async function saveLecturerFaculty(req, res, next) {
	try {
		const faculty = await Faculty.findOne({ _id: req.body.facultyId, active: true });
		if (!faculty) return res.status(400).json({ message: "Choose a valid faculty." });
		const user = await User.findByIdAndUpdate(req.user._id, { faculty: faculty._id }, { new: true }).populate("faculty");
		res.json({ faculty: user.faculty });
	} catch (error) { next(error); }
}

export async function createCourse(req, res, next) {
	try {
		if (!req.user.faculty) return res.status(400).json({ message: "Select your faculty before adding courses." });
		const department = await Department.findOne({ _id: req.body.departmentId, faculty: req.user.faculty, active: true });
		if (!department) return res.status(400).json({ message: "Choose a department in your faculty." });
		const course = await Course.create({
			code: req.body.code,
			title: req.body.title,
			units: req.body.units || 3,
			department: department._id,
			lecturer: req.user._id,
		});
		res.status(201).json({ course });
	} catch (error) {
		if (error.code === 11000) return res.status(409).json({ message: "That course code already exists in this department." });
		next(error);
	}
}

export async function getLecturerCourses(req, res, next) {
	try {
		const courses = await Course.find({ lecturer: req.user._id, active: true }).populate("department", "name").lean();
		res.json(courses);
	} catch (error) { next(error); }
}

export async function getRegistration(req, res, next) {
	try {
		const user = await User.findById(req.user._id).populate("faculty department registeredCourses");
		res.json({ faculty: user.faculty, department: user.department, courses: user.registeredCourses });
	} catch (error) { next(error); }
}

export async function saveRegistration(req, res, next) {
	try {
		const { facultyId, departmentId, courseIds = [] } = req.body;
		const department = await Department.findOne({ _id: departmentId, faculty: facultyId, active: true });
		if (!department) return res.status(400).json({ message: "Choose a valid faculty and department." });
		const courses = await Course.find({ _id: { $in: courseIds }, department: departmentId, active: true });
		if (courses.length !== courseIds.length || courses.length === 0) return res.status(400).json({ message: "Choose at least one valid course from this department." });
		const user = await User.findByIdAndUpdate(req.user._id, { faculty: facultyId, department: departmentId, registeredCourses: courseIds }, { new: true }).populate("faculty department registeredCourses");
		res.json({ message: "Registration saved.", registration: { faculty: user.faculty, department: user.department, courses: user.registeredCourses } });
	} catch (error) { next(error); }
}

export async function getEnrollments(req, res, next) {
	try {
		const lecturerCourses = await Course.find({ lecturer: req.user._id, active: true }).distinct("_id");
		const students = await User.find({ role: "student", registeredCourses: { $in: lecturerCourses } }).select("name email matricNumber faculty department registeredCourses").populate("faculty department registeredCourses").lean();
		const records = await AttendanceRecord.find().select("student course status recordedAt").lean();
		res.json(students.map((student) => ({ ...student, attendance: records.filter((record) => record.student.toString() === student._id.toString()) })));
	} catch (error) { next(error); }
}
