# QR Attendance Management System

A MERN-stack web application that records school attendance through lecturer-selected six-digit codes or QR codes. Lecturers create attendance sessions for their courses, while enrolled students submit the class credential and are verified by server-side geolocation.

The current implementation includes password authentication, lecturer access codes, one-device account binding, role-protected dashboards, course registration, QR scanning, six-digit attendance codes, geofence validation, attendance reports, and CSV export. Facial biometric verification is not implemented yet; device binding is an abuse-control measure and must not be described as facial recognition.

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
- Lecturer-selected QR code or permanent six-digit class code.
- Student QR-code scanning with a phone camera or manual code entry.
- Server-side geofence verification with a strict 3-metre radius.
- GPS audit fields on each attendance record.
- Duplicate scan prevention: one attendance record per student per session.
- Attendance history, percentage, and score out of 10.
- Lecturer attendance table and CSV export for spreadsheet use.

## How Attendance Works

1. A lecturer creates a course, for example `CSC301 - Database Systems`.
2. Students enrol in the course.
3. At the beginning of class, the lecturer starts an attendance session and chooses QR or six-digit code mode. The lecturer's current location is saved with a 3-metre radius.
4. The server creates one class credential. It remains valid until the lecturer ends the class.
6. The student opens the scanner page. The browser asks for location permission.
7. If the student is inside the permitted area, the scanner becomes available. Otherwise, the app shows an out-of-range message.
8. The student enters the code or scans the QR code.
9. The backend confirms that the student is logged in, enrolled, within 3 metres, has accurate GPS, uses the correct class credential, and has not attended already.
10. If every check succeeds, the application saves a `present` attendance record.

> The QR code or six-digit code should be displayed by the lecturer. The student's attendance submission is disabled outside the permitted class location.

## Location Verification

Location validation is a geofence: a circular area around the class location.

- Lecturer location: latitude and longitude captured when attendance begins, or entered for a known classroom.
- Allowed radius: currently fixed at 3 metres; this may need to increase after physical-device testing because indoor GPS can be inaccurate.
- Student location: captured from the browser immediately before scanning/submitting attendance.
- Minimum accuracy: reject a location whose accuracy is worse than 3 metres.
- Server validation: never trust a location check performed only in React; send the coordinates to the API and calculate the distance again on the backend.

Each attendance record stores `studentLatitude`, `studentLongitude`, `locationAccuracy`, `distanceMeters`, and `accessMethod` for auditing.

GPS can be inaccurate indoors and can be faked by determined users. Physical-device testing is required before deciding whether the 3-metre radius is practical.

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

Each attendance record stores `studentLatitude`, `studentLongitude`, `locationAccuracy`, `distanceMeters`, `accessMethod`, `authenticationMethod`, `deviceId`, and `recordedAt` for auditing.

### Passkeys and laptop testing

Attendance requires a passkey in addition to the QR or six-digit class credential and server-side location check. The private passkey never leaves the authenticator; the server stores only its public key and signature counter.

To test on a laptop:

1. Start the frontend and backend on `localhost`.
2. Create or log in to a student account on that laptop.
3. Open the student dashboard and select **Register passkey**.
4. Complete the browser prompt with Windows Hello, the laptop PIN or fingerprint, a phone, or a USB security key.
5. Start attendance from the lecturer account, then use the student account to scan the QR code or enter the six-digit code.
6. Confirm the passkey prompt and allow browser location access.

The laptop PIN is not stored by this application. It unlocks Windows Hello, which signs the WebAuthn assertion. On a laptop without Windows Hello, choose a phone or security key in the browser prompt. Passkeys are origin-bound, so use the same `localhost` host consistently; deployed use requires HTTPS and matching WebAuthn origin and RP ID values.
- React with Vite
- React Router
- Axios or Fetch API
- `html5-qrcode` for camera scanning
- `qrcode` for displaying lecturer QR codes
- CSS, Tailwind CSS, or a component library such as Material UI

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (`jsonwebtoken`) for authentication
- `bcryptjs` for password hashing
- `dotenv` for environment variables

## Suggested Project Structure

```text
scanner/
├── frontend/
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
│       ├── services/Api.js
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
  accessMode: 'code' | 'qr',
  accessCode: String,
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
  recordedAt: Date,
  studentLatitude: Number,
  studentLongitude: Number,
  locationAccuracy: Number,
  distanceMeters: Number,
  accessMethod: 'code' | 'qr'
}
```

