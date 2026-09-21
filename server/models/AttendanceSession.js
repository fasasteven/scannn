import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  accessMode: { type: String, enum: ["code", "qr"], required: true },
  accessCode: { type: String, required: true, select: false },
  active: { type: Boolean, default: true },
  startsAt: { type: Date, default: Date.now },
  endsAt: Date,
  location: {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    radiusMeters: { type: Number, default: 3, min: 3, max: 3 },
  },
}, { timestamps: true });

export default mongoose.model("AttendanceSession", attendanceSessionSchema);