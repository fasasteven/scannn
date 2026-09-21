export function setAuthCookie(res, token) {
	const sameSite = process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax");
	res.cookie("accessToken", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite,
		maxAge: 7 * 24 * 60 * 60 * 1000,
		path: "/",
	});
}

export function clearAuthCookie(res) {
	const sameSite = process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax");
	res.clearCookie("accessToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite, path: "/" });
}