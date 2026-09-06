import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

function publicUser(user) {
  return { 
    id: user._id, 
    name: user.name, 
    email: user.email, 
    role: user.role, 
    matricNumber: user.matricNumber, 
    staffId: user.staffId, 
    passkeyRegistered: user.passkeyRegistered 
   };
}

function generateLecturerAccessCode() {
  return String(randomInt(100000, 1000000));
}

export async function signup(req, res, next) {
  try {
    const {
      name, 
      email, 
      password, 
      role, 
      matricNumber, 
      staffId 
    } = req.body;
    if (!name || !email || !password || !["student", "lecturer"].includes(role)) 
      return res.status(400).json({
        message: "Name, email, password, and a valid role are required." 
    });

    if (password.length < 8) 
      return res.status(400).json({
      message: "Password must be at least 8 characters." 
    });

    if (role === "student" && !matricNumber?.trim()) 
      return res.status(400).json({ 
        message: "Matric number is required for students." 
    });

    if (role === "lecturer" && !staffId?.trim()) 
      return res.status(400).json({ 
        message: "Staff ID is required for lecturers." 
    });

    if (await User.exists({ email: email.toLowerCase() })) 
        return res.status(409).json({ 
          message: "An account with this email already exists." 
    });

    const lecturerAccessCode = role === "lecturer" ? generateLecturerAccessCode() : undefined;

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role,
      matricNumber: role === "student" ? matricNumber : undefined,
      staffId: role === "lecturer" ? staffId : undefined,
      lecturerAccessCodeHash: lecturerAccessCode ? await bcrypt.hash(lecturerAccessCode, 12) : undefined,
    });

    res.status(201).json({ 
      token: generateToken(user), user: publicUser(user), lecturerAccessCode 
    });
   }catch (error) {
    if (error.code === 11000) return res.status(409).json({ 
          message: "That matric number or staff ID is already registered." 
    });
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = await User.findOne({ 
      email: req.body.email?.toLowerCase() 
    }).select("+password +lecturerAccessCodeHash");
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(401).json({ 
        message: "Incorrect email or password." 
    });
    if (user.role === "lecturer" && user.lecturerAccessCodeHash && !(await bcrypt.compare(req.body.lecturerAccessCode || "", user.lecturerAccessCodeHash))) 
      return res.status(401).json({ message: "Incorrect lecturer access code." });
        res.json({ token: generateToken(user), user: publicUser(user) 
    });
    }catch (error) { 
      next(error); 
  }
}
