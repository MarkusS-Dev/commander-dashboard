// lib/github/client.ts

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH ?? "main";
const TOKEN = process.env.GITHUB_TOKEN;

const BASE_URL = OWNER && REPO
	? `https://api.github.com/repos/${OWNER}/${REPO}/contents`
	: null;
const USE_LOCAL_FILES = !BASE_URL || !TOKEN;
const PROJECT_ROOT = process.cwd();

type GitHubFile = {
	sha: string;
	content: string;
};

function localFilePath(filePath: string) {
	return path.join(PROJECT_ROOT, filePath);
}

async function readLocalJson<T>(filePath: string): Promise<T> {
	const fullPath = localFilePath(filePath);
	const text = await readFile(fullPath, "utf8");
	return JSON.parse(text) as T;
}

async function writeLocalJson<T>(filePath: string, value: T): Promise<void> {
	const fullPath = localFilePath(filePath);
	await mkdir(path.dirname(fullPath), { recursive: true });
	await writeFile(fullPath, JSON.stringify(value, null, 2), "utf8");
	}

async function githubFetch(
	url: string,
	options: RequestInit = {}
) {
	const res = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			Accept: "application/vnd.github+json",
			...options.headers
		}
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(text);
	}

	return res.json();
}

/**
 * Reads and parses a JSON file from GitHub
 */
export async function readJson<T>(path: string): Promise<T> {
	if (USE_LOCAL_FILES)
		return readLocalJson<T>(path);

	if (!BASE_URL || !TOKEN)
		throw new Error("GitHub client is not configured");

	const data = await githubFetch(
		`${BASE_URL}/${path}?ref=${BRANCH}`
	) as GitHubFile;

	const decoded = Buffer.from(data.content, "base64").toString("utf8");
	return JSON.parse(decoded);
}

/**
 * Writes a JSON file to GitHub (creates or updates)
 */
export async function writeJson<T>(
	path: string,
	value: T,
	message = `Update ${path}`
): Promise<void> {
	if (USE_LOCAL_FILES) {
		await writeLocalJson(path, value);
		return;
	}

	if (!BASE_URL || !TOKEN)
		throw new Error("GitHub client is not configured");

	let sha: string | undefined;

	try {
		const existing = await githubFetch(
			`${BASE_URL}/${path}?ref=${BRANCH}`
		) as GitHubFile;
		sha = existing.sha;
	} catch {
		// File does not exist yet — this is fine
	}

	const content = Buffer
		.from(JSON.stringify(value, null, 2))
		.toString("base64");

	await githubFetch(`${BASE_URL}/${path}`, {
		method: "PUT",
		body: JSON.stringify({
			message,
			content,
			sha,
			branch: BRANCH
		})
	});
}
