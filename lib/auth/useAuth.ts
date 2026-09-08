"use client";

import { useEffect, useState } from "react";
import { getLocalAuthEmail, isLocalAuthBypassEnabled } from "./localAuth";
import { fetchJsonCached } from "@/lib/client/fetchCache";

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

		async function check() {
			type AuthMeResponse = {
				authenticated?: boolean;
				email?: string;
			};

			try {
				const data = await fetchJsonCached<AuthMeResponse>("/api/auth/me", { ttlMs: 15_000 });
				if (!data.authenticated || typeof data.email !== "string" || !data.email) {
					setState({ status: "unauthenticated" });
					return;
				}

				setState({ status: "authenticated", email: data.email });
			} catch {
				setState({ status: "unauthenticated" });
			}
		}

		void check();
	}, []);

	return state;
}
