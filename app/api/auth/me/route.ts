import { requireEditorSession } from "@/lib/auth/session";

export async function GET() {
	try {
		const session = await requireEditorSession();
		return Response.json({
			ok: true,
			authenticated: true,
			email: session.email,
		}, {
			headers: {
				"Cache-Control": "private, max-age=15, stale-while-revalidate=60",
			},
		});
	} catch {
		return Response.json({
			ok: false,
			authenticated: false,
		}, {
			headers: {
				"Cache-Control": "private, max-age=15, stale-while-revalidate=60",
			},
		});
	}
}
