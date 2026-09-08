import DecksList from "./decksList";
import { loadDecksPageData } from "@/lib/bootstrapData";

export default async function DecksPage() {
	const data = await loadDecksPageData();

	return (
		<main className="flex justify-center">
			<DecksList
				initialPlayers={data.players}
				initialDecks={data.decks}
				initialCommanders={data.commanders}
			/>
		</main>
	);
}
