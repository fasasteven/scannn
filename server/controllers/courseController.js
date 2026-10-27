import Faculty from "../models/Faculty.js";
import Department from "../models/Department.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import AttendanceRecord from "../models/AttendanceRecord.js";

const defaultCatalog = [
	{
		name: "Faculty of Science",
		departments: [
			{ name: "Computer Science", courses: [["CSC101", "Introduction to Computing"], ["CSC201", "Programming Fundamentals"], ["CSC301", "Database Systems"]] },
			{ name: "Biochemistry", courses: [["BCH101", "General Biochemistry"], ["BCH201", "Cell Biology"]] },
		],
	},
	{
		name: "Faculty of Engineering",
		departments: [
			{ name: "Electrical Engineering", courses: [["EEE101", "Circuit Analysis"], ["EEE201", "Electrical Machines"]] },
			{ name: "Civil Engineering", courses: [["CVE101", "Engineering Drawing"], ["CVE201", "Structural Analysis"]] },
		],
	},
	{
		name: "Faculty of Arts",
		departments: [
			{ name: "English", courses: [["ENG101", "Introduction to Literature"], ["ENG201", "Academic Writing"]] },
			{ name: "History", courses: [["HIS101", "Nigerian History"], ["HIS201", "African History"]] },
		],
	},
	{
		name: "Faculty of Social Sciences",
		departments: [
			{ name: "Economics", courses: [["ECO101", "Introduction to Economics"], ["ECO201", "Microeconomics"]] },
			{ name: "Mass Communication", courses: [["MCM101", "Introduction to Mass Communication"], ["MCM201", "Media Writing"]] },
		],
	},
	{
		name: "Faculty of Management Sciences",
		departments: [
			{ name: "Accounting", courses: [["ACC101", "Financial Accounting"], ["ACC201", "Cost Accounting"]] },
			{ name: "Business Administration", courses: [["BUS101", "Business Management"], ["BUS201", "Marketing Principles"]] },
		],
	},
];

let catalogSeedPromise;

async function seedDefaultCatalog() {
	const faculties = await Promise.all(defaultCatalog.map(({ name }) => Faculty.findOneAndUpdate(
		{ name },
		{ $setOnInsert: { name } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)));
	const departmentOps = defaultCatalog.flatMap((facultyData, index) => facultyData.departments.map((department) => ({
		updateOne: {
			filter: { faculty: faculties[index]._id, name: department.name },
			update: { $setOnInsert: { faculty: faculties[index]._id, name: department.name } },
			upsert: true,
		},
	})));
	await Department.bulkWrite(departmentOps);
	const departments = await Department.find({ faculty: { $in: faculties.map((faculty) => faculty._id) } }).lean();
	const departmentByKey = new Map(departments.map((department) => [`${department.faculty}:${department.name}`, department]));
	const facultyOps = defaultCatalog.map((facultyData, index) => ({
		updateOne: {
			filter: { _id: faculties[index]._id },
			update: { $addToSet: { departments: { $each: facultyData.departments.map((department) => departmentByKey.get(`${faculties[index]._id}:${department.name}`)._id) } } },
		},
	}));
	await Faculty.bulkWrite(facultyOps);
	const courseOps = defaultCatalog.flatMap((facultyData, index) => facultyData.departments.flatMap((department) => {
		const departmentId = departmentByKey.get(`${faculties[index]._id}:${department.name}`)._id;
		return department.courses.map(([code, title]) => ({
			updateOne: {
				filter: { code, department: departmentId },
				update: { $setOnInsert: { code, title, department: departmentId } },
				upsert: true,
			},
		}));
	}));
	await Course.bulkWrite(courseOps);
}

function ensureCatalog() {
	if (!catalogSeedPromise) {
		catalogSeedPromise = seedDefaultCatalog().catch((error) => {
			catalogSeedPromise = undefined;
			throw error;
		});
	}
	return catalogSeedPromise;
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

export async function registerCatalogCourse(req, res, next) {
	try {
		if (!req.user.faculty) return res.status(400).json({ message: "Select your faculty before registering a course." });
		const availableCourse = await Course.findOne({
			_id: req.body.courseId,
			active: true,
			$or: [{ lecturer: { $exists: false } }, { lecturer: null }],
		}).populate("department", "name");
		if (!availableCourse) return res.status(409).json({ message: "That course is no longer available. Refresh and choose another course." });
		const department = await Department.findOne({ _id: availableCourse.department._id, faculty: req.user.faculty, active: true });
		if (!department) return res.status(400).json({ message: "Choose a listed course from your faculty." });
		const registration = await Course.updateOne(
			{ _id: availableCourse._id, active: true, $or: [{ lecturer: { $exists: false } }, { lecturer: null }] },
			{ $set: { lecturer: req.user._id } },
		);
		if (!registration.modifiedCount) return res.status(409).json({ message: "That course is no longer available. Refresh and choose another course." });
		const course = await Course.findById(availableCourse._id).populate("department", "name");
		res.status(200).json({ course });
	} catch (error) { next(error); }
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
