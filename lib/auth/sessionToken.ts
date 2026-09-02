// lib/auth/sessionToken.ts
import "server-only";
import crypto from "crypto";

type SessionPayload = {
	email: string;
	issuedAtUnixMs: number;
};

const _algo = "sha256";

function getSecret(): string {
	const secret = process.env.SESSION_SECRET;
	if (!secret)
		throw new Error("SESSION_SECRET is missing");
	return secret;
}

function base64UrlEncode(input: string): string {
	return Buffer.from(input)
		.toString("base64")
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

function base64UrlDecode(input: string): string {
	const padded = input
		.replaceAll("-", "+")
		.replaceAll("_", "/")
		.padEnd(input.length + (4 - (input.length % 4)) % 4, "=");

	return Buffer.from(padded, "base64").toString("utf8");
}

function sign(data: string): string {
	const secret = getSecret();
	return crypto.createHmac(_algo, secret).update(data).digest("hex");
}

export function signSessionToken(payload: SessionPayload): string {
	const json = JSON.stringify(payload);
	const body = base64UrlEncode(json);
	const sig = sign(body);
	return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload {
	const parts = token.split(".");
	if (parts.length !== 2)
		throw new Error("Invalid session token");

	const body = parts[0];
	const sig = parts[1];

	const expected = sign(body);
	const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

	if (!ok)
		throw new Error("Invalid session token");

	const json = base64UrlDecode(body);
	const payload = JSON.parse(json) as SessionPayload;

	if (typeof payload.email !== "string")
		throw new Error("Invalid session token payload");

	if (typeof payload.issuedAtUnixMs !== "number")
		throw new Error("Invalid session token payload");

	return payload;
}