Create a unique MongoDB index on `student` and `session` so a student cannot be marked present twice in the same session.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create student or lecturer account. |
| POST | `/api/auth/login` | Authenticate and return JWT. |
| GET | `/api/courses/catalog` | Get faculties, departments, and available courses. |
| PUT | `/api/courses/lecturer-faculty` | Set a lecturer's faculty. |
| POST | `/api/courses/manage` | Lecturer creates a course. |
| GET | `/api/courses/manage` | Lecturer lists their courses. |
| GET | `/api/courses/registration` | Student gets their registration. |
| PUT | `/api/courses/registration` | Student saves faculty, department, and courses. |
| GET | `/api/attendance/sessions` | Get active sessions visible to the current role. |
| POST | `/api/attendance/sessions` | Lecturer starts a session and sets the geofence. |
| POST | `/api/attendance/sessions/:sessionId/check-in` | Validate code or QR, enrolment, location, and save attendance. |
| PATCH | `/api/attendance/sessions/:sessionId/close` | Lecturer ends a session. |
| GET | `/api/attendance/progress` | Student views attendance percentage and progress. |
| GET | `/api/attendance/courses/:courseId/report` | Lecturer views course attendance. |
| GET | `/api/attendance/courses/:courseId/export` | Download course attendance CSV. |

## Attendance Credential Rules

The lecturer chooses QR or a six-digit code when starting a class. The credential is generated once and remains valid only while that session is active. Ending the class invalidates it. The final decision remains on the server.

## Environment Variables

Create a `server/.env` file based on this example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/qr-attendance
JWT_SECRET=replace-with-a-long-random-secret
WEBAUTHN_RP_NAME=QR Attendance
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:5173
CLIENT_ORIGIN=http://localhost:5173
COOKIE_SAME_SITE=lax
EMAIL_VERIFICATION_REQUIRED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
MAIL_FROM=QR Attendance <no-reply@example.com>
```

When the frontend and API are deployed separately, set `VITE_API_URL` to the public API base URL, for example `https://api.example.com/api`. During local development, Vite proxies `/api` to `http://localhost:5000`.

SMTP settings are required for email verification and lecturer access codes. For Gmail, use an App Password rather than your normal account password. Authentication uses an HttpOnly cookie, so the browser does not store the JWT in JavaScript-accessible storage. Set `COOKIE_SAME_SITE=strict` when the frontend and API share a site; use `lax` for local development.

Before deployment, rotate any credentials that were ever placed in a local or committed `.env` file. Generate a new JWT secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, rotate the MongoDB database user password in Atlas, and update the deployment environment variables. Do not commit the resulting `.env` file.

Do not commit `.env` files or real secret values to Git.

## Local Development Setup

### Prerequisites

- Node.js 18 or newer
- MongoDB Community Server locally, or a MongoDB Atlas database
- A phone or browser with camera and location permissions for testing

### Install dependencies

```bash
# Frontend
cd frontend
WEBAUTHN_RP_NAME=QR Attendance
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:5173
npm install

# Server
cd ../server
npm install
```

Install frontend packages as required:

```bash
cd frontend
npm install axios react-router-dom html5-qrcode qrcode
```

### Run the application

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd frontend
npm run dev
```

From the repository root, the backend can also be started with `npm start`. The backend requires a reachable MongoDB instance and a populated `server/.env` file. For a production deployment, use HTTPS and set `WEBAUTHN_ORIGIN` and `WEBAUTHN_RP_ID` to the deployed frontend origin and hostname.

For real-phone camera and location testing, use HTTPS or a secure development tunnel. Browsers normally restrict camera and geolocation features on insecure sites.

### Physical GPS test checklist

Test on at least two phones with location services enabled: one at the lecturer location, one at 3 metres, one beyond 3 metres, and one with location permission denied. Record the browser-reported accuracy and result for each test. Repeat indoors and outdoors, because the current 3-metre radius and 3-metre accuracy threshold may reject valid indoor readings. Do not increase the radius until the results are recorded and reviewed.

## Build Order

1. Set up the React client, Express server, and MongoDB connection.
2. Create user schemas, sign-up, login, JWT middleware, and role protection.
3. Build lecturer course creation and student course enrolment.
4. Create attendance session and attendance record schemas.
5. Let lecturers start and end a session with a location and radius.
6. Generate one QR payload for each active session.
7. Build the student scanner and request camera/location permission.
8. Add backend checks for token expiry, enrolment, distance, location accuracy, and duplicate scans.
9. Build attendance tables, percentage calculation, and marks out of 10.
10. Add CSV export and test the complete lecturer-to-student flow.

## Testing Checklist

- Student and lecturer cannot access each other's protected pages.
- Only lecturers can create a course or start attendance.
- Only enrolled students can mark attendance.
- A wrong code or QR payload is rejected.
- A student outside the permitted radius cannot scan or submit attendance.
- A student cannot scan twice during one session.
- A completed session counts correctly in the attendance percentage.
- CSV export opens correctly in spreadsheet software and includes audit fields.

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

Core registration, lecturer course management, code/QR attendance, geofence validation, attendance progress, spreadsheet reporting, and CSV export are implemented. Facial biometric verification, physical-device testing, and production HTTPS deployment remain before real-world launch.
