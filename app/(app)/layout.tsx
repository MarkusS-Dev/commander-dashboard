"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import AuthModal from "@/components/AuthModal";

const tabs = [
	{ label: "Dashboard", href: "/" },
	{ label: "Games", href: "/games" },
	{ label: "Decks", href: "/decks" },
	{ label: "Players", href: "/players" },
];

export default function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();

	return (
		<div className="min-h-screen bg-white text-neutral-900">
			<div className="mx-auto max-w-6xl px-6 pt-10">
				{/* Title */}
				<h1 className="text-3xl font-semibold tracking-tight text-center">
					Commander stats
				</h1>
				{/* Tabs + auth */}
<div className="mt-6 flex items-center">
	<div className="h-px flex-1 bg-neutral-300" />

	{tabs.map((tab, index) => {
		const isActive =
			tab.href === "/"
				? pathname === "/"
				: pathname.startsWith(tab.href);

		return (
			<div key={tab.href} className="flex items-center">
				<Link
					href={tab.href}
					className={[
						"px-4 py-2 text-sm border border-neutral-300 bg-white",
						isActive
							? "font-medium text-neutral-900"
							: "text-neutral-600 hover:bg-neutral-100",
					].join(" ")}
				>
					{tab.label}
				</Link>

				{index < tabs.length - 1 && (
					<div className="h-px w-8 bg-neutral-300 -mx-px" />
				)}
			</div>
		);
	})}

	<div className="h-px flex-1 bg-neutral-300" />

	<AuthControl />
</div>



				{/* Body */}
				<main className="mt-16">{children}</main>
			</div>
		</div>
	);
}

/* ───────────────────────────────────────────────────────────── */

function AuthControl() {
	const auth = useAuth();
	const [open, setOpen] = useState(false);

	if (auth.status === "loading") {
		return (
			<div className="text-sm text-neutral-400">
				…
			</div>
		);
	}

	if (auth.status === "authenticated") {
		return (
			<div className="text-sm text-neutral-600 whitespace-nowrap">
				{auth.email}
			</div>
		);
	}

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className="border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 whitespace-nowrap"
			>
				Sign in
			</button>

			{open && (
				<AuthModal
					onClose={() => setOpen(false)}
					onSuccess={() => {
						setOpen(false);
						location.reload();
					}}
				/>
			)}
		</>
	);
}
