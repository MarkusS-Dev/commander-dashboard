// lib/github/playerRepository.ts

import { Player } from "@/lib/domain/playersRules";
import { readJson, writeJson } from "./client";

const PATH = "data/players.json";

export async function loadPlayers(): Promise<Player[]> {
	const players = await readJson<Player[]>(PATH);
	return Array.isArray(players) ? players : [];
}

export async function savePlayers(players: Player[]): Promise<void> {
	await writeJson(PATH, players);
}
