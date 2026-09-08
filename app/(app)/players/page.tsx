import PlayersList from "./playersList";
import { loadPlayers } from "@/lib/github/playerRepository";

export default async function PlayersPage() {
	const players = await loadPlayers();

	return (
		<main className="flex justify-center">
			<PlayersList initialPlayers={players} />
		</main>
	);
}
