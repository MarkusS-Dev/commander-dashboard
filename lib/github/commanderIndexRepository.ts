import { readJson, writeJson } from "./client";

type ScryfallCard = {
	id: string;
	name: string;
	colors: string[];
	mana_cost: string | null;
};

type ScryfallList<T> = {
	data: T[];
	total_cards: number;
	has_more: boolean;
	next_page?: string;
};

export type CommanderSummary = {
	id: string;
	name: string;
	colors: string[];
	manaCost: string;
};

type CommanderCache = {
	totalCards: number;
	updatedAt: string;
	commanders: CommanderSummary[];
};

const CACHE_PATH = "data/commanders-cache.json";
const SEARCH_URL = "https://api.scryfall.com/cards/search";
const SEARCH_QUERY = "is:commander";

function normalize(text: string) {
	return text.trim().toLowerCase();
}

async function fetchScryfallJson<T>(url: string): Promise<T> {
	const res = await fetch(url, {
		headers: {
			Accept: "application/json",
			"User-Agent": "commander-dashboard-local/1.0",
		}
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json() as Promise<T>;
}

async function fetchCommanderPage(url: string): Promise<ScryfallList<ScryfallCard>> {
	return fetchScryfallJson<ScryfallList<ScryfallCard>>(url);
}

async function fetchCommanderCacheFromScryfall(): Promise<CommanderCache> {
	const baseUrl = `${SEARCH_URL}?q=${encodeURIComponent(SEARCH_QUERY)}&unique=cards&order=name&dir=asc&page=1`;
	const firstPage = await fetchCommanderPage(baseUrl);
	const commanders: CommanderSummary[] = firstPage.data.map(card => ({
		id: card.id,
		name: card.name,
		colors: card.colors ?? [],
		manaCost: card.mana_cost ?? "",
	}));

	let nextPage = firstPage.next_page;

	while (nextPage) {
		const page = await fetchCommanderPage(nextPage);
		commanders.push(
			...page.data.map(card => ({
				id: card.id,
				name: card.name,
				colors: card.colors ?? [],
				manaCost: card.mana_cost ?? "",
			}))
		);
		nextPage = page.next_page;
	}

	return {
		totalCards: firstPage.total_cards,
		updatedAt: new Date().toISOString(),
		commanders,
	};
}

async function loadCommanderCache(): Promise<CommanderCache | null> {
	try {
		const cache = await readJson<CommanderCache>(CACHE_PATH);
		return Array.isArray(cache.commanders) ? cache : null;
	} catch {
		return null;
	}
}

async function saveCommanderCache(cache: CommanderCache) {
	await writeJson(CACHE_PATH, cache);
}

async function getCommanderCache(): Promise<CommanderCache> {
	const cache = await loadCommanderCache();
	const searchUrl = `${SEARCH_URL}?q=${encodeURIComponent(SEARCH_QUERY)}&unique=cards&order=name&dir=asc&page=1`;

	try {
		const latest = await fetchCommanderPage(searchUrl);

		if (!cache || cache.totalCards !== latest.total_cards) {
			const refreshed = await fetchCommanderCacheFromScryfall();
			await saveCommanderCache(refreshed);
			return refreshed;
		}
	} catch {
		if (cache)
			return cache;
		throw new Error("Failed to load commander index");
	}

	return cache ?? await fetchCommanderCacheFromScryfall().then(async refreshed => {
		await saveCommanderCache(refreshed);
		return refreshed;
	});
}

function commanderMatchesQuery(commander: CommanderSummary, query: string) {
	const value = normalize(query);
	if (!value)
		return false;

	return normalize(commander.name).includes(value);
}

export async function loadCommanderCatalog(): Promise<CommanderSummary[]> {
	const cache = await getCommanderCache();
	return cache.commanders;
}

export async function resolveCommandersById(
	ids: Array<string | number>
): Promise<CommanderSummary[]> {
	const cache = await getCommanderCache();
	const commandersById = new Map(
		cache.commanders.map(commander => [commander.id, commander])
	);
	const resolved: CommanderSummary[] = [];
	const seen = new Set<string>();

	for (const rawId of ids) {
		const id = String(rawId);
		if (seen.has(id))
			continue;

		seen.add(id);

		const direct = commandersById.get(id);
		if (direct) {
			resolved.push(direct);
		}
	}

	return resolved;
}