"use client";

import { useEffect, useState } from "react";
import { isLocalAuthBypassEnabled } from "./localAuth";
import { fetchJsonCached } from "@/lib/client/fetchCache";

export function useEditor() {
	const [isEditor, setIsEditor] = useState(() => isLocalAuthBypassEnabled());
	const [ready, setReady] = useState(() => isLocalAuthBypassEnabled());

	useEffect(() => {
		if (isLocalAuthBypassEnabled())
			return;

		let cancelled = false;

		async function check() {
			try {
				const data = await fetchJsonCached<{ authenticated?: boolean }>("/api/auth/me", {
					ttlMs: 15_000,
				});
				if (!cancelled)
					setIsEditor(Boolean(data.authenticated));
			} catch {
				if (!cancelled)
					setIsEditor(false);
			} finally {
				if (!cancelled)
					setReady(true);
			}
		}

		check();

		return () => {
			cancelled = true;
		};
	}, []);

	return { isEditor, ready };
}
