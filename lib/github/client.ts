// lib/github/client.ts

const OWNER = process.env.GITHUB_OWNER!;
const REPO = process.env.GITHUB_REPO!;
const BRANCH = process.env.GITHUB_BRANCH ?? "main";
const TOKEN = process.env.GITHUB_TOKEN!;

const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

type GitHubFile = {
	sha: string;
	content: string;
};

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
