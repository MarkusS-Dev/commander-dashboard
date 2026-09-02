import { readJson, writeJson } from "./client";
import { Deck } from "@/lib/domain/deckRules";

const PATH = "data/decks.json";

export async function loadDecks(): Promise<Deck[]> {
	const decks = await readJson<Deck[]>(PATH);
	return Array.isArray(decks) ? decks : [];
}

export async function saveDecks(decks: Deck[]): Promise<void> {
	await writeJson(PATH, decks);
}
