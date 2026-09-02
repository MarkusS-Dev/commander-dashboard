import { readJson, writeJson } from "./client";
import { Game } from "@/lib/domain/gameRules";

const PATH = "data/games.json";

export async function loadGames(): Promise<Game[]> {
	const games = await readJson<Game[]>(PATH);
	return Array.isArray(games) ? games : [];
}

export async function saveGames(games: Game[]): Promise<void> {
	await writeJson(PATH, games);
}
