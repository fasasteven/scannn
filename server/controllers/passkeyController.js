import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import User from "../models/User.js";

const challengeLifetimeMs = 5 * 60 * 1000;

function rpId() {
	return process.env.WEBAUTHN_RP_ID || "localhost";
}

function origin() {
	return process.env.WEBAUTHN_ORIGIN || process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

function saveChallenge(user, challenge) {
	return User.updateOne({ _id: user._id }, {
		$set: { passkeyChallenge: challenge, passkeyChallengeExpiresAt: new Date(Date.now() + challengeLifetimeMs) },
	});
}

function challengeIsValid(user) {
	return user.passkeyChallenge && user.passkeyChallengeExpiresAt?.getTime() > Date.now();
}

export async function registrationOptions(req, res, next) {
	try {
		const user = await User.findById(req.user._id).select("+passkeyChallenge +passkeyChallengeExpiresAt");
		const options = await generateRegistrationOptions({
			rpName: process.env.WEBAUTHN_RP_NAME || "QR Attendance",
			rpID: rpId(),
			userName: user.email,
			userDisplayName: user.name,
			userID: new TextEncoder().encode(user._id.toString()),
			attestationType: "none",
			excludeCredentials: user.passkeys.map((passkey) => ({ id: passkey.credentialId, transports: passkey.transports })),
			authenticatorSelection: { residentKey: "required", userVerification: "required" },
		});
		await saveChallenge(user, options.challenge);
		res.json(options);
	} catch (error) { next(error); }
}

export async function registrationVerify(req, res, next) {
	try {
		const user = await User.findById(req.user._id).select("+passkeyChallenge +passkeyChallengeExpiresAt");
		if (!challengeIsValid(user)) return res.status(400).json({ message: "Passkey registration expired. Please try again." });
		const verification = await verifyRegistrationResponse({
			response: req.body,
			expectedChallenge: user.passkeyChallenge,
			expectedOrigin: origin(),
			expectedRPID: rpId(),
			requireUserVerification: true,
		});
		if (!verification.verified || !verification.registrationInfo) return res.status(400).json({ message: "Passkey registration was not verified." });
		const { credential } = verification.registrationInfo;
		if (user.passkeys.some((passkey) => passkey.credentialId === credential.id)) return res.status(409).json({ message: "This passkey is already registered." });
		user.passkeys.push({ credentialId: credential.id, publicKey: Buffer.from(credential.publicKey), counter: credential.counter, transports: req.body.response?.transports || [] });
		user.passkeyRegistered = true;
		user.passkeyChallenge = undefined;
		user.passkeyChallengeExpiresAt = undefined;
		await user.save();
		res.json({ message: "Passkey registered on this device.", passkeyRegistered: true });
	} catch (error) { next(error); }
}

export async function authenticationOptions(req, res, next) {
	try {
		const user = await User.findById(req.user._id).select("+passkeyChallenge +passkeyChallengeExpiresAt");
		if (!user.passkeys.length) return res.status(400).json({ message: "Register a passkey before checking in." });
		const options = await generateAuthenticationOptions({
			rpID: rpId(),
			allowCredentials: user.passkeys.map((passkey) => ({ id: passkey.credentialId, transports: passkey.transports })),
			userVerification: "required",
		});
		await saveChallenge(user, options.challenge);
		res.json(options);
	} catch (error) { next(error); }
}

export async function verifyPasskey(userId, response) {
	const user = await User.findById(userId).select("+passkeyChallenge +passkeyChallengeExpiresAt");
	if (!user || !challengeIsValid(user)) throw Object.assign(new Error("Passkey authentication expired. Try again."), { statusCode: 400 });
	const passkey = user.passkeys.find((credential) => credential.credentialId === response.id);
	if (!passkey) throw Object.assign(new Error("This passkey is not registered to your account."), { statusCode: 403 });
	const verification = await verifyAuthenticationResponse({
		response,
		expectedChallenge: user.passkeyChallenge,
		expectedOrigin: origin(),
		expectedRPID: rpId(),
		credential: { id: passkey.credentialId, publicKey: passkey.publicKey, counter: passkey.counter, transports: passkey.transports },
		requireUserVerification: true,
	});
	if (!verification.verified) throw Object.assign(new Error("Passkey authentication failed."), { statusCode: 403 });
	passkey.counter = verification.authenticationInfo.newCounter;
	user.passkeyChallenge = undefined;
	user.passkeyChallengeExpiresAt = undefined;
	await user.save();
}