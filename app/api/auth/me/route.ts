import { requireEditorSession } from "@/lib/auth/session";

export async function GET() {
	try {
		const session = await requireEditorSession();
		return Response.json({
			ok: true,
			email: session.email,
		});
	} catch {
		return Response.json(
			{ ok: false },
			{ status: 401 }
		);
	}
}
