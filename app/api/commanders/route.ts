import {
	loadCommanderCatalog,
	resolveCommandersById,
} from "@/lib/github/commanderIndexRepository";
import { resolveDeckCommandersById } from "@/lib/github/deckRepository";

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const ids = url.searchParams.get("ids") ?? "";

		if (ids.trim()) {
			const commanderIds = ids
				.split(",")
				.map(id => id.trim())
				.filter(Boolean)
				.map(id => (id.match(/^\d+$/) ? Number(id) : id));

			const fromDecks = await resolveDeckCommandersById(commanderIds);
			const foundIds = new Set(fromDecks.map(commander => commander.id));
			const missingIds = commanderIds.filter(id => !foundIds.has(String(id)));

			if (missingIds.length === 0)
				return Response.json(fromDecks, {
					headers: {
						"Cache-Control": "public, max-age=30, stale-while-revalidate=120",
					},
				});

			const hydratedMissing = await resolveCommandersById(missingIds);
			return Response.json([...fromDecks, ...hydratedMissing], {
				headers: {
					"Cache-Control": "public, max-age=30, stale-while-revalidate=120",
				},
			});
		}

		return Response.json(await loadCommanderCatalog(), {
			headers: {
				"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
			},
		});
	} catch (e) {
		console.error(e);
		return Response.json([], { status: 500 });
	}
}
