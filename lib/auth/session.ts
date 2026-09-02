import "server-only";
import { cookies } from "next/headers";
import { getAllowedEmails } from "./allowedEmails";
import { verifySessionToken } from "./sessionToken";

export async function requireEditorSession() {
	const cookieStore = await cookies();
	const token = cookieStore.get("session")?.value;

	if (!token)
		throw new Error("Unauthorized");

	const session = verifySessionToken(token);

	if (!getAllowedEmails().includes(session.email)) {
		throw new Error("Forbidden");
	}

	return session;
}
