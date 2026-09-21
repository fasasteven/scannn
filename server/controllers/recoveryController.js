import User from "../models/User.js";

export async function revokeUserAccess(req, res, next) {
	try {
		const user = await User.findByIdAndUpdate(req.params.userId, {
			$unset: { registeredDeviceId: 1, passkeys: 1, passkeyRegistered: 1, passkeyChallenge: 1, passkeyChallengeExpiresAt: 1 },
		}, { new: true }).select("name email role");
		if (!user) return res.status(404).json({ message: "User not found." });
		res.json({ message: "Device binding and passkeys revoked. The user must register this device again.", user });
	} catch (error) { next(error); }
}