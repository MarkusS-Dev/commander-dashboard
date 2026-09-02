import {
	loadCommanders,
	saveCommanders
} from "@/lib/github/commanderRepository";
import { loadDecks } from "@/lib/github/deckRepository";
import { createCommander } from "@/lib/domain/commanderRules";
import { requireEditorSession } from "@/lib/auth/session";

export async function GET() {
	try {
		const commanders = await loadCommanders();
		return Response.json(commanders);
	} catch (e) {
		console.error(e);
		return Response.json([], { status: 500 });
	}
}

export async function POST(req: Request) {
	await requireEditorSession(); // 🔐 editor-only

	try {
		const { name, colors, manaCost } = await req.json();

		const commanders = await loadCommanders();
		const commander = createCommander(
			commanders,
			name,
			colors ?? [],
			manaCost ?? ""
		);

		commanders.push(commander);
		await saveCommanders(commanders);

		return Response.json(commander, { status: 201 });
	} catch (e: any) {
		console.error(e);
		return new Response(e.message ?? "Failed to add commander", {
			status: 400
		});
	}
}

export async function DELETE(req: Request) {
	await requireEditorSession(); // 🔐 editor-only

	try {
		const { id } = await req.json();

		const decks = await loadDecks();
		const isUsed = decks.some(
			d => d.commanderAId === id || d.commanderBId === id
		);

		if (isUsed) {
			return new Response(
				"Commander is used by a deck and cannot be removed",
				{ status: 400 }
			);
		}

		const commanders = await loadCommanders();
		const filtered = commanders.filter(c => c.id !== id);

		if (filtered.length === commanders.length) {
			return new Response("Commander not found", { status: 404 });
		}

		await saveCommanders(filtered);
		return new Response(null, { status: 204 });
	} catch (e) {
		console.error(e);
		return new Response("Failed to delete commander", { status: 500 });
	}
}
