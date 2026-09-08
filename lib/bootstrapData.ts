import type { Deck } from "@/lib/domain/deckRules";
import type { Game } from "@/lib/domain/gameRules";
import type { Player } from "@/lib/domain/playersRules";
import { loadDecks, resolveDeckCommandersById } from "@/lib/github/deckRepository";
import {
	loadCommandersInDecks,
	syncCommandersInDecksFromDecks,
} from "@/lib/github/commandersInDecksRepository";
import {
	resolveCommandersById,
	type CommanderSummary,
} from "@/lib/github/commanderIndexRepository";
import { loadGames } from "@/lib/github/gameRepository";
import { loadPlayers } from "@/lib/github/playerRepository";
import {
	loadLatestLandArtByColor,
	type ManaColor,
} from "@/lib/scryfall/landArt";

function collectCommanderIds(decks: Deck[]): string[] {
	return Array.from(
		new Set(
			decks
				.flatMap(deck => [deck.commanderAId, deck.commanderBId])
				.filter((id): id is string | number => id != null && String(id).trim() !== "")
				.map(id => String(id))
		)
	);
}

export async function loadCommandersForDecks(decks: Deck[]): Promise<CommanderSummary[]> {
	const ids = collectCommanderIds(decks);
	if (ids.length === 0)
		return [];

	let fromDecks = await loadCommandersInDecks();
	if (fromDecks.length === 0) {
		fromDecks = await syncCommandersInDecksFromDecks(decks, { hydrate: false });
	}

	const fromDecksById = new Map(fromDecks.map(commander => [commander.id, commander]));
	const ordered = ids
		.map(id => fromDecksById.get(id))
		.filter((commander): commander is CommanderSummary => commander != null);
	const foundIds = new Set(ordered.map(commander => commander.id));
	const missingIds = ids.filter(id => !foundIds.has(id));

	if (missingIds.length === 0)
		return ordered;

	const hydratedMissing = await resolveCommandersById(missingIds);
	return [...ordered, ...hydratedMissing];
}

export type DashboardBootstrapData = {
	players: Player[];
	decks: Deck[];
	games: Game[];
	commanders: CommanderSummary[];
	landArtByColor: Record<ManaColor, string>;
};

export type DecksPageData = {
	players: Player[];
	decks: Deck[];
	commanders: CommanderSummary[];
};

export type GamesPageData = {
	players: Player[];
	decks: Deck[];
	games: Game[];
	commanders: CommanderSummary[];
};

export async function loadDashboardBootstrapData(): Promise<DashboardBootstrapData> {
	const [players, decks, games, landArtByColor] = await Promise.all([
		loadPlayers(),
		loadDecks(),
		loadGames(),
		loadLatestLandArtByColor(),
	]);
	const commanders = await loadCommandersForDecks(decks);

	return {
		players,
		decks,
		games,
		commanders,
		landArtByColor,
	};
}

export async function loadDecksPageData(): Promise<DecksPageData> {
	const [players, decks] = await Promise.all([loadPlayers(), loadDecks()]);
	const commanders = await loadCommandersForDecks(decks);

	return {
		players,
		decks,
		commanders,
	};
}

export async function loadGamesPageData(): Promise<GamesPageData> {
	const [players, decks, games] = await Promise.all([
		loadPlayers(),
		loadDecks(),
		loadGames(),
	]);
	const commanders = await loadCommandersForDecks(decks);

	return {
		players,
		decks,
		games,
		commanders,
	};
}
