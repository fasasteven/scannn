import { useEffect, useState } from "react";
import api from "../services/Api";
import { authenticatePasskey, registerPasskey } from "../services/passkey";
import { getDeviceId } from "../services/device";
import { logout } from "../services/auth";
import { Html5Qrcode } from "html5-qrcode";

export default function StudentDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [catalog, setCatalog] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseIds, setCourseIds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [progress, setProgress] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [attendanceCode, setAttendanceCode] = useState("");
  const [scanningSessionId, setScanningSessionId] = useState("");
  const [passkeyRegistered, setPasskeyRegistered] = useState(Boolean(user.passkeyRegistered));

  useEffect(() => {
    Promise.all([api.get("/courses/catalog"), api.get("/courses/registration"), api.get("/attendance/sessions"), api.get("/attendance/progress")])
      .then(([catalogResponse, registrationResponse, sessionResponse, progressResponse]) => {
        setCatalog(catalogResponse.data);
        setSessions(sessionResponse.data);
        setProgress(progressResponse.data);
        const saved = registrationResponse.data;
        if (saved.faculty) {
          setRegistration(saved);
          setFacultyId(saved.faculty._id);
          setDepartmentId(saved.department._id);
          setCourseIds(saved.courses.map((course) => course._id));
        }
      })
      .catch((error) => setMessage(error.response?.data?.message || "Unable to load your registration."))
      .finally(() => setLoading(false));
  }, []);

  const faculty = catalog.find((item) => item._id === facultyId);
  const department = faculty?.departments.find((item) => item._id === departmentId);

  async function saveRegistration(event) {
    event.preventDefault();
    try {
      const response = await api.put("/courses/registration", { facultyId, departmentId, courseIds });
      setRegistration(response.data.registration);
      setMessage("Registration saved. You can edit it here whenever your courses change.");
    } catch (error) { setMessage(error.response?.data?.message || "Unable to save registration."); }
  }

  function progressColor(percentage) {
    if (percentage >= 75) return "progress-good";
    if (percentage >= 50) return "progress-warn";
    return "progress-low";
  }

  async function checkIn(sessionId, code = attendanceCode, qrPayload = "") {
    if (!navigator.geolocation) { setMessage("This browser does not support location services."); return; }
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }));
      if (!passkeyRegistered) { setMessage("Register a passkey on this device before checking in."); return; }
      setMessage("Confirm your passkey to complete attendance.");
      const passkeyResponse = await authenticatePasskey();
      const response = await api.post(`/attendance/sessions/${sessionId}/check-in`, { attendanceCode: code, qrPayload, passkeyResponse, deviceId: getDeviceId(), latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
      setSessions((current) => current.filter((session) => session._id !== sessionId));
      setMessage(response.data.message);
      const progressResponse = await api.get("/attendance/progress");
      setProgress(progressResponse.data);
    }
    catch (error) { setMessage(error.response?.data?.message || "Unable to record attendance."); }
  }

  async function setupPasskey() {
  try {
    setMessage("Your browser will ask for Windows Hello, a fingerprint, a PIN, or a security key.");
    await registerPasskey();
    setPasskeyRegistered(true);
    const updatedUser = { ...user, passkeyRegistered: true };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setMessage("Passkey registered on this device.");
  } catch (error) { setMessage(error.response?.data?.message || error.message || "Unable to register a passkey."); }
  }

  async function scanQr(sessionId) {
    setScanningSessionId(sessionId);
    const scanner = new Html5Qrcode(`attendance-reader-${sessionId}`);
    try {
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, async (decodedText) => {
        await scanner.stop();
        setScanningSessionId("");
        await checkIn(sessionId, "", decodedText);
      }, () => {});
    } catch (error) {
      setScanningSessionId("");
      setMessage(error.message || "Unable to open the camera.");
    }
  }

  if (loading) return <main className="page"><p>Loading your student space...</p></main>;
  return <main className="page">
    <header className="page-header"><div><p className="eyebrow">Student portal</p><h1>Welcome, {user.name}</h1><p>Choose your academic path once, then keep your courses current here.</p></div><button onClick={async () => { await logout(); window.location.href = "/login"; }}>Log out</button></header>
    {message && <p className="notice">{message}</p>}
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">Device security</p><h2>{passkeyRegistered ? "Passkey ready" : "Register this device"}</h2><p>{passkeyRegistered ? "Attendance will require this device passkey." : "Use Windows Hello, your laptop PIN, fingerprint, phone, or a security key."}</p></div>{!passkeyRegistered && <button className="primary" onClick={setupPasskey}>Register passkey</button>}</div></section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">Academic registration</p><h2>{registration ? "Your registration" : "Start your registration"}</h2></div><span className="step">{registration ? "Editable" : "Step 1 of 3"}</span></div>
      <form onSubmit={saveRegistration} className="registration-form">
        <label>Faculty<select value={facultyId} onChange={(event) => { setFacultyId(event.target.value); setDepartmentId(""); setCourseIds([]); }} required><option value="">Select a faculty</option>{catalog.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
        <label>Department<select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setCourseIds([]); }} disabled={!faculty} required><option value="">Select a department</option>{faculty?.departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
        {department && <fieldset><legend>Courses in {department.name}</legend>{department.courses.map((course) => <label className="course-choice" key={course._id}><input type="checkbox" checked={courseIds.includes(course._id)} onChange={() => setCourseIds((current) => current.includes(course._id) ? current.filter((id) => id !== course._id) : [...current, course._id])} /><span><strong>{course.code}</strong> {course.title}<small>{course.units} units</small></span></label>)}</fieldset>}
        <button className="primary" type="submit" disabled={!department || courseIds.length === 0}>Save courses</button>
      </form>
    </section>
    {registration && <section className="panel"><div className="section-heading"><div><p className="eyebrow">Attendance</p><h2>Your registered courses</h2></div></div><div className="course-list">{registration.courses.map((course) => <article className="course-row" key={course._id}><div><strong>{course.code}</strong><p>{course.title}</p></div><span>{sessions.filter((session) => session.course._id === course._id).map((session) => session.accessMode === "code" ? <span className="attendance-entry" key={session._id}><input value={attendanceCode} onChange={(event) => setAttendanceCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit code" /><button className="attendance" disabled={attendanceCode.length !== 6 || !passkeyRegistered} onClick={() => checkIn(session._id)}>Use passkey and location</button></span> : <span key={session._id}><button className="attendance" disabled={!passkeyRegistered} onClick={() => scanQr(session._id)}>Scan class QR</button>{scanningSessionId === session._id && <div id={`attendance-reader-${session._id}`} className="qr-reader" />}</span>)}</span></article>)}</div>{sessions.filter((session) => registration.courses.some((course) => course._id === session.course._id)).length === 0 && <p>No active classes for your courses right now.</p>}</section>}
    {registration && <section className="panel"><div className="section-heading"><div><p className="eyebrow">Your progress</p><h2>Attendance by course</h2></div></div><div className="progress-grid">{progress.map((course) => <article className="progress-card" key={course._id}><div className="course-row"><div><strong>{course.code}</strong><p>{course.title}</p></div><strong className={progressColor(course.percentage)}>{course.percentage}%</strong></div><div className="progress-track"><span className={progressColor(course.percentage)} style={{ width: `${course.percentage}%` }} /></div><p>{course.present} present of {course.totalSessions} completed session{course.totalSessions === 1 ? "" : "s"} <span className="muted">({course.absent} absent)</span></p></article>)}</div>{progress.length === 0 && <p>No attendance progress is available yet.</p>}</section>}
  </main>;
}