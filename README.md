# QR Attendance Management System

A MERN-stack web application that records school attendance through short-lived QR codes. Lecturers create attendance sessions for their courses, while enrolled students scan the QR code to be marked present. Location verification helps ensure that a student is physically close to the class location before attendance can be submitted.

## Project Goal

This project replaces paper attendance sheets with a simple digital system. It allows a lecturer to manage courses, begin an attendance session, and see which students attended. Students can enrol in courses, scan a lecturer's QR code during class, and view their attendance score.

The attendance score can contribute up to **10 marks** to a student's course grade.

## Users and Roles

| Role | What they can do |
| --- | --- |
| Lecturer / Admin | Create courses, view enrolled students, start and end attendance, display a rotating QR code, view records, and export attendance data. |
| Student | Create an account, enrol in courses, scan attendance QR codes while at the class location, and view attendance history and marks. |

## Core Features

- Student and lecturer sign-up and login.
- Role-based dashboards.
- Course creation and student course enrolment.
- Attendance sessions created by a lecturer.
- QR code that automatically changes every 30 seconds.
- QR token expiry validation on the backend.
- Student QR-code scanning with a phone camera.
- Geofence verification before the scanner is enabled and again when attendance is saved.
- Duplicate scan prevention: one attendance record per student per session.
- Attendance history, percentage, and score out of 10.
- Lecturer attendance table and CSV export for spreadsheet use.

## How Attendance Works

1. A lecturer creates a course, for example `CSC301 - Database Systems`.
2. Students enrol in the course.
3. At the beginning of class, the lecturer starts an attendance session and provides the class location and permitted radius (for example, 50 metres).
4. The system creates a temporary, signed QR token and shows it as a QR code.
5. A new QR token is generated every 30 seconds.
6. The student opens the scanner page. The browser asks for location permission.
7. If the student is inside the permitted area, the scanner becomes available. Otherwise, the app shows an out-of-range message.
8. The student scans the active QR code.
9. The backend confirms that the student is logged in, enrolled, within the allowed radius, using a valid unexpired token, and has not scanned already.
10. If every check succeeds, the application saves a `present` attendance record.

> The QR code should stay visible on the lecturer's screen. It is the **student scanner and attendance submission** that should be disabled outside the permitted class location.

## Location Verification

Location validation is a geofence: a circular area around the class location.

- Lecturer location: latitude and longitude captured when attendance begins, or entered for a known classroom.
- Allowed radius: normally 30 to 100 metres depending on GPS accuracy and the size of the building.
- Student location: captured from the browser immediately before scanning/submitting attendance.
- Minimum accuracy: reject a location whose `accuracy` is too poor, for example worse than 50 metres.
- Server validation: never trust a location check performed only in React; send the coordinates to the API and calculate the distance again on the backend.

GPS can be inaccurate indoors and can be faked by determined users. The first version should use geofencing with rotating QR codes; later improvements can include school Wi-Fi, Bluetooth beacons, lecturer approval, or live selfie check-in.

## Attendance Mark Calculation

For a course where attendance has a maximum of 10 marks:

```text
attendanceMark = (classesAttended / totalCompletedSessions) × 10
```

Example:

```text
8 attended sessions / 10 completed sessions = 80%
80% × 10 = 8/10 attendance marks
```

## Technology Stack

### Frontend

- React with Vite
- React Router
- Axios or Fetch API
- `html5-qrcode` or `react-qr-reader` for camera scanning
- `qrcode` for displaying lecturer QR codes
- CSS, Tailwind CSS, or a component library such as Material UI

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (`jsonwebtoken`) for authentication
- `bcryptjs` for password hashing
- `qrcode` for QR generation
- `json2csv` for exporting attendance data
- `dotenv` for environment variables

## Suggested Project Structure

```text
scanner/
├── client/
│   └── src/
│       ├── components/
│       │   ├── QRCodeDisplay.jsx
│       │   ├── QRScanner.jsx
│       │   ├── AttendanceTable.jsx
│       │   └── ProtectedRoute.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Signup.jsx
│       │   ├── LecturerDashboard.jsx
│       │   ├── StudentDashboard.jsx
│       │   └── ScanAttendance.jsx
│       ├── services/api.js
│       └── App.jsx
├── server/
    ├── config/
    │   └── db.js
    ├── controllers/
    │   ├── authController.js
    │   ├── courseController.js
    │   └── attendanceController.js
    ├── middleware/
    │   ├── authMiddleware.js
    │   └── roleMiddleware.js
    ├── models/
    │   ├── User.js
    │   ├── Course.js
    │   ├── AttendanceSession.js
    │   └── AttendanceRecord.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── courseRoutes.js
    │   └── attendanceRoutes.js
    ├── utils/
    │   ├── generateToken.js
    │   └── calculateDistance.js
    ├── .env
    ├── package.json
    └── server.js
```

