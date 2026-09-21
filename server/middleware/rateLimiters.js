import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
	limit: 20,
	windowMs: 15 * 60 * 1000,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: "Too many authentication attempts. Try again later." },
});

export const attendanceLimiter = rateLimit({
	limit: 30,
	windowMs: 10 * 60 * 1000,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: "Too many attendance attempts. Try again later." },
});