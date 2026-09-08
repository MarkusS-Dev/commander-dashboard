import { loadPlayers, savePlayers } from "@/lib/github/playerRepository";
import { requireEditorSession } from "@/lib/auth/session";

export async function GET() {
	const players = await loadPlayers();
	return Response.json(players, {
		headers: {
			"Cache-Control": "public, max-age=30, stale-while-revalidate=120",
		},
	});
}

export async function POST(req: Request) {
	await requireEditorSession(); // 🔐

	const { name, color } = await req.json();

	if (!name || typeof name !== "string")
		return new Response("Name is required", { status: 400 });

	const players = await loadPlayers();

	const nextId =
		players.length === 0
			? 1
			: Math.max(...players.map(p => p.id)) + 1;

	const player = {
		id: nextId,
		name: name.trim(),
		color: typeof color === "string" ? color : "#000000",
	};

	players.push(player);
	await savePlayers(players);

	return Response.json(player, { status: 201 });
}


export async function PUT(req: Request) {
	await requireEditorSession(); // 🔐

	const { id, name, color } = await req.json();

	if (typeof id !== "number")
		return new Response("Player id is required", { status: 400 });

	if (typeof name !== "string" || !name.trim())
		return new Response("Name is required", { status: 400 });

	if (typeof color !== "string" || !color.trim())
		return new Response("Color is required", { status: 400 });

	const players = await loadPlayers();
	const player = players.find(p => p.id === id);

	if (!player)
		return new Response("Player not found", { status: 404 });

	player.name = name.trim();
	player.color = color;
	await savePlayers(players);

	return Response.json(player);
}


export async function DELETE(req: Request) {
	await requireEditorSession(); // 🔐

	const { id } = await req.json();

	if (typeof id !== "number")
		return new Response("Player id is required", { status: 400 });

	const players = await loadPlayers();
	const index = players.findIndex(p => p.id === id);

	if (index === -1)
		return new Response("Player not found", { status: 404 });

	players.splice(index, 1);
	await savePlayers(players);

	return Response.json({ success: true });
}