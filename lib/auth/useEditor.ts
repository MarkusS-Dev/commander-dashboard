"use client";

import { useEffect, useState } from "react";
import { isLocalAuthBypassEnabled } from "./localAuth";

export function useEditor() {
	const [isEditor, setIsEditor] = useState(() => isLocalAuthBypassEnabled());
	const [ready, setReady] = useState(() => isLocalAuthBypassEnabled());

	useEffect(() => {
		if (isLocalAuthBypassEnabled())
			return;

		let cancelled = false;

		async function check() {
			try {
				const res = await fetch("/api/auth/me");
				if (!cancelled)
					setIsEditor(res.ok);
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
