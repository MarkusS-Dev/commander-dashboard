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

ChartJS.register(
	LineElement,
	BarElement,
	PointElement,
	LinearScale,
	CategoryScale,
	Legend,
	Tooltip
);

type Player = {
	id: number;
	name: string;
	color: string;
};

type Deck = {
	id: number;
	playerId: number;
	name?: string | null;
};

type Game = {
	id: number;
	date: string;
	deckIds: number[];
	winnerDeckId: number | null;
};

type ChartPoint = {
	y: number;
	played: boolean;
	games: {
		id: number;
		players: string[];
		winner: string;
	}[];
};

function FormatDateLabel(dateString: string) {
	const d = new Date(dateString);
	if (Number.isNaN(d.getTime()))
		return dateString;

	return d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	});
}

export default function DashboardPage() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [decks, setDecks] = useState<Deck[]>([]);
	const [games, setGames] = useState<Game[]>([]);
	const [chartData, setChartData] = useState<any>(null);
	const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		const [players, decks, games]: [Player[], Deck[], Game[]] =
			await Promise.all([
				fetch("/api/players").then(r => r.json()),
				fetch("/api/decks").then(r => r.json()),
				fetch("/api/games").then(r => r.json()),
			]);

		setPlayers(players);
		setDecks(decks);
		setGames(games);

		const sortedGames = [...games].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);

		const deckToPlayer = new Map<number, number>();
		const playerNames = new Map<number, string>();
		const deckNames = new Map<number, string>();

		decks.forEach(d => {
			deckToPlayer.set(d.id, d.playerId);
			deckNames.set(d.id, d.name ?? `Deck ${d.id}`);
		});
		players.forEach(p => playerNames.set(p.id, p.name));

		// X-axis: artificial Start + one label per game date
		const labels = ["Start", ...sortedGames.map(g => FormatDateLabel(g.date))];

		const datasets = players.map(player => {
			let wins = 0;
			const data: number[] = [0];
			const pointRadius = [0];
			const pointHoverRadius = [0];
			const pointMeta: { played: boolean; games: { id: number; players: string[]; winner: string }[] }[] = [
				{ played: false, games: [] },
			];

			sortedGames.forEach(game => {
				const played = game.deckIds.some(
					id => deckToPlayer.get(id) === player.id
				);

				const winnerPlayerId =
					game.winnerDeckId != null
						? deckToPlayer.get(game.winnerDeckId)
						: null;

				if (played && winnerPlayerId === player.id)
					wins++;

				const pointData = wins;
				const pointInfo = {
					played,
					games: [] as { id: number; players: string[]; winner: string }[],
				};

				if (played) {
					pointInfo.games = [
						{
							id: game.id,
							players: game.deckIds.map(deckId => {
								const pid = deckToPlayer.get(deckId);
								return playerNames.get(pid ?? -1) ?? "Unknown";
							}),
							winner:
								winnerPlayerId != null
									? playerNames.get(winnerPlayerId) ?? "Unknown"
									: "Draw",
						},
					];
				}

				data.push(pointData);
				pointMeta.push(pointInfo);
				pointRadius.push(played ? 4 : 0);
				pointHoverRadius.push(played ? 6 : 0);
			});

			return {
				label: player.name,
				data,
				pointMeta,
				borderColor: player.color,
				backgroundColor: player.color,
				borderWidth: 2,
				pointRadius,
				pointHoverRadius,
				pointBackgroundColor: player.color,
				pointBorderColor: player.color,
				pointHoverBackgroundColor: player.color,
				pointHoverBorderColor: player.color,
				fill: false,
			};
		});

		setChartData({ labels, datasets });
	}

	if (!chartData)
		return <div className="text-center">Loading…</div>;

	const playerOptions: PlayerOption[] = players.map(p => ({
		id: p.id.toString(),
		label: p.name,
	}));

	const selectedPlayer = players.find(p => p.id.toString() === selectedPlayerId);

	const computed = (() => {
		if (!selectedPlayer)
			return null;

		const deckToPlayer = new Map<number, number>();
		const deckName = new Map<number, string>();

		decks.forEach(d => {
			deckToPlayer.set(d.id, d.playerId);
			deckName.set(d.id, d.name ?? `Deck ${d.id}`);
		});

		let totalGames = 0;
		let wins = 0;
		let losses = 0;
		let draws = 0;

		const deckUsage = new Map<number, number>();
		const opponentStats = new Map<number, { wins: number; losses: number }>();

		players.forEach(p => {
			if (p.id !== selectedPlayer.id)
				opponentStats.set(p.id, { wins: 0, losses: 0 });
		});

		games.forEach(game => {
			const involvedPlayers = game.deckIds
				.map(id => deckToPlayer.get(id))
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

			involvedPlayers.forEach(pid => {
				if (pid === selectedPlayer.id)
					return;

				const entry = opponentStats.get(pid);
				if (!entry || winnerPlayerId == null)
					return;

				if (winnerPlayerId === selectedPlayer.id)
					entry.wins++;
				else if (winnerPlayerId === pid)
					entry.losses++;
			});
		});

		const winRate =
			wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

		const decksPlayed = Array.from(deckUsage.entries())
			.sort((a, b) => a[1] - b[1])
			.map(([deckId, games]) => ({
				name: deckName.get(deckId) ?? `Deck ${deckId}`,
				games,
			}));

		const opponents = Array.from(opponentStats.entries())
			.map(([playerId, v]) => {
				const total = v.wins + v.losses;
				const rate = total === 0 ? 0 : Math.round((v.wins / total) * 100);

				return {
					playerName: players.find(p => p.id === playerId)?.name ?? "Unknown",
					wins: v.wins,
					losses: v.losses,
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
			<section className="w-full max-w-5xl space-y-10">
				{/* Chart 1 */}
				<div>
					<div className="text-lg font-semibold mb-4">
						Wins over time
					</div>

					<Line
						data={chartData}
						options={{
							responsive: true,
							plugins: {
    legend: { position: "right" },
    tooltip: {
        mode: "nearest",
        intersect: true,
        callbacks: {
            title: items => items[0]?.label ?? "",
            label: context => {
                const dataIndex = context.dataIndex;
                const meta = (context.dataset as any).pointMeta?.[dataIndex];
                if (!meta?.played || meta.games.length === 0)
                    return "";
                return meta.games.flatMap((game: any) => [
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
									ticks: { stepSize: 1 },
									title: { display: true, text: "Wins" },
								},
								x: {
									title: { display: true, text: "Timeline" },
									ticks: {
										autoSkip: false,
										maxTicksLimit: 10,
									},
								},
							},
						}}
					/>
				</div>

				{/* Selector */}
				<div className="flex justify-end">
					<PlayerSelector
						players={playerOptions}
						value={selectedPlayerId}
						onChange={setSelectedPlayerId}
						placeholder="Select player"
					/>
				</div>

				{/* Stats + opponent chart */}
				{!computed ? (
					<div className="border border-neutral-300 p-6 text-neutral-600">
						Select a player to see detailed stats
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* LEFT: Stats */}
						<div className="border border-neutral-300 p-6 space-y-4">
							<ul className="text-sm space-y-1">
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
								<div className="text-sm font-medium mb-1">
									Decks played (least → most)
								</div>
								<ul className="text-sm space-y-1">
									{computed.stats.decksPlayed.map(d => (
										<li key={d.name} className="flex justify-between">
											<span>{d.name}</span>
											<span>{d.games}</span>
										</li>
									))}
								</ul>
							</div>
						</div>

						{/* RIGHT: Opponent chart */}
						<div className="md:col-span-2">
							<div className="text-lg font-semibold mb-4">
								Wins vs losses by opponent
							</div>

							<Bar
								data={{
									labels: computed.opponents.map(o => o.playerName),
									datasets: [
										{
											label: "Losses",
											data: computed.opponents.map(o => o.losses),
											backgroundColor: "rgba(239,68,68,0.85)",
											stack: "total",
										},
										{
											label: "Wins",
											data: computed.opponents.map(o => o.wins),
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
