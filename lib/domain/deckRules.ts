export type Deck = {
	id: number;
	name: string;
	playerId: number;
	commanderAId: string | number;
	commanderBId?: string | number;
};

export type CommanderId = string | number;


export function createDeck(
	decks: Deck[],
	name: string,
	playerId: number,
	commanderAId: CommanderId,
	commanderBId?: CommanderId
): Deck {
	const trimmedName = name.trim();
	if (!trimmedName)
		throw new Error("Deck name is required");

	const nextId =
		decks.length === 0
			? 1
			: Math.max(...decks.map(d => d.id)) + 1;

	return {
		id: nextId,
		name: trimmedName,
		playerId,
		commanderAId,
		commanderBId
	};
}

