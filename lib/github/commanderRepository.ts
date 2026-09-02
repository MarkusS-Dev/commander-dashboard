import { readJson, writeJson } from "./client";
import { Commander } from "@/lib/domain/commanderRules";

const PATH = "data/commanders.json";

export async function loadCommanders(): Promise<Commander[]> {
	const commanders = await readJson<Commander[]>(PATH);
	return Array.isArray(commanders) ? commanders : [];
}

export async function saveCommanders(commanders: Commander[]): Promise<void> {
	await writeJson(PATH, commanders);
}
