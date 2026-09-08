import { readJson, writeJson } from "./client";
import { Deck } from "@/lib/domain/deckRules";

const PATH = "data/decks.json";

type ScryfallCard = {
	id: string;
	name: string;
	colors: string[];
	mana_cost: string | null;
	image_uris?: {
		normal?: string;
	};
	card_faces?: Array<{
		image_uris?: {
			normal?: string;
		};
	}>;
};

type CommanderSummary = {
	id: string;
	name: string;
	colors: string[];
	imageUrl?: string;
};

function commanderImageUrl(card: ScryfallCard): string | undefined {
	return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
}

async function fetchCommanderById(id: string): Promise<CommanderSummary | null> {
	try {
		const res = await fetch(`https://api.scryfall.com/cards/${id}`, {
			headers: {
				Accept: "application/json",
				"User-Agent": "commander-dashboard-local/1.0",
			},
		});

		if (!res.ok)
			return null;

		const card = (await res.json()) as ScryfallCard;
		return {
			id: card.id,
			name: card.name,
			colors: card.colors ?? [],
			imageUrl: commanderImageUrl(card),
		};
	} catch {
		return null;
	}
}

async function hydrateDeckCommanderData(decks: Deck[]): Promise<Deck[]> {
	const ids = Array.from(
		new Set(
			decks
				.flatMap(deck => [deck.commanderAId, deck.commanderBId])
				.filter((id): id is string | number => id != null && String(id).trim() !== "")
				.map(id => String(id))
		)
	);

	if (ids.length === 0)
		return decks;

	const resolved = await Promise.all(ids.map(async id => [id, await fetchCommanderById(id)] as const));
	const resolvedById = new Map(resolved.filter(([, commander]) => commander != null) as Array<[string, CommanderSummary]>);
	let changed = false;

	const hydrated = decks.map(deck => {
		const commanderA = resolvedById.get(String(deck.commanderAId));
		const commanderB = deck.commanderBId != null ? resolvedById.get(String(deck.commanderBId)) : undefined;
		const nextDeck: Deck = { ...deck };

		if (commanderA) {
			if (!nextDeck.commanderAName) {
				nextDeck.commanderAName = commanderA.name;
				changed = true;
			}

			if (!nextDeck.commanderAColors?.length && commanderA.colors.length > 0) {
				nextDeck.commanderAColors = commanderA.colors;
				changed = true;
			}

			if (!nextDeck.commanderAImageUrl && commanderA.imageUrl) {
				nextDeck.commanderAImageUrl = commanderA.imageUrl;
				changed = true;
			}
		}

		if (commanderB) {
			if (!nextDeck.commanderBName) {
				nextDeck.commanderBName = commanderB.name;
				changed = true;
			}

			if (!nextDeck.commanderBColors?.length && commanderB.colors.length > 0) {
				nextDeck.commanderBColors = commanderB.colors;
				changed = true;
			}

			if (!nextDeck.commanderBImageUrl && commanderB.imageUrl) {
				nextDeck.commanderBImageUrl = commanderB.imageUrl;
				changed = true;
			}
		}

		return nextDeck;
	});

	if (changed)
		await writeJson(PATH, hydrated);

	return hydrated;
}

export async function loadDecks(): Promise<Deck[]> {
	const decks = await readJson<Deck[]>(PATH);
	if (!Array.isArray(decks))
		return [];

	return hydrateDeckCommanderData(decks);
}

export async function resolveDeckCommandersById(
	ids: Array<string | number>
): Promise<CommanderSummary[]> {
	const decks = await readJson<Deck[]>(PATH);
	if (!Array.isArray(decks) || ids.length === 0)
		return [];

	const lookup = new Map<string, CommanderSummary>();

	for (const deck of decks) {
		const commanderAId = deck.commanderAId != null ? String(deck.commanderAId) : "";
		if (commanderAId && !lookup.has(commanderAId)) {
			lookup.set(commanderAId, {
				id: commanderAId,
				name: deck.commanderAName ?? "",
				colors: deck.commanderAColors ?? [],
				imageUrl: deck.commanderAImageUrl,
			});
		}

		const commanderBId = deck.commanderBId != null ? String(deck.commanderBId) : "";
		if (commanderBId && !lookup.has(commanderBId)) {
			lookup.set(commanderBId, {
				id: commanderBId,
				name: deck.commanderBName ?? "",
				colors: deck.commanderBColors ?? [],
				imageUrl: deck.commanderBImageUrl,
			});
		}
	}

	const resolved: CommanderSummary[] = [];
	const seen = new Set<string>();

	for (const rawId of ids) {
		const id = String(rawId).trim();
		if (!id || seen.has(id))
			continue;

		seen.add(id);
		const commander = lookup.get(id);
		if (commander)
			resolved.push(commander);
	}

	return resolved;
}

export async function saveDecks(decks: Deck[]): Promise<void> {
	await writeJson(PATH, decks);
}
