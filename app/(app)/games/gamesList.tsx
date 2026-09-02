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
};

type Deck = {
	id: number;
	name: string;
	playerId: number;
	commanderAId: number;
	commanderBId?: number;
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
	const [commanders, setCommanders] = useState<Commander[]>([]);
	const [decks, setDecks] = useState<Deck[]>([]);
	const [games, setGames] = useState<Game[]>([]);

	// --- Seating model ---
	const [seatCount, setSeatCount] = useState<number>(4);
	const [seatedDeckIds, setSeatedDeckIds] = useState<(number | "")[]>([
		"", "", "", "",
	]);

	const [winnerDeckId, setWinnerDeckId] = useState<number | "">("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState<string | null>(null);

	const [date, setDate] = useState(
		new Date().toISOString().slice(0, 10)
	);

	const { isEditor } = useEditor();

	useEffect(() => {
		loadAll();
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
		await Promise.all([
			loadPlayers(),
			loadCommanders(),
			loadDecks(),
			loadGames(),
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

	async function loadGames() {
		const res = await fetch("/api/games");
		const text = await res.text();
		setGames(text ? JSON.parse(text) : []);
	}

	function deckLabel(deck: Deck) {
		const player =
			players.find(p => p.id === deck.playerId)?.name ?? "Unknown";

		const commanderA =
			commanders.find(c => c.id === deck.commanderAId)?.name ?? "Unknown";

		const commanderB =
			deck.commanderBId != null
				? commanders.find(c => c.id === deck.commanderBId)?.name
				: null;

		return `${deck.name} · ${commanderB ? `${commanderA} + ${commanderB}` : commanderA} · ${player}`;
	}

	function updateSeat(index: number, deckId: number | "") {
		setSeatedDeckIds(prev => {
			const next = [...prev];
			next[index] = deckId;
			return next;
		});
		setWinnerDeckId("");
	}

	async function logGame() {
		if (!isEditor)
			return;

		setError(null);

		const deckIds = seatedDeckIds.filter(
			(id): id is number => id !== ""
		);

		if (deckIds.length !== seatCount) {
			setError("All seats must be filled");
			return;
		}

		if (new Set(deckIds).size !== deckIds.length) {
			setError("A deck can only be seated once");
			return;
		}

		if (winnerDeckId === "") {
			setError("Select a winner");
			return;
		}

		const res = await fetch("/api/games", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				deckIds,
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
		loadGames();
	}

	return (
		<section className="w-full max-w-md space-y-12">

			{/* Read-only banner */}
			<ReadOnlyBanner message="Log in to log games." />

			{/* Log game (editor only) */}
			{isEditor && (
				<div className="space-y-4">
					<div className="text-lg font-semibold">
						Log game
					</div>

					<div className="space-y-1">
						<label className="text-sm text-neutral-600">
							Seats
						</label>
						<select
							value={seatCount}
							onChange={e =>
								setSeatCount(Number(e.target.value))
							}
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
								onChange={e =>
									updateSeat(
										index,
										Number(e.target.value)
									)
								}
								className="w-full border border-neutral-300 px-3 py-2 text-sm"
							>
								<option value="">
									Seat {index + 1}
								</option>
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
							onChange={e =>
								setWinnerDeckId(Number(e.target.value))
							}
							className="w-full border border-neutral-300 px-3 py-2 text-sm"
						>
							<option value="">
								Select winner
							</option>
							{seatedDeckIds
								.filter(
									(id): id is number => id !== ""
								)
								.map(id => {
									const deck = decks.find(
										d => d.id === id
									);
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
							onChange={e =>
								setDate(e.target.value)
							}
							className="w-full border border-neutral-300 px-3 py-2 text-sm"
						/>
					</div>

					<textarea
						placeholder="Notes (optional)"
						value={notes}
						onChange={e =>
							setNotes(e.target.value)
						}
						className="w-full border border-neutral-300 px-3 py-2 text-sm"
					/>

					<button
						onClick={logGame}
						className="w-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
					>
						Log game
					</button>

					{error && (
						<p className="text-sm text-red-600">
							{error}
						</p>
					)}
				</div>
			)}

			{/* Games history */}
			<div className="space-y-6">
				<div className="text-lg font-semibold">
					Games
				</div>

				{games
					.slice()
					.reverse()
					.map((g, index) => {
						const winnerDeck = decks.find(
							d => d.id === g.winnerDeckId
						);

						const gameNumber =
							games.length - index;

						return (
							<div
								key={g.id}
								className="border-b border-neutral-200 pb-4 space-y-3 text-sm"
							>
								<div>
									<div className="font-semibold">
										Game {gameNumber}
									</div>
									<div className="text-neutral-600">
										{new Date(
											g.date
										).toLocaleDateString()}
									</div>
								</div>

								<div>
									<div className="font-medium">
										Winner
									</div>
									<div className="text-neutral-700">
										{winnerDeck
											? deckLabel(
													winnerDeck
											  )
											: "Unknown"}
									</div>
								</div>

								<div>
									<div className="font-medium">
										Players (
										{g.deckIds.length})
									</div>
									<ul className="list-disc list-inside text-neutral-700">
										{g.deckIds.map(
											deckId => {
												const deck =
													decks.find(
														d =>
															d.id ===
															deckId
													);
												return (
													<li
														key={
															deckId
														}
													>
														{deck
															? deckLabel(
																	deck
															  )
															: "Unknown"}
													</li>
												);
											}
										)}
									</ul>
								</div>
							</div>
						);
					})}
			</div>
		</section>
	);
}
