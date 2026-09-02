const LOCAL_AUTH_EMAIL =
	process.env.NEXT_PUBLIC_LOCAL_AUTH_EMAIL?.trim() || "local@dev";

export function isLocalAuthBypassEnabled() {
	const raw = process.env.NEXT_PUBLIC_LOCAL_AUTH_BYPASS;

	if (raw == null || raw.trim() === "")
		return process.env.NODE_ENV !== "production";

	return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

export function getLocalAuthEmail() {
	return LOCAL_AUTH_EMAIL;
}