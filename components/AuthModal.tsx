"use client";

import { useState } from "react";

type Step = "email" | "code";

export default function AuthModal({
	onClose,
	onSuccess,
}: {
	onClose: () => void;
	onSuccess: () => void;
}) {
	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function requestCode() {
		setLoading(true);
		setError(null);

		const res = await fetch("/api/auth/request-code", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});

		setLoading(false);

		if (!res.ok) {
			setError("Email not allowed");
			return;
		}

		setStep("code");
	}

	async function verifyCode() {
		setLoading(true);
		setError(null);

		const res = await fetch("/api/auth/verify-code", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, code }),
		});

		setLoading(false);

		if (!res.ok) {
			setError("Invalid or expired code");
			return;
		}

		onSuccess();
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
			<div className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
				<h2 className="text-lg font-medium">
					{step === "email" ? "Sign in" : "Enter code"}
				</h2>

				{step === "email" && (
					<>
						<input
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							placeholder="you@email.com"
							className="w-full rounded-2xl border border-neutral-300 px-3 py-2 text-sm"
						/>
						<button
							onClick={requestCode}
							disabled={loading}
							className="w-full rounded-2xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
						>
							Send code
						</button>
					</>
				)}

				{step === "code" && (
					<>
						<input
							value={code}
							onChange={e => setCode(e.target.value)}
							placeholder="6-digit code"
							className="w-full rounded-2xl border border-neutral-300 px-3 py-2 text-sm"
						/>
						<button
							onClick={verifyCode}
							disabled={loading}
							className="w-full rounded-2xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
						>
							Verify
						</button>
					</>
				)}

				{error && (
					<div className="text-sm text-red-600">{error}</div>
				)}

				<button
					onClick={onClose}
					className="text-sm text-neutral-500 hover:text-neutral-700"
				>
					Cancel
				</button>
			</div>
		</div>
	);
}
