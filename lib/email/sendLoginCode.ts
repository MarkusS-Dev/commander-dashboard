import "server-only";
import { Resend } from "resend";

export async function sendLoginCode(
	email: string,
	code: string
) {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.EMAIL_FROM;

	if (!apiKey) {
		throw new Error("RESEND_API_KEY is missing");
	}

	if (!from) {
		throw new Error("EMAIL_FROM is missing");
	}

	const resend = new Resend(apiKey);

	await resend.emails.send({
		from,
		to: email,
		subject: "Your login code",
		text: `Your login code is: ${code}

This code expires in 10 minutes.

If you did not request this, you can ignore this email.`,
	});
}
