import test from "node:test";
import assert from "node:assert/strict";
import { extractPasskeyChallenge } from "../utils/passkeyChallenge.js";

test("extracts the challenge from a passkey response", () => {
	const clientDataJSON = Buffer.from(JSON.stringify({ challenge: "challenge-value" })).toString("base64url");
	assert.equal(extractPasskeyChallenge({ response: { clientDataJSON } }), "challenge-value");
});

test("rejects a passkey response without a challenge", () => {
	assert.throws(
		() => extractPasskeyChallenge({ response: { clientDataJSON: Buffer.from("{}").toString("base64url") } }),
		{ message: "Passkey response is invalid. Please try again." },
	);
});
