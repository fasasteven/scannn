import nodemailer from "nodemailer";

function hasPlaceholderValue(value) {
	if (!value) return true;
	const normalized = value.trim();
	return /replace-with|your-smtp|your-email|example\.com|placeholder/i.test(normalized);
}

export function emailConfigured() {
	const host = process.env.SMTP_HOST?.trim();
	const user = process.env.SMTP_USER?.trim();
	const pass = process.env.SMTP_PASS?.trim();
	const from = process.env.MAIL_FROM?.trim();

	if (!host || !user || !pass || !from) return false;
	if (hasPlaceholderValue(host) || hasPlaceholderValue(user) || hasPlaceholderValue(pass) || hasPlaceholderValue(from)) return false;

	return true;
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export async function sendLecturerAccessCodeEmail({ name, email, accessCode }) {
	if (!emailConfigured()) return false;
	const safeName = escapeHtml(name);

	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: process.env.SMTP_SECURE === "true",
		auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
	});

	await transporter.sendMail({
		from: process.env.MAIL_FROM,
		to: email,
		subject: "Your QR Attendance lecturer access code",
		text: `Hello ${name},\n\nYour lecturer access code is: ${accessCode}\n\nKeep this code private. You will need it when logging in to QR Attendance.`,
		html: `<p>Hello ${safeName},</p><p>Your lecturer access code is:</p><p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${accessCode}</p><p>Keep this code private. You will need it when logging in to QR Attendance.</p>`,
	});

	return true;
}

export async function sendVerificationEmail({ name, email, token }) {
	if (!emailConfigured()) return false;
	const safeName = escapeHtml(name);
	const verificationUrl = `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/verify-email?token=${encodeURIComponent(token)}`;
	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: process.env.SMTP_SECURE === "true",
		auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
	});
	await transporter.sendMail({
		from: process.env.MAIL_FROM,
		to: email,
		subject: "Verify your QR Attendance email",
		text: `Hello ${name}, verify your email by opening: ${verificationUrl}`,
		html: `<p>Hello ${safeName},</p><p>Verify your QR Attendance email address:</p><p><a href="${verificationUrl}">Verify email address</a></p><p>This link expires in 24 hours.</p>`,
	});
	return true;
}