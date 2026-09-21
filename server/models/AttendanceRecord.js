import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["present", "absent"], default: "present" },
  studentLatitude: { type: Number, min: -90, max: 90 },
  studentLongitude: { type: Number, min: -180, max: 180 },
  locationAccuracy: { type: Number, min: 0 },
  distanceMeters: { type: Number, min: 0 },
  accessMethod: { type: String, enum: ["code", "qr"], required: true },
  authenticationMethod: { type: String, enum: ["passkey"], required: true },
  deviceId: { type: String, trim: true, maxlength: 100 },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

attendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);