import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

departmentSchema.index({ faculty: 1, name: 1 }, { unique: true });

export default mongoose.model("Department", departmentSchema);