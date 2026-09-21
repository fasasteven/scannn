import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true },
  title: { type: String, required: true, trim: true },
  units: { type: Number, default: 3, min: 1 },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  active: { type: Boolean, default: true },
}, { timestamps: true });

courseSchema.index({ code: 1, department: 1 }, { unique: true });

export default mongoose.model("Course", courseSchema);