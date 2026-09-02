import { Octokit } from "octokit";

const octokit = new Octokit({
	auth: process.env.GITHUB_TOKEN
});

export async function updateJsonFile(path: string, json: any, message: string) {
	const owner = process.env.GITHUB_OWNER!;
	const repo = process.env.GITHUB_REPO!;

	// get current file sha
	const { data } = await octokit.rest.repos.getContent({
		owner,
		repo,
		path
	});

	const sha = !Array.isArray(data) ? data.sha : undefined;

	const content = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");

	await octokit.rest.repos.createOrUpdateFileContents({
		owner,
		repo,
		path,
		message,
		content,
		sha
	});
}
