import { cookies } from "next/headers";
import { getAllowedEmails } from "@/lib/auth/allowedEmails";
import { isLocalAuthBypassEnabled } from "@/lib/auth/localAuth";
import { signOtpToken } from "@/lib/auth/otpToken";
import { sendLoginCode } from "@/lib/email/sendLoginCode";

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

	// Generate 6-digit code
	const code = Math.floor(100000 + Math.random() * 900000).toString();
	const expiresAtUnixMs = Date.now() + 10 * 60 * 1000;

	// Send email
	await sendLoginCode(normalized, code);

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
