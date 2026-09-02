"use client";

import { useEffect, useState } from "react";
import {
	Chart as ChartJS,
	LineElement,
	BarElement,
	PointElement,
	LinearScale,
	CategoryScale,
	Legend,
	Tooltip,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import PlayerSelector, { PlayerOption } from "@/components/PlayerSelector";

type Player = {
	id: number;
	name: string;
	color: string;
};

type Deck = {
	id: number;
	playerId: number;
	name?: string | null;
	commanderAId: string | number;
	commanderBId?: string | number;
	commanderAName?: string;
	commanderAImageUrl?: string;
	commanderBName?: string;
	commanderBImageUrl?: string;
};

type CommanderSummary = {
	id: string;
	name: string;
	colors: string[];
	manaCost: string;
	imageUrl?: string;
};

type Game = {
	id: number;
	date: string;
	deckIds: number[];
	winnerDeckId: number | null;
};

type PointGame = {
	id: number;
	players: string[];
	winner: string;
};

type ChartPoint = {
	played: boolean;
	won: boolean;
	games: PointGame[];
};

type ManaColor = "White" | "Blue" | "Black" | "Red" | "Green";

const SYMBOL_TO_MANA_COLOR: Record<string, ManaColor | undefined> = {
	W: "White",
	U: "Blue",
	B: "Black",
	R: "Red",
	G: "Green",
};

const DEFAULT_LAND_ART_BY_COLOR: Record<ManaColor, string> = {
	White: "",
	Blue: "",
	Black: "",
	Red: "",
	Green: "",
};

type ScryfallCardResult = {
	image_uris?: {
		normal?: string;
	};
	card_faces?: Array<{
		image_uris?: {
			normal?: string;
		};
	}>;
};

type ScryfallSearchResponse = {
	data?: ScryfallCardResult[];
};

function scryfallImageUrl(card: ScryfallCardResult) {
	return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? "";
}

async function fetchLatestBasicLandArt(cardName: string): Promise<string> {
	const query = `!\"${cardName}\" t:basic unique:prints`;
	const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=released&dir=desc`;
	const res = await fetch(url, {
		headers: {
			Accept: "application/json",
		},
	});

	if (!res.ok)
		return "";

	const data = (await res.json()) as ScryfallSearchResponse;
	const first = data.data?.[0];
	if (!first)
		return "";

	return scryfallImageUrl(first);
}

async function fetchLatestLandArtByColor(): Promise<Record<ManaColor, string>> {
	const entries: Array<[ManaColor, string]> = [
		["White", "Plains"],
		["Blue", "Island"],
		["Black", "Swamp"],
		["Red", "Mountain"],
		["Green", "Forest"],
	];

	const images = await Promise.all(
		entries.map(async ([color, cardName]) => [color, await fetchLatestBasicLandArt(cardName)] as const)
	);

	return {
		White: images.find(([color]) => color === "White")?.[1] ?? "",
		Blue: images.find(([color]) => color === "Blue")?.[1] ?? "",
		Black: images.find(([color]) => color === "Black")?.[1] ?? "",
		Red: images.find(([color]) => color === "Red")?.[1] ?? "",
		Green: images.find(([color]) => color === "Green")?.[1] ?? "",
	};
}

const winMarkerPlugin = {
	id: "winMarkerPlugin",
	afterDatasetsDraw(chart: ChartJS) {
		const context = chart.ctx;

		chart.data.datasets.forEach((dataset, datasetIndex) => {
			const pointMeta = (dataset as { pointMeta?: ChartPoint[] }).pointMeta ?? [];
			const meta = chart.getDatasetMeta(datasetIndex);
			const color = String(dataset.borderColor ?? dataset.backgroundColor ?? "#000000");

			pointMeta.forEach((point, pointIndex) => {
				if (!point.won)
					return;

				const element = meta.data[pointIndex];
				if (!element)
					return;

				const { x, y } = element.getProps(["x", "y"], true);

				context.save();
				context.fillStyle = color;
				context.font = "900 22px Arial";
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.fillText("★", x, y + 1);
				context.restore();
			});
		});
	},
};

ChartJS.register(
	LineElement,
	BarElement,
	PointElement,
	LinearScale,
	CategoryScale,
	Legend,
	Tooltip,
	winMarkerPlugin
);

function formatDateLabel(dateString: string, gameNumber: number) {
	if (!dateString || !dateString.trim())
		return `Game ${gameNumber}`;

	const date = new Date(dateString);
	if (Number.isNaN(date.getTime()))
		return `Game ${gameNumber}`;

	return date.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	});
}

export default function DashboardPage() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [decks, setDecks] = useState<Deck[]>([]);
	const [games, setGames] = useState<Game[]>([]);
	const [commandersById, setCommandersById] = useState<Record<string, CommanderSummary>>({});
	const [landArtByColor, setLandArtByColor] = useState<Record<ManaColor, string>>(DEFAULT_LAND_ART_BY_COLOR);
	const [chartData, setChartData] = useState<any>(null);
	const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

	useEffect(() => {
		void loadData();
	}, []);

	async function loadData() {
		const latestLandArt = await fetchLatestLandArtByColor().catch(() => DEFAULT_LAND_ART_BY_COLOR);
		setLandArtByColor(latestLandArt);

		const [loadedPlayers, loadedDecks, loadedGames]: [Player[], Deck[], Game[]] =
			await Promise.all([
				fetch("/api/players").then(response => response.json()),
				fetch("/api/decks").then(response => response.json()),
				fetch("/api/games").then(response => response.json()),
			]);

		setPlayers(loadedPlayers);
		setDecks(loadedDecks);
		setGames(loadedGames);

		const commanderIds = Array.from(
			new Set(
				loadedDecks
					.flatMap(deck => [deck.commanderAId, deck.commanderBId])
					.filter((id): id is string | number => id != null && id !== "")
					.map(id => String(id))
			)
		);

		if (commanderIds.length > 0) {
			try {
				const response = await fetch(
					`/api/commanders?ids=${commanderIds.map(id => encodeURIComponent(id)).join(",")}`
				);
				const text = await response.text();
				const commanders: CommanderSummary[] = text ? JSON.parse(text) : [];
				setCommandersById(
					Object.fromEntries(commanders.map(commander => [commander.id, commander]))
				);
			} catch {
				setCommandersById({});
			}
		}

		const sortedGames = [...loadedGames].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);

		const deckToPlayer = new Map<number, number>();
		const playerNames = new Map<number, string>();

		loadedDecks.forEach(deck => {
			deckToPlayer.set(deck.id, deck.playerId);
		});
		loadedPlayers.forEach(player => {
			playerNames.set(player.id, player.name);
		});

		const labels = [
			"Start",
			...sortedGames.map((game, index) => formatDateLabel(game.date, index + 1)),
			"Next game",
		];

		const datasets = loadedPlayers.map(player => {
			let wins = 0;
			const data: (number | null)[] = [0];
			const pointRadius = [0];
			const pointHoverRadius = [0];
			const pointHitRadius = [0];
			const pointBackgroundColor = ["transparent"];
			const pointBorderColor = ["transparent"];
			const pointMeta: ChartPoint[] = [
				{ played: false, won: false, games: [] },
			];

			sortedGames.forEach(game => {
				const played = game.deckIds.some(deckId => deckToPlayer.get(deckId) === player.id);
				const winnerPlayerId =
					game.winnerDeckId != null ? deckToPlayer.get(game.winnerDeckId) : null;
				const won = played && winnerPlayerId === player.id;

				if (won)
					wins++;

				const pointInfo: ChartPoint = {
					played,
					won,
					games: [],
				};

				if (played) {
					pointInfo.games = [
						{
							id: game.id,
							players: game.deckIds.map(deckId => {
								const playerId = deckToPlayer.get(deckId);
								return playerNames.get(playerId ?? -1) ?? "Unknown";
							}),
							winner:
								winnerPlayerId != null
									? playerNames.get(winnerPlayerId) ?? "Unknown"
									: "Draw",
						},
					];
				}

				data.push(played ? wins : null);
				pointMeta.push(pointInfo);
				pointRadius.push(played ? 3 : 0);
				pointHoverRadius.push(played ? 5 : 0);
				pointHitRadius.push(played ? 7 : 0);
				pointBackgroundColor.push(won ? "transparent" : player.color);
				pointBorderColor.push(won ? "transparent" : player.color);
			});

			// Trailing placeholder creates visual space after the last game point.
			data.push(null);
			pointMeta.push({ played: false, won: false, games: [] });
			pointRadius.push(0);
			pointHoverRadius.push(0);
			pointHitRadius.push(0);
			pointBackgroundColor.push("transparent");
			pointBorderColor.push("transparent");

			return {
				label: player.name,
				data,
				pointMeta,
				borderColor: player.color,
				backgroundColor: player.color,
				borderWidth: 2,
				pointRadius,
				pointHoverRadius,
				pointHitRadius,
				pointBackgroundColor,
				pointBorderColor,
				pointHoverBackgroundColor: player.color,
				pointHoverBorderColor: player.color,
				spanGaps: false,
				fill: false,
			};
		});

		setChartData({ labels, datasets });
	}

	if (!chartData)
		return <div className="text-center">Loading…</div>;

	const allPointValues: number[] = chartData.datasets.flatMap(
		(dataset: { data: (number | null)[] }) =>
			dataset.data.filter((value): value is number => typeof value === "number")
	);

	const maxWins = Math.max(
		0,
		...allPointValues
	);

	const playerOptions: PlayerOption[] = players.map(player => ({
		id: player.id.toString(),
		label: player.name,
	}));

	const selectedPlayer = players.find(player => player.id.toString() === selectedPlayerId);

	const headlineStats = (() => {
		if (!selectedPlayer)
			return null;

		type CommanderStat = {
			id: string;
			name: string;
			imageUrl: string | null;
			games: number;
			wins: number;
			decidedGames: number;
			colors: ManaColor[];
		};

		const deckById = new Map<number, Deck>();
		decks.forEach(deck => {
			deckById.set(deck.id, deck);
		});

		const selectedDeckIds = new Set(
			decks
				.filter(deck => deck.playerId === selectedPlayer.id)
				.map(deck => deck.id)
		);

		const commanderStats = new Map<string, CommanderStat>();
		const colorTotals = new Map<ManaColor, number>();

		games.forEach(game => {
			const playerDeckIdsInGame = game.deckIds.filter(deckId => selectedDeckIds.has(deckId));

			playerDeckIdsInGame.forEach(deckId => {
				const deck = deckById.get(deckId);
				if (!deck)
					return;

				const commanderIds = [deck.commanderAId, deck.commanderBId].filter(
					(id): id is string | number => id != null && id !== ""
				);

				const winnerExists = game.winnerDeckId != null;
				const deckWon = winnerExists && game.winnerDeckId === deckId;

				commanderIds.forEach((rawCommanderId, index) => {
					const commanderId = String(rawCommanderId);
					const commander = commandersById[commanderId];

					const fallbackName =
						index === 0
							? deck.commanderAName ?? deck.name ?? `Commander ${commanderId}`
							: deck.commanderBName ?? deck.commanderAName ?? deck.name ?? `Commander ${commanderId}`;

					const fallbackImage =
						index === 0
							? deck.commanderAImageUrl
							: deck.commanderBImageUrl ?? deck.commanderAImageUrl;

					const colors = (commander?.colors ?? [])
						.map(color => SYMBOL_TO_MANA_COLOR[color])
						.filter((color): color is ManaColor => Boolean(color));

					if (!commanderStats.has(commanderId)) {
						commanderStats.set(commanderId, {
							id: commanderId,
							name: commander?.name ?? fallbackName,
							imageUrl: commander?.imageUrl ?? fallbackImage ?? null,
							games: 0,
							wins: 0,
							decidedGames: 0,
							colors,
						});
					}

					const stat = commanderStats.get(commanderId);
					if (!stat)
						return;

					stat.games++;

					if (winnerExists)
						stat.decidedGames++;

					if (deckWon)
						stat.wins++;

					if (!stat.imageUrl) {
						stat.imageUrl = commander?.imageUrl ?? fallbackImage ?? null;
					}

					if (stat.colors.length === 0 && colors.length > 0) {
						stat.colors = colors;
					}

					const colorsToCount = colors.length > 0 ? colors : stat.colors;
					colorsToCount.forEach(color => {
						colorTotals.set(color, (colorTotals.get(color) ?? 0) + 1);
					});
				});
			});
		});

		const commanderEntries = Array.from(commanderStats.values());

		const mostPlayedCommander = commanderEntries
			.slice()
			.sort((a, b) => b.games - a.games || b.wins - a.wins)[0] ?? null;

		const bestWinrateCommander = commanderEntries
			.slice()
			.filter(entry => entry.decidedGames > 0)
			.map(entry => ({
				...entry,
				winRate: Math.round((entry.wins / entry.decidedGames) * 100),
			}))
			.sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.games - a.games)[0] ?? null;

		const topColor = Array.from(colorTotals.entries())
			.filter(([, count]) => count > 0)
			.sort((a, b) => b[1] - a[1])[0] ?? null;

		const topColorName = topColor?.[0] ?? null;
		const topColorCount = topColor?.[1] ?? 0;

		const commanderWinRates = commanderEntries
			.slice()
			.filter(entry => entry.decidedGames > 0)
			.map(entry => ({
				id: entry.id,
				name: entry.name,
				imageUrl: entry.imageUrl,
				wins: entry.wins,
				decidedGames: entry.decidedGames,
				games: entry.games,
				winRate: Math.round((entry.wins / entry.decidedGames) * 100),
			}))
			.sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.games - a.games);

		return {
			bestWinrateCommander,
			mostPlayedCommander,
			commanderWinRates,
			topColorName,
			topColorCount,
			topColorImageUrl:
				topColorName != null ? landArtByColor[topColorName] ?? "" : "",
		};
	})();

	const computed = (() => {
		if (!selectedPlayer)
			return null;

		const deckToPlayer = new Map<number, number>();
		const deckName = new Map<number, string>();

		decks.forEach(deck => {
			deckToPlayer.set(deck.id, deck.playerId);
			deckName.set(deck.id, deck.name ?? `Deck ${deck.id}`);
		});

		let totalGames = 0;
		let wins = 0;
		let losses = 0;
		let draws = 0;

		const deckUsage = new Map<number, number>();
		const opponentStats = new Map<number, { wins: number; losses: number }>();

		players.forEach(player => {
			if (player.id !== selectedPlayer.id)
				opponentStats.set(player.id, { wins: 0, losses: 0 });
		});

		games.forEach(game => {
			const involvedPlayers = game.deckIds
				.map(deckId => deckToPlayer.get(deckId))
				.filter(Boolean) as number[];

			if (!involvedPlayers.includes(selectedPlayer.id))
				return;

			totalGames++;

			const winnerPlayerId =
				game.winnerDeckId != null ? deckToPlayer.get(game.winnerDeckId) : null;

			if (winnerPlayerId == null) {
				draws++;
			} else if (winnerPlayerId === selectedPlayer.id) {
				wins++;
			} else {
				losses++;
			}

			game.deckIds.forEach(deckId => {
				if (deckToPlayer.get(deckId) !== selectedPlayer.id)
					return;

				deckUsage.set(deckId, (deckUsage.get(deckId) ?? 0) + 1);
			});

			involvedPlayers.forEach(playerId => {
				if (playerId === selectedPlayer.id)
					return;

				const entry = opponentStats.get(playerId);
				if (!entry || winnerPlayerId == null)
					return;

				if (winnerPlayerId === selectedPlayer.id)
					entry.wins++;
				else if (winnerPlayerId === playerId)
					entry.losses++;
			});
		});

		const winRate =
			wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

		const decksPlayed = Array.from(deckUsage.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([deckId, totalGamesPlayed]) => ({
				name: deckName.get(deckId) ?? `Deck ${deckId}`,
				games: totalGamesPlayed,
			}));

		const opponents = Array.from(opponentStats.entries())
			.map(([playerId, record]) => {
				const total = record.wins + record.losses;
				const rate = total === 0 ? 0 : Math.round((record.wins / total) * 100);

				return {
					playerName: players.find(player => player.id === playerId)?.name ?? "Unknown",
					wins: record.wins,
					losses: record.losses,
					winRate: rate,
				};
			})
			.sort((a, b) => b.winRate - a.winRate);

		return {
			stats: {
				totalGames,
				wins,
				losses,
				draws,
				winRate,
				decksPlayed,
			},
			opponents,
		};
	})();

	return (
		<div className="flex justify-center">
			<section className="w-full max-w-5xl space-y-10 pb-20">
				<div>
					<div className="mb-4 text-lg font-semibold">Wins over time</div>

					<Line
						data={chartData}
						options={{
							responsive: true,
							layout: {
								padding: {
									left: 0,
									right: 20,
								},
							},
							plugins: {
								legend: { position: "right" },
								tooltip: {
									mode: "nearest",
									intersect: true,
									callbacks: {
										title: items => items[0]?.label ?? "",
										label: context => {
											const dataIndex = context.dataIndex;
											const meta = (context.dataset as { pointMeta?: ChartPoint[] }).pointMeta?.[dataIndex];
											if (!meta?.played || meta.games.length === 0)
												return "";

											return meta.games.flatMap(game => [
												`Game ${game.id}`,
												`Winner: ${game.winner}`,
												`Seating: ${game.players.join(", ")}`,
											]);
										},
									},
								},
							},
							scales: {
								y: {
									beginAtZero: true,
									max: maxWins + 1,
									ticks: { stepSize: 1 },
									title: { display: true, text: "Wins" },
								},
								x: {
									title: { display: true, text: "Timeline" },
									ticks: {
										autoSkip: false,
										padding: 8,
									},
								},
							},
						}}
					/>
				</div>

				<div className="flex justify-end">
					<PlayerSelector
						players={playerOptions}
						value={selectedPlayerId}
						onChange={setSelectedPlayerId}
						placeholder="Select player"
					/>
				</div>

				{headlineStats && (
					<div className="space-y-4">
						<div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
							<div className="flex h-full min-h-[31rem] flex-col overflow-hidden rounded-2xl border border-neutral-300">
								<div className="flex h-16 items-start justify-between gap-2 px-4 pt-3">
									<div className="flex-1">
										<div className="text-xs uppercase tracking-wide text-neutral-500">
											Commander winrate
										</div>
									</div>
									<div className="text-xl font-semibold text-neutral-900">
										{headlineStats.bestWinrateCommander ? `${headlineStats.bestWinrateCommander.winRate}%` : "-"}
									</div>
								</div>
								<div className="px-4 text-sm text-neutral-600">
									{headlineStats.bestWinrateCommander
										? `${headlineStats.bestWinrateCommander.name} (${headlineStats.bestWinrateCommander.wins}/${headlineStats.bestWinrateCommander.decidedGames})`
										: "No recorded games"}
								</div>
								<div className="mt-2 flex-1 p-1">
									{headlineStats.bestWinrateCommander?.imageUrl ? (
										<img
											src={headlineStats.bestWinrateCommander.imageUrl}
											alt={headlineStats.bestWinrateCommander.name}
											className="h-full w-full rounded-[24px] object-contain object-center"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
											N/A
										</div>
									)}
								</div>
							</div>

							<div className="flex h-full min-h-[31rem] flex-col overflow-hidden rounded-2xl border border-neutral-300">
								<div className="flex h-16 items-start justify-between gap-2 px-4 pt-3">
									<div className="flex-1">
										<div className="text-xs uppercase tracking-wide text-neutral-500">
											Most played commander
										</div>
									</div>
									<div className="text-xl font-semibold text-neutral-900">
										{headlineStats.mostPlayedCommander?.games ?? 0}
									</div>
								</div>
								<div className="px-4 text-sm text-neutral-600">
									{headlineStats.mostPlayedCommander?.name ?? "No recorded games"}
								</div>
								<div className="mt-2 flex-1 p-1">
									{headlineStats.mostPlayedCommander?.imageUrl ? (
										<img
											src={headlineStats.mostPlayedCommander.imageUrl}
											alt={headlineStats.mostPlayedCommander.name}
											className="h-full w-full rounded-[24px] object-contain object-center"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
											N/A
										</div>
									)}
								</div>
							</div>

							<div className="flex h-full min-h-[31rem] flex-col overflow-hidden rounded-2xl border border-neutral-300">
								<div className="flex h-16 items-start justify-between gap-2 px-4 pt-3">
									<div className="flex-1">
										<div className="text-xs uppercase tracking-wide text-neutral-500">
											Most played color
										</div>
									</div>
									<div className="text-sm font-semibold text-neutral-900">
										{headlineStats.topColorName ?? "-"}
									</div>
								</div>
								<div className="px-4 text-xs text-neutral-600">
									{headlineStats.topColorCount} color pips counted
								</div>
								<div className="mt-2 flex-1 p-1">
									{headlineStats.topColorImageUrl ? (
										<img
											src={headlineStats.topColorImageUrl}
											alt={headlineStats.topColorName ?? "Most played color"}
											className="h-full w-full rounded-[24px] object-contain object-center"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
											{headlineStats.topColorName?.slice(0, 1) ?? "N/A"}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{!computed ? (
					<div className="rounded-2xl border border-neutral-300 p-6 text-neutral-600">
						Select a player to see detailed stats
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
						<div className="space-y-4 rounded-2xl border border-neutral-300 p-6">
							<div className="text-lg font-semibold">Stats</div>
							<ul className="space-y-1 text-sm">
								<li>
									Total games: <strong>{computed.stats.totalGames}</strong>
								</li>
								<li>
									Wins: <strong>{computed.stats.wins}</strong>
								</li>
								<li>
									Losses: <strong>{computed.stats.losses}</strong>
								</li>
								<li>
									Draws: <strong>{computed.stats.draws}</strong>
								</li>
								<li>
									Win rate: <strong>{computed.stats.winRate}%</strong>
								</li>
							</ul>

							<div>
								<div className="mb-1 text-sm font-medium">
									Decks played (most → least)
								</div>
								<ul className="space-y-1 text-sm">
									{computed.stats.decksPlayed.map(deck => (
										<li key={deck.name} className="flex justify-between">
											<span>{deck.name}</span>
											<span>{deck.games}</span>
										</li>
									))}
								</ul>
							</div>

							<div>
								<div className="mb-1 text-sm font-medium">Win rate per commander</div>
								{headlineStats?.commanderWinRates.length ? (
									<ul className="space-y-1 text-sm">
										{headlineStats.commanderWinRates.map(commander => (
											<li key={commander.id} className="flex justify-between gap-3">
												<span className="truncate">{commander.name}</span>
												<span className="shrink-0">{commander.winRate}% ({commander.wins}/{commander.decidedGames})</span>
											</li>
										))}
									</ul>
								) : (
									<div className="text-sm text-neutral-600">No decided games yet</div>
								)}
							</div>
						</div>

						<div className="md:col-span-2">
							<div className="mb-4 text-lg font-semibold">
								Wins vs losses by opponent
							</div>

							<Bar
								data={{
									labels: computed.opponents.map(opponent => opponent.playerName),
									datasets: [
										{
											label: "Losses",
											data: computed.opponents.map(opponent => opponent.losses),
											backgroundColor: "rgba(239,68,68,0.85)",
											stack: "total",
										},
										{
											label: "Wins",
											data: computed.opponents.map(opponent => opponent.wins),
											backgroundColor: "rgba(59,130,246,0.85)",
											stack: "total",
										},
									],
								}}
								options={{
									indexAxis: "y",
									responsive: true,
									scales: {
										x: {
											stacked: true,
											beginAtZero: true,
											ticks: { stepSize: 1 },
										},
										y: { stacked: true },
									},
								}}
							/>
						</div>
					</div>
				)}
			</section>
		</div>
	);
}
