import { loadDashboardBootstrapData } from "@/lib/bootstrapData";

export async function GET() {
	const data = await loadDashboardBootstrapData();
	return Response.json(data, {
		headers: {
			"Cache-Control": "public, max-age=30, stale-while-revalidate=120",
		},
	});
}
