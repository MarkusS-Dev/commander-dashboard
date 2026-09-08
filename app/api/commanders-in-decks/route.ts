import { loadCommandersInDecks } from "@/lib/github/commandersInDecksRepository";

export async function GET() {
	const commandersInDecks = await loadCommandersInDecks();

	return Response.json(commandersInDecks, {
		headers: {
			"Cache-Control": "public, max-age=30, stale-while-revalidate=120",
		},
	});
}
