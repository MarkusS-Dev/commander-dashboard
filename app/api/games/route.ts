import { loadGames, saveGames } from "@/lib/github/gameRepository";
import { loadDecks } from "@/lib/github/deckRepository";
import { createGame } from "@/lib/domain/gameRules";
import { requireEditorSession } from "@/lib/auth/session";

export async function GET() {
	const games = await loadGames();
	return Response.json(games, {
		headers: {
			"Cache-Control": "public, max-age=30, stale-while-revalidate=120",
		},
	});
}

export async function POST(req: Request) {
	await requireEditorSession(); // 🔐 editor-only

	const { deckIds, winnerDeckId, date, notes } = await req.json();

	if (!Array.isArray(deckIds))
		return new Response("deckIds must be an array", { status: 400 });

	if (deckIds.length < 2)
		return new Response("At least 2 decks required", { status: 400 });

	if (deckIds.length > 7)
		return new Response("Maximum 7 decks allowed", { status: 400 });

	if (!deckIds.every(id => typeof id === "number" && Number.isInteger(id)))
		return new Response("deckIds must contain integer deck ids", { status: 400 });

	if (new Set(deckIds).size !== deckIds.length)
		return new Response("A deck can only occupy one seat", { status: 400 });

	if (!date)
		return new Response("Date is required", { status: 400 });

	const decks = await loadDecks();
	const deckIdSet = new Set(decks.map(d => d.id));

	for (const id of deckIds)
		if (!deckIdSet.has(id))
			return new Response(`Deck ${id} not found`, { status: 400 });

	if (!deckIds.includes(winnerDeckId))
		return new Response("Winner must be one of the participating decks", { status: 400 });

	const games = await loadGames();
	const game = createGame(games, deckIds, winnerDeckId, date, notes);

	games.push(game);
	await saveGames(games);

	return Response.json(game, { status: 201 });
}
