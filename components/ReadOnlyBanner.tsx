"use client";

import { useEditor } from "@/lib/auth/useEditor";

type ReadOnlyBannerProps = {
	message?: string;
};

export default function ReadOnlyBanner({
	message = "You are viewing this page in read-only mode. Log in to edit.",
}: ReadOnlyBannerProps) {
	const { isEditor, ready } = useEditor();

	if (!ready || isEditor)
		return null;

	return (
		<div className="border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
			{message}
		</div>
	);
}
