import "server-only";

export function getAllowedEmails(): string[] {
	const raw = process.env.ALLOWED_EMAILS;

	if (!raw)
		return [];

	return raw
		.split(",")
		.map(e => e.trim().toLowerCase())
		.filter(Boolean);
}
