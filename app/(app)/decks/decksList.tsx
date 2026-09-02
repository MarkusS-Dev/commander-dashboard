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
	commanderAName?: string;
	commanderAImageUrl?: string;
	commanderBId?: string | number;
	commanderBName?: string;
	commanderBImageUrl?: string;
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
	const [editDeckOpen, setEditDeckOpen] = useState(false);
	const [commandersLoading, setCommandersLoading] = useState(false);
	const [commandersLoaded, setCommandersLoaded] = useState(false);

	const [name, setName] = useState("");
	const [playerId, setPlayerId] = useState<number | "">("");
	const [commanderAId, setCommanderAId] = useState("");
	const [commanderAName, setCommanderAName] = useState("");
	const [commanderAImageUrl, setCommanderAImageUrl] = useState("");
	const [commanderBId, setCommanderBId] = useState("");
	const [commanderBName, setCommanderBName] = useState("");
	const [commanderBImageUrl, setCommanderBImageUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [editingDeckId, setEditingDeckId] = useState<number | null>(null);
	const [editName, setEditName] = useState("");
	const [editPlayerId, setEditPlayerId] = useState<number | "">("");
	const [editCommanderAId, setEditCommanderAId] = useState("");
	const [editCommanderAName, setEditCommanderAName] = useState("");
	const [editCommanderAImageUrl, setEditCommanderAImageUrl] = useState("");
	const [editCommanderBId, setEditCommanderBId] = useState("");
	const [editCommanderBName, setEditCommanderBName] = useState("");
	const [editCommanderBImageUrl, setEditCommanderBImageUrl] = useState("");
	const [editError, setEditError] = useState<string | null>(null);

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
		await loadCommandersForDecks(loadedDecks);
	}

	async function loadCommandersForDecks(loadedDecks: Deck[]) {
		const commanderIds = Array.from(
			new Set(
				loadedDecks
					.flatMap(deck => [deck.commanderAId, deck.commanderBId])
					.filter((id): id is string | number => id != null && id !== "")
					.map(id => String(id))
			)
		);

		if (commanderIds.length === 0) {
			setCommanders([]);
			return;
		}

		try {
			const res = await fetch(`/api/commanders?ids=${commanderIds.map(id => encodeURIComponent(id)).join(",")}`);
			const text = await res.text();
			const loadedCommanders: CommanderSummary[] = text ? JSON.parse(text) : [];
			setCommanders(loadedCommanders);
		} catch {
			setCommanders([]);
		}
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

	function canSaveEditedDeck() {
		return Boolean(editName.trim() && editPlayerId !== "" && editCommanderAId !== "" && editingDeckId !== null);
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
				commanderAName,
				commanderAImageUrl,
				commanderBId: commanderBId === "" ? undefined : commanderBId,
				commanderBName: commanderBName || undefined,
				commanderBImageUrl: commanderBImageUrl || undefined,
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
		setCommanderAImageUrl("");
		setCommanderBId("");
		setCommanderBName("");
		setCommanderBImageUrl("");
		await loadAll();
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

		await loadAll();
	}

	async function openEditDeck(deck: Deck) {
		if (!commandersLoaded) {
			await loadCommanders();
		}

		setEditingDeckId(deck.id);
		setEditName(deck.name);
		setEditPlayerId(deck.playerId);
		setEditCommanderAId(String(deck.commanderAId));
		setEditCommanderAName(deck.commanderAName ?? "");
		setEditCommanderAImageUrl(deck.commanderAImageUrl ?? "");
		setEditCommanderBId(deck.commanderBId != null ? String(deck.commanderBId) : "");
		setEditCommanderBName(deck.commanderBName ?? "");
		setEditCommanderBImageUrl(deck.commanderBImageUrl ?? "");
		setEditError(null);
		setEditDeckOpen(true);
	}

	function closeEditDeck() {
		setEditDeckOpen(false);
		setEditError(null);
		setEditingDeckId(null);
	}

	async function saveEditedDeck() {
		if (!isEditor || editingDeckId == null)
			return;

		setEditError(null);

		if (!editName.trim()) {
			setEditError("Deck name is required");
			return;
		}

		if (editPlayerId === "" || editCommanderAId === "") {
			setEditError("Player and first commander are required");
			return;
		}

		const res = await fetch("/api/decks", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: editingDeckId,
				name: editName,
				playerId: editPlayerId,
				commanderAId: editCommanderAId,
				commanderAName: editCommanderAName,
				commanderAImageUrl: editCommanderAImageUrl,
				commanderBId: editCommanderBId === "" ? undefined : editCommanderBId,
				commanderBName: editCommanderBName || undefined,
				commanderBImageUrl: editCommanderBImageUrl || undefined,
			}),
		});

		if (!res.ok) {
			setEditError(await res.text());
			return;
		}

		await loadAll();
		closeEditDeck();
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
							className="rounded-2xl w-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
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
							<div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl">
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
											className="rounded-2xl w-full border border-neutral-300 px-3 py-2 text-sm"
										/>

										<select
											value={playerId}
											onChange={e => setPlayerId(Number(e.target.value))}
											className="rounded-2xl w-full border border-neutral-300 px-3 py-2 text-sm"
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
												setCommanderAImageUrl(commander?.imageUrl ?? "");
												if (commander?.id === commanderBId) {
													setCommanderBId("");
													setCommanderBName("");
													setCommanderBImageUrl("");
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
												setCommanderBImageUrl(commander?.imageUrl ?? "");
											}}
										/>
									</div>

									<div className="border-t border-neutral-200 px-6 py-4">
										<div className="flex gap-3">
											<button
												onClick={addDeck}
												disabled={!canAddDeck()}
												className="rounded-2xl flex-1 border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
											>
												Add deck
											</button>

											<button
												onClick={closeCreateDeck}
												className="rounded-2xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
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

					{editDeckOpen && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
							<div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl">
								<div className="flex max-h-[85vh] flex-col">
									<div className="border-b border-neutral-200 px-6 py-4">
										<div className="text-lg font-semibold text-neutral-900">
											Edit deck
										</div>
										<div className="text-sm text-neutral-500">
											Update the deck and commanders.
										</div>
									</div>

									<div className="flex-1 space-y-3 overflow-auto px-6 py-4">
										<input
											placeholder="Deck name"
											value={editName}
											onChange={e => setEditName(e.target.value)}
											className="rounded-2xl w-full border border-neutral-300 px-3 py-2 text-sm"
										/>

										<select
											value={editPlayerId}
											onChange={e => {
												const value = e.target.value;
												setEditPlayerId(value === "" ? "" : Number(value));
											}}
											className="rounded-2xl w-full border border-neutral-300 px-3 py-2 text-sm"
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
											selectedId={editCommanderAId}
											selectedName={editCommanderAName}
											commanders={commanders}
											onSelect={commander => {
												setEditCommanderAId(commander?.id ?? "");
												setEditCommanderAName(commander?.name ?? "");
												setEditCommanderAImageUrl(commander?.imageUrl ?? "");
												if (commander?.id === editCommanderBId) {
													setEditCommanderBId("");
													setEditCommanderBName("");
													setEditCommanderBImageUrl("");
												}
											}}
										/>

										<CommanderSearchField
											label="Optional second commander"
											selectedId={editCommanderBId}
											selectedName={editCommanderBName}
											commanders={commanders}
											excludedIds={editCommanderAId ? [editCommanderAId] : []}
											onSelect={commander => {
												setEditCommanderBId(commander?.id ?? "");
												setEditCommanderBName(commander?.name ?? "");
												setEditCommanderBImageUrl(commander?.imageUrl ?? "");
											}}
										/>
									</div>

									<div className="border-t border-neutral-200 px-6 py-4">
										<div className="flex gap-3">
											<button
												onClick={saveEditedDeck}
												disabled={!canSaveEditedDeck()}
												className="rounded-2xl flex-1 border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
											>
												Save
											</button>

											<button
												onClick={closeEditDeck}
												className="rounded-2xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
											>
												Cancel
											</button>
										</div>

										{editError && (
											<p className="mt-3 text-sm text-red-600">
												{editError}
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
					const commanderAText = a?.name ?? d.commanderAName ?? `Commander ${String(d.commanderAId).slice(0, 8)}`;
					const commanderBText = b?.name ?? d.commanderBName;
					const commanderText = commanderBText
						? `${commanderAText} + ${commanderBText}`
						: commanderAText;
					const details = [
						commanderText,
						colors.length > 0 ? colorCombinationName(colors) : null,
						playerName(d.playerId),
					].filter(Boolean).join(" · ");
					const commanderAImage = d.commanderAImageUrl || a?.imageUrl || "";
					const commanderBImage = d.commanderBImageUrl || b?.imageUrl || "";

					return (
						<li
							key={d.id}
							className="flex items-center justify-between gap-4 border-b border-neutral-200 py-2"
						>
							<div className="flex min-w-0 flex-1 items-center gap-3">
								<div className="flex shrink-0 items-center gap-2">
									{commanderAImage && (
										<div className="group relative">
											<img
												src={commanderAImage}
												alt={commanderAText}
												className="h-10 w-7 rounded border border-neutral-200 object-cover object-center"
											/>
											<div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden group-hover:block overflow-hidden rounded-[24px] border border-neutral-300 bg-neutral-50 shadow-2xl">
												<img
													src={commanderAImage}
													alt={commanderAText}
													className="w-60 max-w-[90vw] aspect-[63/88] rounded-[24px] object-contain object-center p-1.5"
												/>
											</div>
										</div>
									)}

									{commanderBImage && (
										<div className="group relative">
											<img
												src={commanderBImage}
												alt={commanderBText ?? d.name}
												className="h-10 w-7 rounded border border-neutral-200 object-cover object-center"
											/>
											<div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden group-hover:block overflow-hidden rounded-[24px] border border-neutral-300 bg-neutral-50 shadow-2xl">
												<img
													src={commanderBImage}
													alt={commanderBText ?? d.name}
													className="w-60 max-w-[90vw] aspect-[63/88] rounded-[24px] object-contain object-center p-1.5"
												/>
											</div>
										</div>
									)}
								</div>

								<div className="min-w-0 flex-1">
									<div className="font-medium text-neutral-900">
										{d.name}
									</div>

									<div className="text-sm text-neutral-600">
										{details}
									</div>
								</div>
								</div>

							{isEditor && (
								<div className="flex items-center gap-3">
									<button
										onClick={() => {
											void openEditDeck(d);
										}}
										className="rounded-2xl px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
									>
										Edit
									</button>

									<button
										onClick={() => removeDeck(d.id)}
										className="rounded-2xl px-3 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-800"
									>
										Delete
									</button>
								</div>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
