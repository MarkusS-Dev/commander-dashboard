import "server-only";
import { cookies } from "next/headers";
import { getAllowedEmails } from "./allowedEmails";
import { getLocalAuthEmail, isLocalAuthBypassEnabled } from "./localAuth";
import { verifySessionToken } from "./sessionToken";

type Session = {
	email: string;
};


export async function requireEditorSession(): Promise<Session> {
	if (isLocalAuthBypassEnabled()) {
		return { email: getLocalAuthEmail() };
	}

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
