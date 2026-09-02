"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/lib/auth/useEditor";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";

type Commander = {
	id: number;
	name: string;
	colors: string[];
	manaCost: string;
};

const COLOR_ORDER = ["White", "Blue", "Black", "Red", "Green"];

/* ---------------------------------------
   Color combination display names
---------------------------------------- */
const COLOR_COMBINATION_NAMES: Record<string, string> = {
	// Two-color (Guilds)
	WhiteBlue: "Azorius",
	WhiteBlack: "Orzhov",
	WhiteRed: "Boros",
	WhiteGreen: "Selesnya",
	BlueBlack: "Dimir",
	BlueRed: "Izzet",
	BlueGreen: "Simic",
	BlackRed: "Rakdos",
	BlackGreen: "Golgari",
	RedGreen: "Gruul",

	// Three-color (Shards)
	WhiteBlueBlack: "Esper",
	WhiteBlueRed: "Jeskai",
	WhiteBlueGreen: "Bant",
	WhiteRedGreen: "Naya",
	BlueBlackRed: "Grixis",

	// Three-color (Wedges)
	WhiteBlackGreen: "Abzan",
	BlueRedGreen: "Temur",
	BlueBlackGreen: "Sultai",
	WhiteBlackRed: "Mardu",

	// Four-color
	WhiteBlueBlackRed: "Sans-Green",
	WhiteBlueBlackGreen: "Sans-Red",
	WhiteBlueRedGreen: "Sans-Black",
	WhiteBlackRedGreen: "Sans-Blue",
	BlueBlackRedGreen: "Sans-White",

	// Five-color
	WhiteBlueBlackRedGreen: "Five-color",
};

function colorCombinationName(colors: string[]): string {
	if (colors.length === 0)
		return "Colorless";

	if (colors.length === 1)
		return colors[0];

	const key = [...colors]
		.sort(
			(a, b) =>
				COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b)
		)
		.join("");

	return COLOR_COMBINATION_NAMES[key] ?? key;
}

/* ---------------------------------------
   Component
---------------------------------------- */
export default function CommandersList() {
	const [commanders, setCommanders] = useState<Commander[]>([]);
	const [name, setName] = useState("");
	const [manaCost, setManaCost] = useState("");
	const [colors, setColors] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);

	const { isEditor } = useEditor();

	useEffect(() => {
		loadCommanders();
	}, []);

	async function loadCommanders() {
		const res = await fetch("/api/commanders");
		if (!res.ok) {
			setCommanders([]);
			return;
		}

		const text = await res.text();
		setCommanders(text ? JSON.parse(text) : []);
	}

	function toggleColor(color: string) {
		setColors(prev =>
			prev.includes(color)
				? prev.filter(c => c !== color)
				: [...prev, color]
		);
	}

	async function addCommander() {
		if (!isEditor)
			return;

		setError(null);

		if (!name.trim()) {
			setError("Name is required");
			return;
		}

		const res = await fetch("/api/commanders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, colors, manaCost }),
		});

		if (!res.ok) {
			setError(await res.text());
			return;
		}

		setName("");
		setManaCost("");
		setColors([]);
		loadCommanders();
	}

	async function removeCommander(id: number) {
		if (!isEditor)
			return;

		const res = await fetch("/api/commanders", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});

		if (!res.ok) {
			alert(await res.text());
			return;
		}

		loadCommanders();
	}

	return (
		<section className="w-full max-w-md space-y-8">

			{/* Read-only banner */}
			<ReadOnlyBanner message="Log in to add or delete commanders." />

			{/* Commanders list */}
			<ul className="space-y-2">
				{commanders.length === 0 && (
					<li className="text-sm text-neutral-500">
						No commanders yet
					</li>
				)}

				{commanders.map(c => (
					<li
						key={c.id}
						className="flex items-center justify-between border-b border-neutral-200 py-2"
					>
						<div>
							<div className="text-neutral-900 font-medium">
								{c.name}
							</div>
							<div className="text-sm text-neutral-600">
								{colorCombinationName(c.colors)}
								{" · "}
								{c.manaCost || "—"}
							</div>
						</div>

						{isEditor && (
							<button
								onClick={() => removeCommander(c.id)}
								className="text-sm text-red-600 hover:text-red-800"
							>
								Delete
							</button>
						)}
					</li>
				))}
			</ul>

			{/* Add commander */}
			{isEditor && (
				<div className="space-y-3">
					<input
						placeholder="Name"
						value={name}
						onChange={e => setName(e.target.value)}
						className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
					/>

					<input
						placeholder="Mana cost (e.g. 2WU)"
						value={manaCost}
						onChange={e => setManaCost(e.target.value)}
						className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
					/>

					<div className="flex flex-wrap gap-3">
						{COLOR_ORDER.map(c => (
							<label
								key={c}
								className="flex items-center gap-1 text-sm"
							>
								<input
									type="checkbox"
									checked={colors.includes(c)}
									onChange={() => toggleColor(c)}
								/>
								{c}
							</label>
						))}
					</div>

					<button
						onClick={addCommander}
						className="w-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
					>
						Add commander
					</button>

					{error && (
						<p className="text-sm text-red-600">
							{error}
						</p>
					)}
				</div>
			)}
		</section>
	);
}
