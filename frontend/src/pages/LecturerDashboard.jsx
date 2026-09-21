import { useEffect, useState } from "react";
import api from "../services/Api";
import QRCode from "qrcode";
import { logout } from "../services/auth";

export default function LecturerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [catalog, setCatalog] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [facultyId, setFacultyId] = useState(user.faculty?._id || user.faculty || "");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseForm, setCourseForm] = useState({ code: "", title: "", units: 3 });
  const [activeSessions, setActiveSessions] = useState([]);
  const [attendanceMode, setAttendanceMode] = useState("code");
  const [qrImages, setQrImages] = useState({});
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([api.get("/courses/catalog"), api.get("/courses/manage"), api.get("/attendance/sessions")])
      .then(async ([catalogResponse, coursesResponse, sessionsResponse]) => {
        setCatalog(catalogResponse.data);
        setMyCourses(coursesResponse.data);
        setActiveSessions(sessionsResponse.data);
        const qrEntries = await Promise.all(sessionsResponse.data.filter((session) => session.accessMode === "qr").map(async (session) => [session._id, await QRCode.toDataURL(JSON.stringify({ sessionId: session._id, accessCode: session.accessCode }))]));
        setQrImages(Object.fromEntries(qrEntries));
      })
      .catch((error) => setMessage(error.response?.data?.message || "Unable to load lecturer data."));
  }, []);

  const faculty = catalog.find((item) => item._id === facultyId);

  async function saveFaculty(event) {
    event.preventDefault();
    try {
      await api.put("/courses/lecturer-faculty", { facultyId });
      const updatedUser = { ...user, faculty: facultyId };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setMessage("Faculty saved. You can now add courses for its departments.");
    } catch (error) { setMessage(error.response?.data?.message || "Unable to save faculty."); }
  }

  async function addCourse(event) {
    event.preventDefault();
    try {
      const response = await api.post("/courses/manage", { ...courseForm, departmentId });
      setMyCourses((current) => [...current, response.data.course]);
      setCourseForm({ code: "", title: "", units: 3 });
      setMessage("Course added. Students can now choose it from this department.");
    } catch (error) { setMessage(error.response?.data?.message || "Unable to add course."); }
  }

  async function startSession(event) {
    event.preventDefault();
    if (!navigator.geolocation) { setMessage("This browser does not support location services."); return; }
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }));
      const response = await api.post("/attendance/sessions", { courseId, accessMode: attendanceMode, latitude: position.coords.latitude, longitude: position.coords.longitude });
      const session = { ...response.data.session, course: myCourses.find((course) => course._id === courseId) };
      setActiveSessions((current) => [...current, session]);
      if (attendanceMode === "qr") {
        const qrImage = await QRCode.toDataURL(JSON.stringify({ sessionId: session._id, accessCode: session.accessCode }));
        setQrImages((current) => ({ ...current, [session._id]: qrImage }));
      }
      setMessage("Class started. Students must be within 3 meters of this location.");
    }
    catch (error) { setMessage(error.response?.data?.message || "Unable to start session."); }
  }

  async function endSession(sessionId) {
    try { await api.patch(`/attendance/sessions/${sessionId}/close`); setActiveSessions((current) => current.filter((session) => session._id !== sessionId)); setMessage("Class ended."); }
    catch (error) { setMessage(error.response?.data?.message || "Unable to end class."); }
  }

  async function loadReport(nextCourseId) {
    setCourseId(nextCourseId);
    if (!nextCourseId) { setReport(null); return; }
    try { setReport((await api.get(`/attendance/courses/${nextCourseId}/report`)).data); }
    catch (error) { setMessage(error.response?.data?.message || "Unable to load attendance sheet."); }
  }

  async function downloadReport() {
    try {
      const response = await api.get(`/attendance/courses/${courseId}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.course.code}-attendance.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { setMessage(error.response?.data?.message || "Unable to export attendance."); }
  }

  return <main className="page"><header className="page-header"><div><p className="eyebrow">Lecturer portal</p><h1>Welcome, {user.name}</h1><p>Choose your faculty, add your courses, and then manage attendance.</p></div><button onClick={async () => { await logout(); window.location.href = "/login"; }}>Log out</button></header>{message && <p className="notice">{message}</p>}
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">Step 1</p><h2>Choose your faculty</h2></div><span className="step">{faculty ? "Selected" : "Required"}</span></div><form className="inline-form" onSubmit={saveFaculty}><select value={facultyId} onChange={(event) => { setFacultyId(event.target.value); setDepartmentId(""); }} required><option value="">Select a faculty</option>{catalog.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select><button className="primary">Save faculty</button></form></section>
    {faculty && <section className="panel"><div className="section-heading"><div><p className="eyebrow">Step 2</p><h2>Add a course for {faculty.name}</h2></div></div><form className="registration-form" onSubmit={addCourse}><label>Department<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required><option value="">Select a department</option>{faculty.departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}</select></label><label>Course code<input value={courseForm.code} onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })} placeholder="CSC 301" required /></label><label>Course title<input value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} placeholder="Database Systems" required /></label><label>Units<input type="number" min="1" max="6" value={courseForm.units} onChange={(event) => setCourseForm({ ...courseForm, units: event.target.value })} required /></label><button className="primary" type="submit">Add course</button></form>{myCourses.length > 0 && <div className="course-list">{myCourses.map((course) => <article className="course-row" key={course._id}><div><strong>{course.code}</strong><p>{course.title}</p><small>{course.department?.name || "Course added"}</small></div></article>)}</div>}</section>}
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">Step 3</p><h2>Start attendance</h2></div></div><form className="inline-form" onSubmit={startSession}><select value={courseId} onChange={(event) => setCourseId(event.target.value)} required><option value="">Choose one of your courses</option>{myCourses.map((course) => <option key={course._id} value={course._id}>{course.code} - {course.title}</option>)}</select><select value={attendanceMode} onChange={(event) => setAttendanceMode(event.target.value)}><option value="code">Six-digit code</option><option value="qr">QR code</option></select><button className="primary">Start class at my location</button></form>{activeSessions.map((session) => <article className="session-card" key={session._id}><div><strong>{session.course?.code || "Course"}</strong><p>Class is active using {session.accessMode === "qr" ? "QR code" : "six-digit code"}.</p><small>3-meter attendance zone. No expiry timer.</small>{session.accessMode === "code" ? <div className="access-code">{session.accessCode}</div> : qrImages[session._id] ? <img className="attendance-qr" src={qrImages[session._id]} alt="Attendance QR code" /> : <p>Preparing QR code...</p>}</div><button onClick={() => endSession(session._id)}>End class</button></article>)}</section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">Attendance spreadsheet</p><h2>{report ? `${report.course.code} attendance` : "Choose a course"}</h2></div>{report && <button onClick={downloadReport}>Download CSV</button>}</div><select value={courseId} onChange={(event) => loadReport(event.target.value)}><option value="">Select a course to view its sheet</option>{myCourses.map((course) => <option key={course._id} value={course._id}>{course.code} - {course.title}</option>)}</select>{report && <div className="table-wrap attendance-sheet"><table><thead><tr><th>Student</th>{report.sessions.map((session) => <th key={session._id}>{new Date(session.startsAt).toLocaleDateString()}</th>)}<th>Present</th><th>Absent</th><th>Rate</th></tr></thead><tbody>{report.students.map((student) => <tr key={student._id}><td><strong>{student.name}</strong><small>{student.matricNumber}</small></td>{student.attendance.map((entry) => <td key={entry.sessionId} className={entry.status === "present" ? "cell-present" : "cell-absent"}>{entry.status === "present" ? "Present" : "Absent"}</td>)}<td>{student.present}</td><td>{student.absent}</td><td><strong>{student.percentage}%</strong></td></tr>)}</tbody></table></div>}{report && report.students.length === 0 && <p>No students have registered for this course yet.</p>}</section></main>;
}