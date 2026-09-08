"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/lib/auth/useEditor";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
import CommanderSearchField from "@/components/CommanderSearchField";
import type { CommanderSummary } from "@/lib/github/commanderIndexRepository";
import { requiresCommanderColorChoice } from "@/lib/domain/specialCommanderColorChoices";
import {
	fetchJsonCached,
	invalidateFetchCacheByPrefix,
} from "@/lib/client/fetchCache";

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
	commanderAColors?: string[];
	commanderBId?: string | number;
	commanderBName?: string;
	commanderBImageUrl?: string;
	commanderBColors?: string[];
};

type CommanderSlot = "A" | "B";

type DeckMode = "create" | "edit";

type ColorChoiceState = {
	mode: DeckMode;
	slot: CommanderSlot;
	commanderName: string;
} | null;

type DecksListProps = {
	initialPlayers?: Player[];
	initialDecks?: Deck[];
	initialCommanders?: CommanderSummary[];
};

const COLOR_OPTIONS = [
	{ label: "White", value: "W" },
	{ label: "Blue", value: "U" },
	{ label: "Black", value: "B" },
	{ label: "Red", value: "R" },
	{ label: "Green", value: "G" },
];

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

export default function DecksList({
	initialPlayers,
	initialDecks,
	initialCommanders,
}: DecksListProps) {
	const hasInitialData = initialPlayers !== undefined && initialDecks !== undefined && initialCommanders !== undefined;
	const [players, setPlayers] = useState<Player[]>(initialPlayers ?? []);
	const [commandersInDecks, setCommandersInDecks] = useState<CommanderSummary[]>(initialCommanders ?? []);
	const [commanderCatalog, setCommanderCatalog] = useState<CommanderSummary[]>([]);
	const [decks, setDecks] = useState<Deck[]>(initialDecks ?? []);
	const [createDeckOpen, setCreateDeckOpen] = useState(false);
	const [editDeckOpen, setEditDeckOpen] = useState(false);
	const [commandersLoading, setCommandersLoading] = useState(false);
	const [commandersLoaded, setCommandersLoaded] = useState(false);

	const [name, setName] = useState("");
	const [playerId, setPlayerId] = useState<number | "">("");
	const [commanderAId, setCommanderAId] = useState("");
	const [commanderAName, setCommanderAName] = useState("");
	const [commanderAImageUrl, setCommanderAImageUrl] = useState("");
	const [commanderAColors, setCommanderAColors] = useState<string[]>([]);
	const [commanderBId, setCommanderBId] = useState("");
	const [commanderBName, setCommanderBName] = useState("");
	const [commanderBImageUrl, setCommanderBImageUrl] = useState("");
	const [commanderBColors, setCommanderBColors] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [editingDeckId, setEditingDeckId] = useState<number | null>(null);
	const [editName, setEditName] = useState("");
	const [editPlayerId, setEditPlayerId] = useState<number | "">("");
	const [editCommanderAId, setEditCommanderAId] = useState("");
	const [editCommanderAName, setEditCommanderAName] = useState("");
	const [editCommanderAImageUrl, setEditCommanderAImageUrl] = useState("");
	const [editCommanderAColors, setEditCommanderAColors] = useState<string[]>([]);
	const [editCommanderBId, setEditCommanderBId] = useState("");
	const [editCommanderBName, setEditCommanderBName] = useState("");
	const [editCommanderBImageUrl, setEditCommanderBImageUrl] = useState("");
	const [editCommanderBColors, setEditCommanderBColors] = useState<string[]>([]);
	const [editError, setEditError] = useState<string | null>(null);
	const [colorChoice, setColorChoice] = useState<ColorChoiceState>(null);

	const { isEditor } = useEditor();

	useEffect(() => {
		if (!hasInitialData)
			void loadAll();
	}, [hasInitialData]);

	async function loadAll() {
		const [loadedPlayers, loadedDecks] = await Promise.all([
			loadPlayers(),
			loadDecks(),
		]);

		setPlayers(loadedPlayers);
		setDecks(loadedDecks);
		await loadCommandersInDecks();
	}

	async function loadCommandersInDecks() {
		try {
			const loadedCommanders = await fetchJsonCached<CommanderSummary[]>(
				"/api/commanders-in-decks",
				{ ttlMs: 30_000 }
			);
			setCommandersInDecks(loadedCommanders);
		} catch {
			setCommandersInDecks([]);
		}
	}

	async function loadPlayers() {
		return fetchJsonCached<Player[]>("/api/players", { ttlMs: 30_000 });
	}

	async function loadDecks() {
		return fetchJsonCached<Deck[]>("/api/decks", { ttlMs: 30_000 });
	}

	async function loadCommanders() {
		if (commandersLoaded || commandersLoading)
			return;

		setCommandersLoading(true);
		try {
			const loadedCommanders = await fetchJsonCached<CommanderSummary[]>("/api/commanders", {
				ttlMs: 5 * 60_000,
			});
			setCommanderCatalog(loadedCommanders);
			setCommandersLoaded(true);
			setError(null);
		} catch {
			setError("Failed to load full commander catalog. Showing commanders already used in decks.");
		} finally {
			setCommandersLoading(false);
		}
	}

	function playerName(id: number) {
		return players.find(p => p.id === id)?.name ?? "Unknown";
	}

	function commanderColors(deck: Deck, commander: CommanderSummary | null, slot: CommanderSlot) {
		const savedColors = slot === "A" ? deck.commanderAColors : deck.commanderBColors;
		return savedColors ?? commander?.colors ?? [];
	}

	function setCommanderColors(mode: DeckMode, slot: CommanderSlot, colors: string[]) {
		if (mode === "create") {
			if (slot === "A") setCommanderAColors(colors);
			else setCommanderBColors(colors);
			return;
		}

		if (slot === "A") setEditCommanderAColors(colors);
		else setEditCommanderBColors(colors);
	}

	function clearCommanderSelection(mode: DeckMode, slot: CommanderSlot) {
		if (mode === "create") {
			if (slot === "A") {
				setCommanderAId("");
				setCommanderAName("");
				setCommanderAImageUrl("");
				setCommanderAColors([]);
			} else {
				setCommanderBId("");
				setCommanderBName("");
				setCommanderBImageUrl("");
				setCommanderBColors([]);
			}
			return;
		}

		if (slot === "A") {
			setEditCommanderAId("");
			setEditCommanderAName("");
			setEditCommanderAImageUrl("");
			setEditCommanderAColors([]);
		} else {
			setEditCommanderBId("");
			setEditCommanderBName("");
			setEditCommanderBImageUrl("");
			setEditCommanderBColors([]);
		}
	}

	function handleCommanderSelect(mode: DeckMode, slot: CommanderSlot, commander: CommanderSummary | null) {
		const isSpecial = commander != null && requiresCommanderColorChoice(commander.id);
		const colors = commander?.colors ?? [];

		if (mode === "create") {
			if (slot === "A") {
				setCommanderAId(commander?.id ?? "");
				setCommanderAName(commander?.name ?? "");
				setCommanderAImageUrl(commander?.imageUrl ?? "");
				setCommanderAColors(isSpecial ? [] : colors);
				if (commander?.id === commanderBId) {
					setCommanderBId("");
					setCommanderBName("");
					setCommanderBImageUrl("");
					setCommanderBColors([]);
				}
			} else {
				setCommanderBId(commander?.id ?? "");
				setCommanderBName(commander?.name ?? "");
				setCommanderBImageUrl(commander?.imageUrl ?? "");
				setCommanderBColors(isSpecial ? [] : colors);
			}
		} else {
			if (slot === "A") {
				setEditCommanderAId(commander?.id ?? "");
				setEditCommanderAName(commander?.name ?? "");
				setEditCommanderAImageUrl(commander?.imageUrl ?? "");
				setEditCommanderAColors(isSpecial ? [] : colors);
				if (commander?.id === editCommanderBId) {
					setEditCommanderBId("");
					setEditCommanderBName("");
					setEditCommanderBImageUrl("");
					setEditCommanderBColors([]);
				}
			} else {
				setEditCommanderBId(commander?.id ?? "");
				setEditCommanderBName(commander?.name ?? "");
				setEditCommanderBImageUrl(commander?.imageUrl ?? "");
				setEditCommanderBColors(isSpecial ? [] : colors);
			}
		}

		if (isSpecial && commander) {
			setColorChoice({ mode, slot, commanderName: commander.name });
		} else if (colorChoice?.mode === mode && colorChoice.slot === slot) {
			setColorChoice(null);
		}
	}

	function commandersByDeck(deck: Deck) {
		const a = commandersInDecks.find(c => c.id === String(deck.commanderAId));
		const b =
			deck.commanderBId != null
				? commandersInDecks.find(c => c.id === String(deck.commanderBId))
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
		if (!name.trim() || playerId === "" || commanderAId === "")
			return false;

		if (requiresCommanderColorChoice(commanderAId) && commanderAColors.length === 0)
			return false;

		if (commanderBId && requiresCommanderColorChoice(commanderBId) && commanderBColors.length === 0)
			return false;

		return true;
	}

	function canSaveEditedDeck() {
		if (!editName.trim() || editPlayerId === "" || editCommanderAId === "" || editingDeckId === null)
			return false;

		if (requiresCommanderColorChoice(editCommanderAId) && editCommanderAColors.length === 0)
			return false;

		if (editCommanderBId && requiresCommanderColorChoice(editCommanderBId) && editCommanderBColors.length === 0)
			return false;

		return true;
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
				commanderAColors,
				commanderBId: commanderBId === "" ? undefined : commanderBId,
				commanderBName: commanderBName || undefined,
				commanderBImageUrl: commanderBImageUrl || undefined,
				commanderBColors,
			}),
		});

		if (!res.ok) {
			setError(await res.text());
			return;
		}

		invalidateFetchCacheByPrefix([
			"/api/decks",
			"/api/games",
			"/api/commanders",
			"/api/commanders-in-decks",
			"/api/bootstrap",
		]);

		setName("");
		setPlayerId("");
		setCommanderAId("");
		setCommanderAName("");
		setCommanderAImageUrl("");
		setCommanderAColors([]);
		setCommanderBId("");
		setCommanderBName("");
		setCommanderBImageUrl("");
		setCommanderBColors([]);
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

		invalidateFetchCacheByPrefix([
			"/api/decks",
			"/api/games",
			"/api/commanders",
			"/api/commanders-in-decks",
			"/api/bootstrap",
		]);

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
		setEditCommanderAColors(deck.commanderAColors ?? []);
		setEditCommanderBId(deck.commanderBId != null ? String(deck.commanderBId) : "");
		setEditCommanderBName(deck.commanderBName ?? "");
		setEditCommanderBImageUrl(deck.commanderBImageUrl ?? "");
		setEditCommanderBColors(deck.commanderBColors ?? []);
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
				commanderAColors: editCommanderAColors,
				commanderBId: editCommanderBId === "" ? undefined : editCommanderBId,
				commanderBName: editCommanderBName || undefined,
				commanderBImageUrl: editCommanderBImageUrl || undefined,
				commanderBColors: editCommanderBColors,
			}),
		});

		if (!res.ok) {
			setEditError(await res.text());
			return;
		}

		invalidateFetchCacheByPrefix([
			"/api/decks",
			"/api/games",
			"/api/commanders",
			"/api/commanders-in-decks",
			"/api/bootstrap",
		]);

		await loadAll();
		closeEditDeck();
	}

	const showLoadingOverlay = commandersLoading && !createDeckOpen;
	const commanderSearchOptions = commandersLoaded
		? commanderCatalog
		: commandersInDecks;

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
											key={`create-a-${commanderAId}`}
											label="First commander"
											selectedId={commanderAId}
											selectedName={commanderAName}
											commanders={commanderSearchOptions}
											onSelect={commander => handleCommanderSelect("create", "A", commander)}
										/>

										<CommanderSearchField
											key={`create-b-${commanderBId}`}
											label="Optional second commander"
											selectedId={commanderBId}
											selectedName={commanderBName}
											commanders={commanderSearchOptions}
											excludedIds={commanderAId ? [commanderAId] : []}
											onSelect={commander => handleCommanderSelect("create", "B", commander)}
										/>

										{colorChoice?.mode === "create" && (
											<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
												<div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
													<div className="text-lg font-semibold text-neutral-900">Choose a color</div>
													<p className="mt-1 text-sm text-neutral-600">
														{colorChoice.commanderName} needs a chosen color.
													</p>
													<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
														{COLOR_OPTIONS.map(option => (
															<button
																key={option.value}
																type="button"
																onClick={() => {
																	setCommanderColors("create", colorChoice.slot, [option.value]);
																	setColorChoice(null);
																}}
																className="rounded-2xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
															>
																{option.label}
															</button>
														))}
													</div>
													<button
														type="button"
														onClick={() => {
															clearCommanderSelection("create", colorChoice.slot);
															setColorChoice(null);
														}}
														className="mt-4 rounded-2xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
													>
														Cancel
													</button>
												</div>
											</div>
										)}
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
											key={`edit-a-${editCommanderAId}`}
											label="First commander"
											selectedId={editCommanderAId}
											selectedName={editCommanderAName}
											commanders={commanderSearchOptions}
											onSelect={commander => handleCommanderSelect("edit", "A", commander)}
										/>

										<CommanderSearchField
											key={`edit-b-${editCommanderBId}`}
											label="Optional second commander"
											selectedId={editCommanderBId}
											selectedName={editCommanderBName}
											commanders={commanderSearchOptions}
											excludedIds={editCommanderAId ? [editCommanderAId] : []}
											onSelect={commander => handleCommanderSelect("edit", "B", commander)}
										/>

										{colorChoice?.mode === "edit" && (
											<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
												<div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
													<div className="text-lg font-semibold text-neutral-900">Choose a color</div>
													<p className="mt-1 text-sm text-neutral-600">
														{colorChoice.commanderName} needs a chosen color.
													</p>
													<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
														{COLOR_OPTIONS.map(option => (
															<button
																key={option.value}
																type="button"
																onClick={() => {
																	setCommanderColors("edit", colorChoice.slot, [option.value]);
																	setColorChoice(null);
																}}
																className="rounded-2xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
															>
																{option.label}
															</button>
														))}
													</div>
													<button
														type="button"
														onClick={() => {
															clearCommanderSelection("edit", colorChoice.slot);
															setColorChoice(null);
														}}
														className="mt-4 rounded-2xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
													>
														Cancel
													</button>
												</div>
											</div>
										)}
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
					const colors = [
						...(d.commanderAColors ?? a?.colors ?? []),
						...(d.commanderBColors ?? b?.colors ?? []),
					];
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
