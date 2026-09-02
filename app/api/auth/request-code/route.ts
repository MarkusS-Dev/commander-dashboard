import { getAllowedEmails } from "@/lib/auth/allowedEmails";
import { isLocalAuthBypassEnabled } from "@/lib/auth/localAuth";
import { setOtp } from "@/lib/auth/otpStore";
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

	// Store for 10 minutes
	setOtp(normalized, code, 10);

	// Send email
	await sendLoginCode(normalized, code);

	return Response.json({ ok: true });
}
