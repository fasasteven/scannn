import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.get("/api/health", (req, res) => res.json({ message: "API is running" }));
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message || "Server error" }));

connectDatabase().then(() => app.listen(process.env.PORT || 5000, () => console.log("API running on port 5000"))).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
