import { cookies } from "next/headers";
import { getAllowedEmails } from "@/lib/auth/allowedEmails";
import { isLocalAuthBypassEnabled } from "@/lib/auth/localAuth";
import { signOtpToken } from "@/lib/auth/otpToken";
import { sendLoginCode } from "@/lib/email/sendLoginCode";
import crypto from "node:crypto";

const REQUEST_COOLDOWN_MS = 60_000;
const lastCodeRequestByEmail = new Map<string, number>();

export async function POST(req: Request) {
	if (isLocalAuthBypassEnabled()) {
		return Response.json({ ok: true });
	}

	const { email } = await req.json();
	const normalized = String(email).toLowerCase().trim();

	if (!normalized) {
		return Response.json(
			{ error: "Email is required" },
			{ status: 400 }
		);
	}

	if (!getAllowedEmails().includes(normalized)) {
		// Do NOT reveal allow-list
		return Response.json({ ok: true });
	}

	const lastRequestAt = lastCodeRequestByEmail.get(normalized) ?? 0;
	if (Date.now() - lastRequestAt < REQUEST_COOLDOWN_MS)
		return Response.json({ ok: true });

	// Generate 6-digit code
	const code = crypto.randomInt(100000, 1_000_000).toString();
	const expiresAtUnixMs = Date.now() + 10 * 60 * 1000;

	// Send email
	await sendLoginCode(normalized, code);
	lastCodeRequestByEmail.set(normalized, Date.now());

	const cookieStore = await cookies();
	cookieStore.set("otp_challenge", signOtpToken({
		email: normalized,
		code,
		expiresAtUnixMs,
	}), {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 10,
	});

	return Response.json({ ok: true });
}
