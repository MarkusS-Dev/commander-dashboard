const SPECIAL_COLOR_CHOICE_COMMANDERS = new Set([
	"9a1ee042-6713-4e9e-9901-9b94d99d33f1",
	"c78c2713-39e7-4a6e-a132-027099a89665",
	"25564fba-5765-457b-8dd3-f26b877221b8",
]);

export function requiresCommanderColorChoice(commanderId: string | number): boolean {
	return SPECIAL_COLOR_CHOICE_COMMANDERS.has(String(commanderId));
}
