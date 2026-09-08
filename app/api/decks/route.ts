import { loadDecks, saveDecks } from "@/lib/github/deckRepository";
import { loadPlayers } from "@/lib/github/playerRepository";
import { resolveCommandersById } from "@/lib/github/commanderIndexRepository";
import { createDeck } from "@/lib/domain/deckRules";
import { requiresCommanderColorChoice } from "@/lib/domain/specialCommanderColorChoices";
import { requireEditorSession } from "@/lib/auth/session";

async function resolveCommandersSafe(ids: Array<string | number>) {
	try {
		return await resolveCommandersById(ids);
	} catch {
		return [];
	}
}

function normalizeColors(value: unknown): string[] | undefined {
	if (!Array.isArray(value))
		return undefined;

	const colors = value
		.filter((color): color is string => typeof color === "string")
		.map(color => color.trim())
		.filter(Boolean)
		.filter(color => ["W", "U", "B", "R", "G"].includes(color));

	return colors.length > 0 ? colors : undefined;
}

export async function GET() {
	const decks = await loadDecks();
	return Response.json(decks, {
		headers: {
			"Cache-Control": "public, max-age=30, stale-while-revalidate=120",
		},
	});
}

export async function POST(req: Request) {
	await requireEditorSession(); // 🔐 editor-only

	const {
		name,
		playerId,
		commanderAId,
		commanderAName,
		commanderAImageUrl,
		commanderAColors,
		commanderBId,
		commanderBName,
		commanderBImageUrl,
		commanderBColors,
	} = await req.json();

	const players = await loadPlayers();
	if (!players.some(p => p.id === playerId))
		return new Response("Player not found", { status: 400 });

	const resolved = await resolveCommandersSafe(
		[commanderAId, commanderBId].filter(
			(id): id is string | number => id != null && String(id).trim() !== ""
		)
	);
	const resolvedById = new Map(resolved.map(commander => [commander.id, commander]));
	const resolvedA = resolvedById.get(String(commanderAId));
	const resolvedB = commanderBId != null ? resolvedById.get(String(commanderBId)) : undefined;
	const chosenAColors = normalizeColors(commanderAColors);
	const chosenBColors = normalizeColors(commanderBColors);
	const effectiveAColors = resolvedA?.colors.length
		? resolvedA.colors
		: requiresCommanderColorChoice(commanderAId)
			? chosenAColors
			: resolvedA?.colors;
	const effectiveBColors = commanderBId != null && resolvedB?.colors.length
		? resolvedB.colors
		: commanderBId != null && requiresCommanderColorChoice(commanderBId)
			? chosenBColors
			: resolvedB?.colors;

	if (requiresCommanderColorChoice(commanderAId) && (!effectiveAColors || effectiveAColors.length === 0))
		return new Response("A color choice is required for this commander", { status: 400 });

	if (commanderBId != null && requiresCommanderColorChoice(commanderBId) && (!effectiveBColors || effectiveBColors.length === 0))
		return new Response("A color choice is required for this commander", { status: 400 });

	const decks = await loadDecks();
	const deck = createDeck(
		decks,
		name,
		playerId,
		commanderAId,
		commanderBId,
		{
			commanderAName: resolvedA?.name ?? (typeof commanderAName === "string" ? commanderAName : undefined),
			commanderAImageUrl: resolvedA?.imageUrl ?? (typeof commanderAImageUrl === "string" ? commanderAImageUrl : undefined),
			commanderAColors: effectiveAColors,
			commanderBName: resolvedB?.name ?? (typeof commanderBName === "string" ? commanderBName : undefined),
			commanderBImageUrl: resolvedB?.imageUrl ?? (typeof commanderBImageUrl === "string" ? commanderBImageUrl : undefined),
			commanderBColors: effectiveBColors,
		}
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

export async function PUT(req: Request) {
	await requireEditorSession(); // 🔐 editor-only

	const {
		id,
		name,
		playerId,
		commanderAId,
		commanderAName,
		commanderAImageUrl,
		commanderAColors,
		commanderBId,
		commanderBName,
		commanderBImageUrl,
		commanderBColors,
	} = await req.json();

	if (typeof id !== "number")
		return new Response("Deck id is required", { status: 400 });

	if (typeof name !== "string" || !name.trim())
		return new Response("Deck name is required", { status: 400 });

	if (typeof playerId !== "number")
		return new Response("Player id is required", { status: 400 });

	if ((typeof commanderAId !== "string" && typeof commanderAId !== "number") || String(commanderAId).trim() === "")
		return new Response("First commander is required", { status: 400 });

	if (commanderBId != null && typeof commanderBId !== "string" && typeof commanderBId !== "number")
		return new Response("Second commander id is invalid", { status: 400 });

	if (commanderBId != null && String(commanderBId) === String(commanderAId))
		return new Response("Commander A and B cannot be the same", { status: 400 });

	const players = await loadPlayers();
	if (!players.some(p => p.id === playerId))
		return new Response("Player not found", { status: 400 });

	const resolved = await resolveCommandersSafe(
		[commanderAId, commanderBId].filter(
			(id): id is string | number => id != null && String(id).trim() !== ""
		)
	);
	const resolvedById = new Map(resolved.map(commander => [commander.id, commander]));
	const resolvedA = resolvedById.get(String(commanderAId));
	const resolvedB = commanderBId != null ? resolvedById.get(String(commanderBId)) : undefined;
	const chosenAColors = normalizeColors(commanderAColors);
	const chosenBColors = normalizeColors(commanderBColors);

	const decks = await loadDecks();
	const index = decks.findIndex(deck => deck.id === id);
	if (index === -1)
		return new Response("Deck not found", { status: 404 });

	decks[index] = {
		...decks[index],
		name: name.trim(),
		playerId,
		commanderAId,
		commanderAName: resolvedA?.name ?? (typeof commanderAName === "string" ? commanderAName : undefined),
		commanderAImageUrl: resolvedA?.imageUrl ?? (typeof commanderAImageUrl === "string" ? commanderAImageUrl : undefined),
		commanderAColors: resolvedA?.colors.length
			? resolvedA.colors
			: requiresCommanderColorChoice(commanderAId)
				? (chosenAColors ?? decks[index].commanderAColors)
				: decks[index].commanderAColors,
		commanderBId:
			(commanderBId == null || (typeof commanderBId === "string" && commanderBId.trim() === ""))
				? undefined
				: commanderBId,
		commanderBName: resolvedB?.name ?? (typeof commanderBName === "string" ? commanderBName : undefined),
		commanderBImageUrl: resolvedB?.imageUrl ?? (typeof commanderBImageUrl === "string" ? commanderBImageUrl : undefined),
		commanderBColors: resolvedB?.colors.length
			? resolvedB.colors
			: commanderBId != null && requiresCommanderColorChoice(commanderBId)
				? (chosenBColors ?? decks[index].commanderBColors)
				: decks[index].commanderBColors,
	};

	await saveDecks(decks);

	return Response.json(decks[index]);
}
