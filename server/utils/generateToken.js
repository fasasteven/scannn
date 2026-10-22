import jwt from "jsonwebtoken";

export function generateToken(user) {
  return jwt.sign({ 
    userId: user._id.toString(), role: user.role, authVersion: user.authVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
