import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const cookieToken = req.cookies?.accessToken;
    const token = cookieToken || (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);
    if (!token) return res.status(401).json({ message: "Authentication required." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.userId);
    if (!req.user) return res.status(401).json({ message: "User no longer exists." });
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}