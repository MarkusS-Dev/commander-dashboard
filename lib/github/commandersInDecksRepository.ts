import { Deck } from "@/lib/domain/deckRules";
import type { CommanderSummary } from "./commanderIndexRepository";
import { resolveCommandersById } from "./commanderIndexRepository";
import { readJson, writeJson } from "./client";

const PATH = "data/commanders-in-decks.json";

type CommanderInDeckRecord = {
	id: string;
	name: string;
	color: string[];
	manacost: string;
	imageurl?: string;
};

function toSummary(record: CommanderInDeckRecord): CommanderSummary {
	return {
		id: record.id,
		name: record.name,
		colors: Array.isArray(record.color) ? record.color : [],
		manaCost: typeof record.manacost === "string" ? record.manacost : "",
		imageUrl: typeof record.imageurl === "string" ? record.imageurl : undefined,
	};
}

function toRecord(summary: CommanderSummary): CommanderInDeckRecord {
	return {
		id: String(summary.id),
		name: summary.name,
		color: Array.isArray(summary.colors) ? summary.colors : [],
		manacost: typeof summary.manaCost === "string" ? summary.manaCost : "",
		imageurl: summary.imageUrl,
	};
}

async function readRecords(): Promise<CommanderInDeckRecord[]> {
	try {
		const value = await readJson<CommanderInDeckRecord[]>(PATH);
		return Array.isArray(value) ? value : [];
	} catch {
		return [];
	}
}

async function writeRecords(records: CommanderInDeckRecord[]): Promise<void> {
	const sorted = [...records].sort((a, b) => a.name.localeCompare(b.name));
	const existing = await readRecords();

	if (JSON.stringify(existing) === JSON.stringify(sorted))
		return;

	await writeJson(PATH, sorted);
}

export async function loadCommandersInDecks(): Promise<CommanderSummary[]> {
	const records = await readRecords();
	return records.map(toSummary);
}

export async function resolveCommandersInDecksById(
	ids: Array<string | number>
): Promise<CommanderSummary[]> {
	if (ids.length === 0)
		return [];

	const records = await readRecords();
	const byId = new Map(records.map(record => [record.id, toSummary(record)]));
	const resolved: CommanderSummary[] = [];
	const seen = new Set<string>();

	for (const rawId of ids) {
		const id = String(rawId).trim();
		if (!id || seen.has(id))
			continue;

		seen.add(id);
		const commander = byId.get(id);
		if (commander)
			resolved.push(commander);
	}

	return resolved;
}

export async function syncCommandersInDecksFromDecks(
	decks: Deck[],
	options?: { hydrate?: boolean }
): Promise<CommanderSummary[]> {
	const ids = Array.from(
		new Set(
			decks
				.flatMap(deck => [deck.commanderAId, deck.commanderBId])
				.filter((id): id is string | number => id != null && String(id).trim() !== "")
				.map(id => String(id))
		)
	);

	if (ids.length === 0) {
		await writeRecords([]);
		return [];
	}

	const existingRecords = await readRecords();
	const existingById = new Map(existingRecords.map(record => [record.id, record]));

	const resolvedById = new Map<string, CommanderSummary>();
	if (options?.hydrate) {
		const hydrated = await resolveCommandersById(ids);
		for (const commander of hydrated)
			resolvedById.set(String(commander.id), commander);
	}

	const deckMetaById = new Map<string, { name?: string; colors?: string[]; imageUrl?: string }>();
	for (const deck of decks) {
		const commanderAId = String(deck.commanderAId);
		if (commanderAId && !deckMetaById.has(commanderAId)) {
			deckMetaById.set(commanderAId, {
				name: deck.commanderAName,
				colors: deck.commanderAColors,
				imageUrl: deck.commanderAImageUrl,
			});
		}

		const commanderBId = deck.commanderBId != null ? String(deck.commanderBId) : "";
		if (commanderBId && !deckMetaById.has(commanderBId)) {
			deckMetaById.set(commanderBId, {
				name: deck.commanderBName,
				colors: deck.commanderBColors,
				imageUrl: deck.commanderBImageUrl,
			});
		}
	}

	const records: CommanderInDeckRecord[] = ids.map(id => {
		const existing = existingById.get(id);
		const resolved = resolvedById.get(id);
		const meta = deckMetaById.get(id);

		return {
			id,
			name: meta?.name ?? resolved?.name ?? existing?.name ?? "",
			color: meta?.colors ?? resolved?.colors ?? existing?.color ?? [],
			manacost: resolved?.manaCost ?? existing?.manacost ?? "",
			imageurl: meta?.imageUrl ?? resolved?.imageUrl ?? existing?.imageurl,
		};
	});

	await writeRecords(records);
	return records.map(toSummary);
}
