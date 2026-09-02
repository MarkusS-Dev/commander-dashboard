export type Game = {
	id: number;
	date: string;
	deckIds: number[];
	winnerDeckId: number;
	notes?: string;
};

export function createGame(
	existingGames: Game[],
	deckIds: number[],
	winnerDeckId: number,
	date: string,
	notes?: string
): Game {
	const id =
		existingGames.length === 0
			? 1
			: Math.max(...existingGames.map(g => g.id)) + 1;

	return {
		id,
		date,
		deckIds,
		winnerDeckId,
		notes
	};
}
