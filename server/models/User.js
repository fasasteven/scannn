import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["student", "lecturer"], required: true },
  matricNumber: { type: String, trim: true, unique: true, sparse: true },
  staffId: { type: String, trim: true, unique: true, sparse: true },
  lecturerAccessCodeHash: { type: String, select: false },
  passkeyRegistered: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
