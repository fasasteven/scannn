import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import api from "./Api";

export async function registerPasskey() {
	const options = (await api.post("/auth/passkey/register/options")).data;
	const credential = await startRegistration({ optionsJSON: options });
	return (await api.post("/auth/passkey/register/verify", credential)).data;
}

export async function authenticatePasskey() {
	const options = (await api.post("/auth/passkey/authenticate/options")).data;
	return startAuthentication({ optionsJSON: options });
}