## Database Design

### User

```js
{
  name: String,
  email: String,
  password: String, // hashed
  role: 'student' | 'lecturer',
  matricNumber: String, // required for students
  createdAt: Date
}
```

### Course

```js
{
  courseCode: String,
  courseTitle: String,
  lecturer: ObjectId, // User
  students: [ObjectId], // Users
  createdAt: Date
}
```

### Attendance Session

```js
{
  course: ObjectId,
  lecturer: ObjectId,
  active: Boolean,
  startedAt: Date,
  endedAt: Date,
  location: {
    latitude: Number,
    longitude: Number,
    radiusMeters: Number
  }
}
```

### Attendance Record

```js
{
  student: ObjectId,
  course: ObjectId,
  session: ObjectId,
  status: 'present',
  scannedAt: Date,
  scanLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
  }
}
```

Create a unique MongoDB index on `student` and `session` so a student cannot be marked present twice in the same session.

## Planned API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create student or lecturer account. |
| POST | `/api/auth/login` | Authenticate and return JWT. |
| POST | `/api/courses` | Lecturer creates a course. |
| GET | `/api/courses` | Get courses for the current user. |
| POST | `/api/courses/:courseId/enrol` | Student enrols in a course. |
| POST | `/api/attendance/start/:courseId` | Lecturer starts a session and sets geofence. |
| GET | `/api/attendance/:sessionId/qr` | Get the current short-lived QR token. |
| POST | `/api/attendance/scan` | Validate QR, enrolment, location, and save attendance. |
| POST | `/api/attendance/end/:sessionId` | Lecturer ends a session. |
| GET | `/api/attendance/course/:courseId` | Lecturer views course attendance. |
| GET | `/api/attendance/student/:courseId` | Student views course attendance and score. |
| GET | `/api/attendance/export/:courseId` | Download course attendance CSV. |

## QR Token Rules

The QR code must contain a short-lived token, not just a course ID.

- Include the attendance session ID, an expiry time, and a random value or version number.
- Sign the token using a server-only secret.
- Generate a new token every 30 seconds.
- Reject expired, altered, or invalid tokens in the backend.
- Keep the final decision on the server, even if the frontend says a token is valid.

## Environment Variables

Create a `server/.env` file based on this example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/qr-attendance
JWT_SECRET=replace-with-a-long-random-secret
QR_TOKEN_SECRET=replace-with-a-different-long-random-secret
CLIENT_URL=http://localhost:5173
```

Do not commit `.env` files or real secret values to Git.

## Local Development Setup

### Prerequisites

- Node.js 18 or newer
- MongoDB Community Server locally, or a MongoDB Atlas database
- A phone or browser with camera and location permissions for testing

### Install dependencies

```bash
# Client
cd client
npm install

# Server
cd ../server
npm install express mongoose cors dotenv bcryptjs jsonwebtoken qrcode json2csv
```

Install frontend packages as required:

```bash
cd client
npm install axios react-router-dom html5-qrcode qrcode
```

### Run the application

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

For real-phone camera and location testing, use HTTPS or a secure development tunnel. Browsers normally restrict camera and geolocation features on insecure sites.

## Build Order

1. Set up the React client, Express server, and MongoDB connection.
2. Create user schemas, sign-up, login, JWT middleware, and role protection.
3. Build lecturer course creation and student course enrolment.
4. Create attendance session and attendance record schemas.
5. Let lecturers start and end a session with a location and radius.
6. Generate and refresh QR tokens every 30 seconds.
7. Build the student scanner and request camera/location permission.
8. Add backend checks for token expiry, enrolment, distance, location accuracy, and duplicate scans.
9. Build attendance tables, percentage calculation, and marks out of 10.
10. Add CSV export and test the complete lecturer-to-student flow.

## Testing Checklist

- Student and lecturer cannot access each other's protected pages.
- Only lecturers can create a course or start attendance.
- Only enrolled students can mark attendance.
- A QR token becomes invalid after 30 seconds.
- A student outside the permitted radius cannot scan or submit attendance.
- A student cannot scan twice during one session.
- A completed session counts correctly in the attendance percentage.
- CSV export opens correctly in spreadsheet software.

## Future Improvements

- Email verification and password reset.
- Lecturer-defined course schedules.
- Notifications when a session begins.
- QR display on a projector-friendly full-screen page.
- School Wi-Fi or Bluetooth classroom verification.
- Lecturer approval for suspicious scans.
- Reports by date, course, or student.
- Admin account for managing all lecturers and courses.

## Project Status

Planning stage. Follow the build order above to implement the first working version.
