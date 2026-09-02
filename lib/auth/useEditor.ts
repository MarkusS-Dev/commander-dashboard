"use client";

import { useEffect, useState } from "react";

export function useEditor() {
	const [isEditor, setIsEditor] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
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
