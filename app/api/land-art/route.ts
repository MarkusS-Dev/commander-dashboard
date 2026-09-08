import { loadLatestLandArtByColor } from "@/lib/scryfall/landArt";

export async function GET() {
	const landArtByColor = await loadLatestLandArtByColor();
	return Response.json(landArtByColor, {
		headers: {
			"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
		},
	});
}
