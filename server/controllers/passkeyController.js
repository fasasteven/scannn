import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import User from "../models/User.js";
import { extractPasskeyChallenge } from "../utils/passkeyChallenge.js";

const challengeLifetimeMs = 5 * 60 * 1000;
const maxPendingChallenges = 10;

function rpId() {
	return process.env.WEBAUTHN_RP_ID || "localhost";
}

function origin() {
	return process.env.WEBAUTHN_ORIGIN || process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

async function saveChallenge(user, challenge, purpose) {
	const now = new Date();
	await User.updateOne({ _id: user._id }, { $pull: { passkeyChallenges: { expiresAt: { $lte: now } } } });
	const result = await User.updateOne({ _id: user._id }, {
		$push: {
			passkeyChallenges: {
				$each: [{ challenge, purpose, expiresAt: new Date(now.getTime() + challengeLifetimeMs) }],
				$slice: -maxPendingChallenges,
			},
		},
	});
	if (!result.matchedCount) throw new Error("Unable to start passkey verification. Please try again.");
}

async function consumeChallenge(userId, response, purpose) {
	const challenge = extractPasskeyChallenge(response);
	const result = await User.updateOne({
		_id: userId,
		passkeyChallenges: { $elemMatch: { challenge, purpose, expiresAt: { $gt: new Date() } } },
	}, {
		$pull: { passkeyChallenges: { challenge, purpose } },
	});
	if (!result.modifiedCount) {
		throw Object.assign(new Error("Passkey verification expired or was replaced. Please try again."), { statusCode: 400 });
	}
	return challenge;
}

export async function registrationOptions(req, res, next) {
	try {
		const user = await User.findById(req.user._id);
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
		await saveChallenge(user, options.challenge, "registration");
		res.json(options);
	} catch (error) { next(error); }
}

export async function registrationVerify(req, res, next) {
	try {
		const user = await User.findById(req.user._id);
		if (!user) return res.status(401).json({ message: "Your account no longer exists. Please sign in again." });
		const expectedChallenge = await consumeChallenge(user._id, req.body, "registration");
		const verification = await verifyRegistrationResponse({
			response: req.body,
			expectedChallenge,
			expectedOrigin: origin(),
			expectedRPID: rpId(),
			requireUserVerification: true,
		});
		if (!verification.verified || !verification.registrationInfo) return res.status(400).json({ message: "Passkey registration was not verified." });
		const { credential } = verification.registrationInfo;
		if (user.passkeys.some((passkey) => passkey.credentialId === credential.id)) return res.status(409).json({ message: "This passkey is already registered." });
		user.passkeys.push({ credentialId: credential.id, publicKey: Buffer.from(credential.publicKey), counter: credential.counter, transports: req.body.response?.transports || [] });
		user.passkeyRegistered = true;
		await user.save();
		res.json({ message: "Passkey registered on this device.", passkeyRegistered: true });
	} catch (error) { next(error); }
}

export async function authenticationOptions(req, res, next) {
	try {
		const user = await User.findById(req.user._id);
		if (!user.passkeys.length) return res.status(400).json({ message: "Register a passkey before checking in." });
		const options = await generateAuthenticationOptions({
			rpID: rpId(),
			allowCredentials: user.passkeys.map((passkey) => ({ id: passkey.credentialId, transports: passkey.transports })),
			userVerification: "required",
		});
		await saveChallenge(user, options.challenge, "authentication");
		res.json(options);
	} catch (error) { next(error); }
}

export async function verifyPasskey(userId, response) {
	const user = await User.findById(userId);
	if (!user) throw Object.assign(new Error("Your account no longer exists. Please sign in again."), { statusCode: 401 });
	const passkey = user.passkeys.find((credential) => credential.credentialId === response.id);
	if (!passkey) throw Object.assign(new Error("This passkey is not registered to your account."), { statusCode: 403 });
	const expectedChallenge = await consumeChallenge(userId, response, "authentication");
	const verification = await verifyAuthenticationResponse({
		response,
		expectedChallenge,
		expectedOrigin: origin(),
		expectedRPID: rpId(),
		credential: { id: passkey.credentialId, publicKey: passkey.publicKey, counter: passkey.counter, transports: passkey.transports },
		requireUserVerification: true,
	});
	if (!verification.verified) throw Object.assign(new Error("Passkey authentication failed."), { statusCode: 403 });
	passkey.counter = verification.authenticationInfo.newCounter;
	await user.save();
}

export function passkeyStatus(req, res) {
	res.json({ passkeyRegistered: Boolean(req.user.passkeys?.length) });
}