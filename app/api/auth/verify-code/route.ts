// app/api/auth/verify-code/route.ts
import { cookies } from "next/headers";
import { getAllowedEmails } from "@/lib/auth/allowedEmails";
import { getLocalAuthEmail, isLocalAuthBypassEnabled } from "@/lib/auth/localAuth";
import { consumeOtp } from "@/lib/auth/otpStore";
import { signSessionToken } from "@/lib/auth/sessionToken";

type VerifyCodeRequest = {
	email: string;
	code: string;
};

export async function POST(req: Request) {
	if (isLocalAuthBypassEnabled()) {
		const token = signSessionToken({
			email: getLocalAuthEmail(),
			issuedAtUnixMs: Date.now(),
		});

		const cookieStore = await cookies();
		cookieStore.set("session", token, {
			httpOnly: true,
			secure: false,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 30,
		});

		return Response.json({ ok: true });
	}

	const body = (await req.json()) as Partial<VerifyCodeRequest>;
	const email = (body.email ?? "").trim().toLowerCase();
	const code = (body.code ?? "").trim();

	if (email.length === 0 || code.length === 0) {
		return Response.json(
			{ error: "Missing email or code" },
			{ status: 400 }
		);
	}

	if (!getAllowedEmails().includes(email)) {
		return Response.json(
			{ error: "Not authorized" },
			{ status: 403 }
		);
	}

	const isValid = consumeOtp(email, code);

	if (!isValid) {
		return Response.json(
			{ error: "Invalid or expired code" },
			{ status: 401 }
		);
	}

	const token = signSessionToken({
		email,
		issuedAtUnixMs: Date.now(),
	});

	const cookieStore = await cookies();

	cookieStore.set("session", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 30, // 30 days
	});

	return Response.json({ ok: true });
}
