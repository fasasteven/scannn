import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { emailConfigured, sendLecturerAccessCodeEmail } from "../utils/mailer.js";
import { randomBytes, createHash } from "crypto";
import { sendVerificationEmail } from "../utils/mailer.js";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";

function publicUser(user) {
  return { 
    id: user._id, 
    name: user.name, 
    email: user.email, 
    role: user.role, 
    matricNumber: user.matricNumber, 
    staffId: user.staffId, 
    passkeyRegistered: user.passkeyRegistered,
    emailVerified: user.emailVerified,
    faculty: user.faculty,
    department: user.department,
    registeredCourses: user.registeredCourses
   };
}

function generateLecturerAccessCode() {
  return String(randomInt(100000, 1000000));
}

function normalizePhoneNumber(phoneNumber) {
  return phoneNumber?.trim().replace(/[\s()-]/g, "");
}

function normalizeDeviceId(deviceId) {
  return deviceId?.trim();
}

function containsEmoji(value) {
  return /[\p{Extended_Pictographic}\uFE0F\u200D]/u.test(value || "");
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validPassword(password) {
  return password.length > 8
    && /[A-Z]/.test(password)
    && /[^A-Za-z0-9\s]/.test(password)
    && !containsEmoji(password);
}

function invalidText(value) {
  return typeof value !== "string" || !value.trim() || containsEmoji(value);
}

async function checkDeviceAccess(user, deviceId) {
  const registeredOwner = await User.findOne({ registeredDeviceId: deviceId }).select("_id");
  if (registeredOwner && registeredOwner._id.toString() !== user._id.toString()) {
    await User.updateOne(
      { _id: user._id },
      { $set: { deviceCheatFlagged: true }, $inc: { deviceCheatAttempts: 1 } },
    );
    return false;
  }

  if (user.registeredDeviceId && user.registeredDeviceId !== deviceId) return false;

  if (!user.registeredDeviceId) {
    const claimed = await User.updateOne(
      { _id: user._id, registeredDeviceId: { $exists: false } },
      { $set: { registeredDeviceId: deviceId } },
    );
    if (!claimed.modifiedCount) return false;
    user.registeredDeviceId = deviceId;
  }

  return true;
}

export async function signup(req, res, next) {
  try {
    const {
      name, 
      email, 
      phoneNumber,
      deviceId,
      password, 
      role, 
      matricNumber, 
      staffId 
    } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    const normalizedDeviceId = normalizeDeviceId(deviceId);
      if (invalidText(name) || !normalizedEmail || !normalizedPhoneNumber || !password || !["student", "lecturer"].includes(role))
      return res.status(400).json({
          message: "Name, phone number, email, password, and a valid role are required, and emojis are not allowed."
    });

    if (!validEmail(normalizedEmail))
      return res.status(400).json({ message: "Enter a valid email address." });

    if (containsEmoji(normalizedPhoneNumber) || containsEmoji(normalizedDeviceId) || containsEmoji(matricNumber) || containsEmoji(staffId))
      return res.status(400).json({ message: "Emojis and stickers are not allowed in account details." });

    if (!/^\+?[0-9]{8,15}$/.test(normalizedPhoneNumber))
      return res.status(400).json({ message: "Enter a valid phone number." });

    if (!normalizedDeviceId || normalizedDeviceId.length > 100)
      return res.status(400).json({ message: "A valid device identifier is required." });

    if (!validPassword(password))
      return res.status(400).json({
      message: "Password must be longer than 8 characters, include one uppercase letter and one special character, and contain no emojis."
    });

    if (role === "student" && !matricNumber?.trim()) 
      return res.status(400).json({ 
        message: "Matric number is required for students." 
    });

    if (role === "lecturer" && !staffId?.trim()) 
      return res.status(400).json({ 
        message: "Staff ID is required for lecturers." 
    });

    if (await User.exists({ email: normalizedEmail }))
        return res.status(409).json({ 
          message: "An account with this email already exists." 
    });

    if (await User.exists({ phoneNumber: normalizedPhoneNumber }))
      return res.status(409).json({ message: "An account with this phone number already exists." });

    if (await User.exists({ registeredDeviceId: normalizedDeviceId }))
      return res.status(403).json({ message: "This device is already registered to another account." });

    if (!emailConfigured())
      return res.status(503).json({ message: "Email delivery is not configured. Set the SMTP variables before creating accounts." });

    const lecturerAccessCode = role === "lecturer" ? generateLecturerAccessCode() : undefined;
    const verificationToken = randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email: normalizedEmail,
      phoneNumber: normalizedPhoneNumber,
      registeredDeviceId: normalizedDeviceId,
      password: await bcrypt.hash(password, 12),
      role,
      matricNumber: role === "student" ? matricNumber : undefined,
      staffId: role === "lecturer" ? staffId : undefined,
      lecturerAccessCodeHash: lecturerAccessCode ? await bcrypt.hash(lecturerAccessCode, 12) : undefined,
      emailVerificationTokenHash: createHash("sha256").update(verificationToken).digest("hex"),
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      await sendVerificationEmail({ name, email: normalizedEmail, token: verificationToken });
    } catch (mailError) {
      await User.deleteOne({ _id: user._id });
      throw mailError;
    }

    let accessCodeDelivered = false;
    const accessCodeEmailConfigured = emailConfigured();
    if (lecturerAccessCode) {
      try {
        accessCodeDelivered = await sendLecturerAccessCodeEmail({ name, email, accessCode: lecturerAccessCode });
      } catch (mailError) {
        console.error("Lecturer access-code email failed:", mailError.message);
        await User.deleteOne({ _id: user._id });
        throw mailError;
      }
    }

    res.status(201).json({
      lecturerAccessCode: accessCodeDelivered || accessCodeEmailConfigured ? undefined : lecturerAccessCode,
      accessCodeDelivered,
      message: "Account created. Check your email to verify your account before signing in.",
    });
   }catch (error) {
        if (error.code === 11000) return res.status(409).json({
          message: "That email, phone number, matric number, or staff ID is already registered."
    });
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!validEmail(email) || containsEmoji(email)) return res.status(400).json({ message: "Enter a valid email address." });
    const user = await User.findOne({ 
      email
    }).select("+password +lecturerAccessCodeHash +registeredDeviceId");
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(401).json({ 
        message: "Incorrect email or password." 
    });
    if (!user.emailVerified) return res.status(403).json({ message: "Verify your email address before signing in." });
    if (user.role === "lecturer" && user.lecturerAccessCodeHash && !(await bcrypt.compare(req.body.lecturerAccessCode || "", user.lecturerAccessCodeHash))) 
      return res.status(401).json({ message: "Incorrect lecturer access code." });
    const normalizedDeviceId = normalizeDeviceId(req.body.deviceId);
    if (!normalizedDeviceId || normalizedDeviceId.length > 100)
      return res.status(400).json({ message: "A valid device identifier is required." });
    if (!(await checkDeviceAccess(user, normalizedDeviceId)))
      return res.status(403).json({ message: "This device is registered to another account. This login attempt has been flagged." });
        setAuthCookie(res, generateToken(user));
        res.json({ user: publicUser(user)
    });
    }catch (error) { 
      next(error); 
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ message: "Verification token is required." });
    const user = await User.findOne({ emailVerificationTokenHash: createHash("sha256").update(token).digest("hex"), emailVerificationExpiresAt: { $gt: new Date() } }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
    if (!user) return res.status(400).json({ message: "This verification link is invalid or expired." });
    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    res.json({ message: "Email verified. You can now sign in." });
  } catch (error) { next(error); }
}

export function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: "Signed out." });
}
