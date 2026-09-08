import {
	loadCommanderCatalog,
	resolveCommandersById,
} from "@/lib/github/commanderIndexRepository";
import { resolveDeckCommandersById } from "@/lib/github/deckRepository";

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const query = url.searchParams.get("query") ?? url.searchParams.get("q") ?? "";
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
				return Response.json(fromDecks);

			const hydratedMissing = await resolveCommandersById(missingIds);
			return Response.json([...fromDecks, ...hydratedMissing]);
		}

		return Response.json(await loadCommanderCatalog());
	} catch (e) {
		console.error(e);
		return Response.json([], { status: 500 });
	}
}
