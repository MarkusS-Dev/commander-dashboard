// lib/domain/playerRules.ts

export type Player = {
	id: number;
	name: string;
	color: string;
};

/**
 * Creates a new player using strict rules:
 * - name must be non-empty
 * - name must be unique (case-insensitive)
 * - id is append-only and never reused
 * - color must be provided
 */
export function createPlayer(
	players: Player[],
	name: string,
	color: string
): Player {
	const trimmedName = name.trim();

	if (!trimmedName)
		throw new Error("Player name is required");

	if (!color)
		throw new Error("Player color is required");

	const exists = players.some(
		p => p.name.toLowerCase() === trimmedName.toLowerCase()
	);

	if (exists)
		throw new Error("Player already exists");

	const nextId =
		players.length === 0
			? 1
			: Math.max(...players.map(p => p.id)) + 1;

	return {
		id: nextId,
		name: trimmedName,
		color,
	};
}
