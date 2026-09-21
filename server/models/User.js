import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  registeredDeviceId: { type: String, unique: true, sparse: true, select: false },
  deviceCheatFlagged: { type: Boolean, default: false },
  deviceCheatAttempts: { type: Number, default: 0 },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["student", "lecturer", "admin"], required: true },
  matricNumber: { type: String, trim: true, unique: true, sparse: true },
  staffId: { type: String, trim: true, unique: true, sparse: true },
  lecturerAccessCodeHash: { type: String, select: false },
  passkeyRegistered: { type: Boolean, default: false },
  passkeys: [{
    credentialId: { type: String, required: true },
    publicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  }],
  passkeyChallenge: { type: String, select: false },
  passkeyChallengeExpiresAt: { type: Date, select: false },
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  registeredCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
}, { timestamps: true });

export default mongoose.model("User", userSchema);
