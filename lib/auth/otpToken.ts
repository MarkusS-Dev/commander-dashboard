import "server-only";
import crypto from "crypto";

type OtpPayload = {
	email: string;
	code: string;
	expiresAtUnixMs: number;
};

const algo = "sha256";

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
	return crypto.createHmac(algo, getSecret()).update(data).digest("hex");
}

export function signOtpToken(payload: OtpPayload): string {
	const body = base64UrlEncode(JSON.stringify(payload));
	const sig = sign(body);
	return `${body}.${sig}`;
}

export function verifyOtpToken(token: string): OtpPayload {
	const parts = token.split(".");
	if (parts.length !== 2)
		throw new Error("Invalid OTP token");

	const [body, sig] = parts;
	const expected = sign(body);
	const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

	if (!ok)
		throw new Error("Invalid OTP token");

	const payload = JSON.parse(base64UrlDecode(body)) as OtpPayload;

	if (typeof payload.email !== "string")
		throw new Error("Invalid OTP token payload");

	if (typeof payload.code !== "string")
		throw new Error("Invalid OTP token payload");

	if (typeof payload.expiresAtUnixMs !== "number")
		throw new Error("Invalid OTP token payload");

	return payload;
}