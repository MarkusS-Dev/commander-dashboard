import {
	loadCommanderCatalog,
	resolveCommandersById,
} from "@/lib/github/commanderIndexRepository";

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

			return Response.json(await resolveCommandersById(commanderIds));
		}

		return Response.json(await loadCommanderCatalog());
	} catch (e) {
		console.error(e);
		return Response.json([], { status: 500 });
	}
}
