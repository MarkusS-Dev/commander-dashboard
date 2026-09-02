"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditor } from "@/lib/auth/useEditor";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
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

type Game = {
	id: number;
	date: string;
	deckIds: number[];
	winnerDeckId: number;
	notes?: string;
};

export default function GamesList() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [commandersById, setCommandersById] = useState<
		Record<string, CommanderSummary>
	>({});
	const [decks, setDecks] = useState<Deck[]>([]);
	const [games, setGames] = useState<Game[]>([]);

	const [logGameOpen, setLogGameOpen] = useState(false);
	const [logGameLoading, setLogGameLoading] = useState(false);

	const [seatCount, setSeatCount] = useState<number>(4);
	const [seatedDeckIds, setSeatedDeckIds] = useState<(number | "")[]>([
		"", "", "", "",
	]);
	const [winnerDeckId, setWinnerDeckId] = useState<number | "">("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

	const { isEditor } = useEditor();

	useEffect(() => {
		void loadAll();
	}, []);

	useEffect(() => {
		setSeatedDeckIds(prev => {
			const next = [...prev];
			next.length = seatCount;
			while (next.length < seatCount)
				next.push("");
			return next;
		});
		setWinnerDeckId("");
	}, [seatCount]);

	async function loadAll() {
		const [loadedPlayers, loadedDecks, loadedGames] = await Promise.all([
			loadPlayers(),
			loadDecks(),
			loadGames(),
		]);

		setPlayers(loadedPlayers);
		setDecks(loadedDecks);
		setGames(loadedGames);
		await loadCommandersForDecks(loadedDecks);
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

	async function loadGames() {
		const res = await fetch("/api/games");
		const text = await res.text();
		return text ? JSON.parse(text) : [];
	}

	async function loadCommandersForDecks(loadedDecks: Deck[]) {
		const ids = Array.from(
			new Set(
				loadedDecks
					.flatMap(deck => [deck.commanderAId, deck.commanderBId])
					.filter((id): id is string | number => id != null && id !== "")
			)
		);

		if (ids.length === 0) {
			setCommandersById({});
			return;
		}

		const res = await fetch(
			`/api/commanders?ids=${ids.map(id => encodeURIComponent(String(id))).join(",")}`
		);
		const text = await res.text();
		const commanders: CommanderSummary[] = text ? JSON.parse(text) : [];
		setCommandersById(
			Object.fromEntries(commanders.map(commander => [commander.id, commander]))
		);
	}

	function deckLabel(deck: Deck) {
		const player = players.find(p => p.id === deck.playerId)?.name ?? "Unknown";
		const commanderA = commandersById[String(deck.commanderAId)]?.name ?? "Unknown";
		const commanderB =
			deck.commanderBId != null
				? commandersById[String(deck.commanderBId)]?.name
				: null;

		return `${deck.name} · ${commanderB ? `${commanderA} + ${commanderB}` : commanderA} · ${player}`;
	}

	function updateSeat(index: number, value: string) {
		const deckId = value ? Number(value) : "";
		setSeatedDeckIds(prev => {
			const next = [...prev];
			next[index] = deckId;
			return next;
		});
		setWinnerDeckId("");
	}

	function closeLogGame() {
		setLogGameOpen(false);
		setError(null);
	}

	async function openLogGame() {
		setLogGameLoading(true);
		try {
			const [loadedPlayers, loadedDecks, loadedGames] = await Promise.all([
				loadPlayers(),
				loadDecks(),
				loadGames(),
			]);

			setPlayers(loadedPlayers);
			setDecks(loadedDecks);
			setGames(loadedGames);
			await loadCommandersForDecks(loadedDecks);
			setLogGameOpen(true);
		} finally {
			setLogGameLoading(false);
		}
	}

	const selectedDeckIds = useMemo(
		() => seatedDeckIds.filter((id): id is number => id !== ""),
		[seatedDeckIds]
	);

	function canLogGame() {
		if (!date)
			return false;
		if (selectedDeckIds.length !== seatCount)
			return false;
		if (new Set(selectedDeckIds).size !== selectedDeckIds.length)
			return false;
		if (winnerDeckId === "")
			return false;
		return true;
	}

	async function logGame() {
		if (!isEditor)
			return;

		setError(null);

		if (!canLogGame()) {
			setError("Fill all required fields before logging the game");
			return;
		}

		const res = await fetch("/api/games", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				deckIds: selectedDeckIds,
				winnerDeckId,
				date,
				notes,
			}),
		});

		if (!res.ok) {
			setError(await res.text());
			return;
		}

		setNotes("");
		setWinnerDeckId("");
		setSeatedDeckIds(Array.from({ length: seatCount }, () => ""));
		const updatedGames = await loadGames();
		setGames(updatedGames);
		closeLogGame();
	}

	return (
		<section className="w-full max-w-md space-y-12">
			<ReadOnlyBanner message="Log in to log games." />

			{isEditor && (
				<div className="space-y-3">
					<button
						onClick={openLogGame}
						disabled={logGameLoading}
						className="w-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
					>
						Log game
					</button>

					{logGameLoading && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
							<div className="flex w-full max-w-sm flex-col items-center gap-3 border border-neutral-200 bg-white px-6 py-10 text-center shadow-2xl">
								<div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
								<div className="text-sm text-neutral-600">
									Loading game setup...
								</div>
							</div>
						</div>
					)}

					{logGameOpen && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
							<div className="w-full max-w-lg border border-neutral-200 bg-white shadow-2xl">
								<div className="flex max-h-[85vh] flex-col">
									<div className="border-b border-neutral-200 px-6 py-4">
										<div className="text-lg font-semibold text-neutral-900">
											Log game
										</div>
										<div className="text-sm text-neutral-500">
											Fill in all required fields before submitting.
										</div>
									</div>

									<div className="flex-1 space-y-3 overflow-auto px-6 py-4">
										<div className="space-y-1">
											<label className="text-sm text-neutral-600">
												Seats
											</label>
											<select
												value={seatCount}
												onChange={e => setSeatCount(Number(e.target.value))}
												className="w-full border border-neutral-300 px-3 py-2 text-sm"
											>
												{[2, 3, 4, 5, 6, 7].map(n => (
													<option key={n} value={n}>
														{n}
													</option>
												))}
											</select>
										</div>

										<div className="space-y-2">
											{seatedDeckIds.map((deckId, index) => (
												<select
													key={index}
													value={deckId}
													onChange={e => updateSeat(index, e.target.value)}
													className="w-full border border-neutral-300 px-3 py-2 text-sm"
												>
													<option value="">Seat {index + 1}</option>
													{decks.map(d => (
														<option key={d.id} value={d.id}>
															{deckLabel(d)}
														</option>
													))}
												</select>
											))}
										</div>

										<div className="space-y-1">
											<label className="text-sm text-neutral-600">
												Winner
											</label>
											<select
												value={winnerDeckId}
												onChange={e => setWinnerDeckId(e.target.value ? Number(e.target.value) : "")}
												className="w-full border border-neutral-300 px-3 py-2 text-sm"
											>
												<option value="">Select winner</option>
												{selectedDeckIds.map(id => {
													const deck = decks.find(d => d.id === id);
													return deck ? (
														<option key={id} value={id}>
															{deckLabel(deck)}
														</option>
													) : null;
												})}
											</select>
										</div>

										<div className="space-y-1">
											<label className="text-sm text-neutral-600">
												Date
											</label>
											<input
												type="date"
												value={date}
												onChange={e => setDate(e.target.value)}
												className="w-full border border-neutral-300 px-3 py-2 text-sm"
											/>
										</div>

										<textarea
											placeholder="Notes (optional)"
											value={notes}
											onChange={e => setNotes(e.target.value)}
											className="w-full border border-neutral-300 px-3 py-2 text-sm"
										/>
									</div>

									<div className="border-t border-neutral-200 px-6 py-4">
										<div className="flex gap-3">
											<button
												onClick={logGame}
												disabled={!canLogGame()}
												className="flex-1 border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
											>
												Log game
											</button>

											<button
												onClick={closeLogGame}
												className="border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
											>
												Cancel
											</button>
										</div>

										{error && (
											<p className="mt-3 text-sm text-red-600">{error}</p>
										)}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			<div className="space-y-6">
				<div className="text-lg font-semibold">Games</div>

				{games
					.slice()
					.reverse()
					.map((g, index) => {
						const winnerDeck = decks.find(d => d.id === g.winnerDeckId);
						const gameNumber = games.length - index;

						return (
							<div
								key={g.id}
								className="border-b border-neutral-200 pb-4 space-y-3 text-sm"
							>
								<div>
									<div className="font-semibold">Game {gameNumber}</div>
									<div className="text-neutral-600">
										{new Date(g.date).toLocaleDateString()}
									</div>
								</div>

								<div>
									<div className="font-medium">Winner</div>
									<div className="text-neutral-700">
										{winnerDeck ? deckLabel(winnerDeck) : "Unknown"}
									</div>
								</div>

								<div>
									<div className="font-medium">Players ({g.deckIds.length})</div>
									<ul className="list-disc list-inside text-neutral-700">
										{g.deckIds.map(deckId => {
											const deck = decks.find(d => d.id === deckId);
											return <li key={deckId}>{deck ? deckLabel(deck) : "Unknown"}</li>;
										})}
									</ul>
								</div>
							</div>
						);
					})}
			</div>
		</section>
	);
}
