export function extractPasskeyChallenge(response) {
	const clientDataJSON = response?.response?.clientDataJSON;
	if (typeof clientDataJSON !== "string") {
		throw Object.assign(new Error("Passkey response is missing its challenge. Please try again."), { statusCode: 400 });
	}

	try {
		const clientData = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf8"));
		if (typeof clientData.challenge !== "string" || !clientData.challenge) throw new Error();
		return clientData.challenge;
	} catch {
		throw Object.assign(new Error("Passkey response is invalid. Please try again."), { statusCode: 400 });
	}
}
