"use client";

import { useEffect, useState } from "react";
import { getLocalAuthEmail, isLocalAuthBypassEnabled } from "./localAuth";

export type AuthState =
	| { status: "loading" }
	| { status: "unauthenticated" }
	| { status: "authenticated"; email: string };

export function useAuth(): AuthState {
	const [state, setState] = useState<AuthState>(() =>
		isLocalAuthBypassEnabled()
			? { status: "authenticated", email: getLocalAuthEmail() }
			: { status: "loading" }
	);

	useEffect(() => {
		if (isLocalAuthBypassEnabled())
			return;

		check();
	}, []);

	async function check() {
		const res = await fetch("/api/auth/me");
		if (!res.ok) {
			setState({ status: "unauthenticated" });
			return;
		}

		const data = await res.json();
		setState({ status: "authenticated", email: data.email });
	}

	return state;
}
