"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/lib/auth/useEditor";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";

type Player = {
	id: number;
	name: string;
};

type Commander = {
	id: number;
	name: string;
	colors: string[];
};

type Deck = {
	id: number;
	name: string;
	playerId: number;
	commanderAId: number;
	commanderBId?: number;
};

const COLOR_ORDER = ["White", "Blue", "Black", "Red", "Green"];

const COLOR_COMBINATION_NAMES: Record<string, string> = {
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

	WhiteBlueBlack: "Esper",
	WhiteBlueRed: "Jeskai",
	WhiteBlueGreen: "Bant",
	WhiteRedGreen: "Naya",
	BlueBlackRed: "Grixis",

	WhiteBlackGreen: "Abzan",
	BlueRedGreen: "Temur",
	BlueBlackGreen: "Sultai",
	WhiteBlackRed: "Mardu",

	WhiteBlueBlackRed: "Sans-Green",
	WhiteBlueBlackGreen: "Sans-Red",
	WhiteBlueRedGreen: "Sans-Black",
	WhiteBlackRedGreen: "Sans-Blue",
	BlueBlackRedGreen: "Sans-White",

	WhiteBlueBlackRedGreen: "Five-color",
};

function colorCombinationName(colors: string[]): string {
	if (colors.length === 0)
		return "Colorless";

	if (colors.length === 1)
		return colors[0];

	const key = [...new Set(colors)]
		.sort(
			(a, b) =>
				COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b)
		)
		.join("");

	return COLOR_COMBINATION_NAMES[key] ?? key;
}

export default function DecksList() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [commanders, setCommanders] = useState<Commander[]>([]);
	const [decks, setDecks] = useState<Deck[]>([]);

	const [name, setName] = useState("");
	const [playerId, setPlayerId] = useState<number | "">("");
	const [commanderAId, setCommanderAId] = useState<number | "">("");
	const [commanderBId, setCommanderBId] = useState<number | "">("");
	const [error, setError] = useState<string | null>(null);

	const { isEditor } = useEditor();

	useEffect(() => {
		loadAll();
	}, []);

	async function loadAll() {
		await Promise.all([
			loadPlayers(),
			loadCommanders(),
			loadDecks(),
		]);
	}

	async function loadPlayers() {
		const res = await fetch("/api/players");
		const text = await res.text();
		setPlayers(text ? JSON.parse(text) : []);
	}

	async function loadCommanders() {
		const res = await fetch("/api/commanders");
		const text = await res.text();
		setCommanders(text ? JSON.parse(text) : []);
	}

	async function loadDecks() {
		const res = await fetch("/api/decks");
		const text = await res.text();
		setDecks(text ? JSON.parse(text) : []);
	}

	function playerName(id: number) {
		return players.find(p => p.id === id)?.name ?? "Unknown";
	}

	function commandersByDeck(deck: Deck) {
		const a = commanders.find(c => c.id === deck.commanderAId);
		const b =
			deck.commanderBId != null
				? commanders.find(c => c.id === deck.commanderBId)
				: null;

		return { a, b };
	}

	async function addDeck() {
		if (!isEditor)
			return;

		setError(null);

		if (!name.trim()) {
			setError("Deck name is required");
			return;
		}

		if (playerId === "" || commanderAId === "") {
			setError("Player and first commander are required");
			return;
		}

		const res = await fetch("/api/decks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				playerId,
				commanderAId,
				commanderBId:
					commanderBId === "" ? undefined : commanderBId,
			}),
		});

		if (!res.ok) {
			setError(await res.text());
			return;
		}

		setName("");
		setPlayerId("");
		setCommanderAId("");
		setCommanderBId("");
		loadDecks();
	}

	async function removeDeck(id: number) {
		if (!isEditor)
			return;

		const res = await fetch("/api/decks", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});

		if (!res.ok) {
			alert(await res.text());
			return;
		}

		loadDecks();
	}

	return (
		<section className="w-full max-w-md space-y-8">

			{/* Read-only banner */}
			<ReadOnlyBanner message="Log in to add or delete decks." />

			<ul className="space-y-2">
				{decks.length === 0 && (
					<li className="text-sm text-neutral-500">
						No decks yet
					</li>
				)}

				{decks.map(d => {
					const { a, b } = commandersByDeck(d);

					const colors = [
						...(a?.colors ?? []),
						...(b?.colors ?? []),
					];

					return (
						<li
							key={d.id}
							className="flex items-center justify-between border-b border-neutral-200 py-2"
						>
							<div>
								<div className="font-medium text-neutral-900">
									{d.name}
								</div>

								<div className="text-sm text-neutral-600">
									{a
										? `${a.name}${b ? ` + ${b.name}` : ""} · ${colorCombinationName(colors)} · ${playerName(d.playerId)}`
										: "Unknown commander"}
								</div>
							</div>

							{isEditor && (
								<button
									onClick={() => removeDeck(d.id)}
									className="text-sm text-red-600 hover:text-red-800"
								>
									Delete
								</button>
							)}
						</li>
					);
				})}
			</ul>

			{/* Add deck */}
			{isEditor && (
				<div className="space-y-3">
					<input
						placeholder="Deck name"
						value={name}
						onChange={e => setName(e.target.value)}
						className="w-full border border-neutral-300 px-3 py-2 text-sm"
					/>

					<select
						value={playerId}
						onChange={e => setPlayerId(Number(e.target.value))}
						className="w-full border border-neutral-300 px-3 py-2 text-sm"
					>
						<option value="">Select player</option>
						{players.map(p => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>

					<select
						value={commanderAId}
						onChange={e => setCommanderAId(Number(e.target.value))}
						className="w-full border border-neutral-300 px-3 py-2 text-sm"
					>
						<option value="">Select commander</option>
						{commanders.map(c => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>

					<select
						value={commanderBId}
						onChange={e => setCommanderBId(Number(e.target.value))}
						className="w-full border border-neutral-300 px-3 py-2 text-sm"
					>
						<option value="">
							Optional second commander
						</option>
						{commanders
							.filter(c => c.id !== commanderAId)
							.map(c => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
					</select>

					<button
						onClick={addDeck}
						className="w-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
					>
						Add deck
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
