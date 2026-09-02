import { loadDecks, saveDecks } from "@/lib/github/deckRepository";
import { loadPlayers } from "@/lib/github/playerRepository";
import { createDeck } from "@/lib/domain/deckRules";
import { requireEditorSession } from "@/lib/auth/session";

export async function GET() {
	const decks = await loadDecks();
	return Response.json(decks);
}

export async function POST(req: Request) {
	await requireEditorSession(); // 🔐 editor-only

	const { name, playerId, commanderAId, commanderBId } = await req.json();

	const players = await loadPlayers();
	if (!players.some(p => p.id === playerId))
		return new Response("Player not found", { status: 400 });

	const decks = await loadDecks();
	const deck = createDeck(
		decks,
		name,
		playerId,
		commanderAId,
		commanderBId
	);

	decks.push(deck);
	await saveDecks(decks);

	return Response.json(deck, { status: 201 });
}

export async function DELETE(req: Request) {
	await requireEditorSession(); // 🔐 editor-only

	const { id } = await req.json();

	if (typeof id !== "number")
		return new Response("Deck id is required", { status: 400 });

	const decks = await loadDecks();

	const index = decks.findIndex(d => d.id === id);
	if (index === -1)
		return new Response("Deck not found", { status: 404 });

	decks.splice(index, 1);
	await saveDecks(decks);

	return Response.json({ success: true });
}
