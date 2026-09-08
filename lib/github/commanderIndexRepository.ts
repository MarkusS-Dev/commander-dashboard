import { readJson, writeJson } from "./client";

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
	imageUrl?: string;
};

type CommanderCache = {
	totalCards: number;
	updatedAt: string;
	sourceUpdatedAt?: string;
	commanders: CommanderSummary[];
};

type ScryfallBulkDataItem = {
	type: string;
	updated_at: string;
};

type ScryfallBulkDataResponse = {
	data: ScryfallBulkDataItem[];
};

const CACHE_PATH = "data/commanders-cache.json";
const SEARCH_URL = "https://api.scryfall.com/cards/search";
const SEARCH_QUERY = "is:commander";

function normalize(text: string) {
	return text.trim().toLowerCase();
}

function commanderImageUrl(card: ScryfallCard): string | undefined {
	return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
}

async function fetchCommanderById(id: string): Promise<CommanderSummary | null> {
	try {
		const card = await fetchScryfallJson<ScryfallCard>(`https://api.scryfall.com/cards/${id}`);
		return {
			id: card.id,
			name: card.name,
			colors: card.colors ?? [],
			manaCost: card.mana_cost ?? "",
			imageUrl: commanderImageUrl(card),
		};
	} catch {
		return null;
	}
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

async function fetchCommanderSourceUpdatedAt(): Promise<string | null> {
	try {
		const bulk = await fetchScryfallJson<ScryfallBulkDataResponse>("https://api.scryfall.com/bulk-data");
		const oracle = bulk.data.find(item => item.type === "oracle_cards");
		return oracle?.updated_at ?? null;
	} catch {
		return null;
	}
}

async function fetchCommanderCacheFromScryfall(): Promise<CommanderCache> {
	const baseUrl = `${SEARCH_URL}?q=${encodeURIComponent(SEARCH_QUERY)}&unique=cards&order=name&dir=asc&page=1`;
	const firstPage = await fetchCommanderPage(baseUrl);
	const commanders: CommanderSummary[] = firstPage.data.map(card => ({
		id: card.id,
		name: card.name,
		colors: card.colors ?? [],
		manaCost: card.mana_cost ?? "",
		imageUrl: commanderImageUrl(card),
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
				imageUrl: commanderImageUrl(card),
			}))
		);
		nextPage = page.next_page;
	}

	return {
		totalCards: firstPage.total_cards,
		updatedAt: new Date().toISOString(),
		sourceUpdatedAt: await fetchCommanderSourceUpdatedAt() ?? new Date().toISOString(),
		commanders,
	};
}

function commanderNeedsHydration(commander: CommanderSummary | undefined): boolean {
	if (!commander)
		return true;

	return !Array.isArray(commander.colors) || commander.colors.length === 0 && !commander.manaCost;
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
	try {
		await writeJson(CACHE_PATH, cache);
	} catch {
		// Ignore write failures (e.g. read-only serverless filesystem).
	}
}

async function getCommanderCache(): Promise<CommanderCache> {
	const cache = await loadCommanderCache();
	const sourceUpdatedAt = await fetchCommanderSourceUpdatedAt();

	if (cache && sourceUpdatedAt && cache.sourceUpdatedAt === sourceUpdatedAt)
		return cache;

	try {
		if (cache && sourceUpdatedAt && cache.sourceUpdatedAt !== sourceUpdatedAt) {
			const refreshed = await fetchCommanderCacheFromScryfall();
			await saveCommanderCache(refreshed);
			return refreshed;
		}

		const searchUrl = `${SEARCH_URL}?q=${encodeURIComponent(SEARCH_QUERY)}&unique=cards&order=name&dir=asc&page=1`;
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
			if (Array.isArray(direct.colors) && direct.colors.length >= 0 && direct.imageUrl) {
				resolved.push(direct);
				continue;
			}

			const hydrated = await fetchCommanderById(id);
			resolved.push(hydrated ?? direct);
			continue;
		}

		const hydrated = await fetchCommanderById(id);
		if (hydrated) {
			resolved.push(hydrated);
		}
	}

	return resolved;
}