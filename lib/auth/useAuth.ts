"use client";

import { useEffect, useState } from "react";

export type AuthState =
	| { status: "loading" }
	| { status: "unauthenticated" }
	| { status: "authenticated"; email: string };

export function useAuth(): AuthState {
	const [state, setState] = useState<AuthState>({ status: "loading" });

	useEffect(() => {
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
