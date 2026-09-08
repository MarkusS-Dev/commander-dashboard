import { loadDashboardBootstrapData } from "@/lib/bootstrapData";

export async function GET() {
	const data = await loadDashboardBootstrapData();
	return Response.json(data, {
		headers: {
			"Cache-Control": "no-store",
		},
	});
}
