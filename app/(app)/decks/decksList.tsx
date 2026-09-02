"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/lib/auth/useEditor";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
import CommanderSearchField from "@/components/CommanderSearchField";
import type { CommanderSummary } from "@/lib/github/commanderIndexRepository";

type Player = {
	id: number;
	name: string;
};

type Deck = {
	id: number;
	name: string;
	playerId: number;
	commanderAId: string | number;
	commanderBId?: string | number;
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
		.sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b))
		.join("");

	return COLOR_COMBINATION_NAMES[key] ?? key;
}

export default function DecksList() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [commanders, setCommanders] = useState<CommanderSummary[]>([]);
	const [decks, setDecks] = useState<Deck[]>([]);
	const [createDeckOpen, setCreateDeckOpen] = useState(false);
	const [commandersLoading, setCommandersLoading] = useState(false);
	const [commandersLoaded, setCommandersLoaded] = useState(false);

	const [name, setName] = useState("");
	const [playerId, setPlayerId] = useState<number | "">("");
	const [commanderAId, setCommanderAId] = useState("");
	const [commanderAName, setCommanderAName] = useState("");
	const [commanderBId, setCommanderBId] = useState("");
	const [commanderBName, setCommanderBName] = useState("");
	const [error, setError] = useState<string | null>(null);

	const { isEditor } = useEditor();

	useEffect(() => {
		void loadAll();
	}, []);

	async function loadAll() {
		const [loadedPlayers, loadedDecks] = await Promise.all([
			loadPlayers(),
			loadDecks(),
		]);

		setPlayers(loadedPlayers);
		setDecks(loadedDecks);
	}

	async function loadPlayers() {
		const res = await fetch("/api/players");
		const text = await res.text();
		return text ? JSON.parse(text) : [];
	}

	async function loadDecks() {
		const res = await fetch("/api/decks");
		const text = await res.text();
		return text ? JSON.parse(text) : [];
	}

	async function loadCommanders() {
		if (commandersLoaded || commandersLoading)
			return;

		setCommandersLoading(true);
		try {
			const res = await fetch("/api/commanders");
			const text = await res.text();
			const loadedCommanders: CommanderSummary[] = text ? JSON.parse(text) : [];
			setCommanders(loadedCommanders);
			setCommandersLoaded(true);
		} finally {
			setCommandersLoading(false);
		}
	}

	function playerName(id: number) {
		return players.find(p => p.id === id)?.name ?? "Unknown";
	}

	function commandersByDeck(deck: Deck) {
		const a = commanders.find(c => c.id === String(deck.commanderAId));
		const b =
			deck.commanderBId != null
				? commanders.find(c => c.id === String(deck.commanderBId))
				: null;

		return { a, b };
	}

	async function openCreateDeck() {
		if (!commandersLoaded) {
			await loadCommanders();
		}

		setCreateDeckOpen(true);
	}

	function closeCreateDeck() {
		setCreateDeckOpen(false);
		setError(null);
	}

	function canAddDeck() {
		return Boolean(name.trim() && playerId !== "" && commanderAId !== "");
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
				commanderBId: commanderBId === "" ? undefined : commanderBId,
			}),
		});

		if (!res.ok) {
			setError(await res.text());
			return;
		}

		setName("");
		setPlayerId("");
		setCommanderAId("");
		setCommanderAName("");
		setCommanderBId("");
		setCommanderBName("");
		const updatedDecks = await loadDecks();
		setDecks(updatedDecks);
		closeCreateDeck();
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

		const updatedDecks = await loadDecks();
		setDecks(updatedDecks);
	}

	const showLoadingOverlay = commandersLoading && !createDeckOpen;

	return (
		<section className="w-full max-w-md space-y-8">
			<ReadOnlyBanner message="Log in to add or delete decks." />

			{isEditor && (
				<div className="space-y-3">
					<button
						onClick={openCreateDeck}
						disabled={showLoadingOverlay}
						className="w-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
					>
						Create a deck
					</button>

					{showLoadingOverlay && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
							<div className="flex w-full max-w-sm flex-col items-center gap-3 border border-neutral-200 bg-white px-6 py-10 text-center shadow-2xl">
								<div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
								<div className="text-sm text-neutral-600">
									Loading commander catalog from Scryfall...
								</div>
							</div>
						</div>
					)}

					{createDeckOpen && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
							<div className="w-full max-w-lg border border-neutral-200 bg-white shadow-2xl">
								<div className="flex max-h-[85vh] flex-col">
									<div className="border-b border-neutral-200 px-6 py-4">
										<div className="text-lg font-semibold text-neutral-900">
											Create a deck
										</div>
										<div className="text-sm text-neutral-500">
											Fill in the required fields below.
										</div>
									</div>

									<div className="flex-1 space-y-3 overflow-auto px-6 py-4">
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

										<CommanderSearchField
											label="First commander"
											selectedId={commanderAId}
											selectedName={commanderAName}
											commanders={commanders}
											onSelect={commander => {
												setCommanderAId(commander?.id ?? "");
												setCommanderAName(commander?.name ?? "");
												if (commander?.id === commanderBId) {
													setCommanderBId("");
													setCommanderBName("");
												}
											}}
										/>

										<CommanderSearchField
											label="Optional second commander"
											selectedId={commanderBId}
											selectedName={commanderBName}
											commanders={commanders}
											excludedIds={commanderAId ? [commanderAId] : []}
											onSelect={commander => {
												setCommanderBId(commander?.id ?? "");
												setCommanderBName(commander?.name ?? "");
											}}
										/>
									</div>

									<div className="border-t border-neutral-200 px-6 py-4">
										<div className="flex gap-3">
											<button
												onClick={addDeck}
												disabled={!canAddDeck()}
												className="flex-1 border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
											>
												Add deck
											</button>

											<button
												onClick={closeCreateDeck}
												className="border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
											>
												Cancel
											</button>
										</div>

										{error && (
											<p className="mt-3 text-sm text-red-600">
												{error}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			<ul className="space-y-2">
				{decks.length === 0 && (
					<li className="text-sm text-neutral-500">No decks yet</li>
				)}

				{decks.map(d => {
					const { a, b } = commandersByDeck(d);
					const colors = [...(a?.colors ?? []), ...(b?.colors ?? [])];

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
		</section>
	);
}
