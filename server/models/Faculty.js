import mongoose from "mongoose";

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Faculty", facultySchema);