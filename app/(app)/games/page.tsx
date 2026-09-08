import GamesList from "./gamesList";
import { loadGamesPageData } from "@/lib/bootstrapData";

export default async function GamesPage() {
	const data = await loadGamesPageData();

	return (
		<main className="flex justify-center">
			<GamesList
				initialPlayers={data.players}
				initialDecks={data.decks}
				initialGames={data.games}
				initialCommanders={data.commanders}
			/>
		</main>
	);
}
