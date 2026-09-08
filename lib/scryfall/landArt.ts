export type ManaColor = "White" | "Blue" | "Black" | "Red" | "Green";

export const DEFAULT_LAND_ART_BY_COLOR: Record<ManaColor, string> = {
	White: "",
	Blue: "",
	Black: "",
	Red: "",
	Green: "",
};

type ScryfallCardResult = {
	image_uris?: {
		normal?: string;
	};
	card_faces?: Array<{
		image_uris?: {
			normal?: string;
		};
	}>;
};

type ScryfallSearchResponse = {
	data?: ScryfallCardResult[];
};

function scryfallImageUrl(card: ScryfallCardResult) {
	return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? "";
}

async function fetchLatestBasicLandArt(cardName: string): Promise<string> {
	const query = `!"${cardName}" t:basic unique:prints`;
	const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=released&dir=desc`;
	const res = await fetch(url, {
		headers: {
			Accept: "application/json",
		},
		next: {
			revalidate: 24 * 60 * 60,
		},
	});

	if (!res.ok)
		return "";

	const data = (await res.json()) as ScryfallSearchResponse;
	const first = data.data?.[0];
	if (!first)
		return "";

	return scryfallImageUrl(first);
}

export async function loadLatestLandArtByColor(): Promise<Record<ManaColor, string>> {
	const entries: Array<[ManaColor, string]> = [
		["White", "Plains"],
		["Blue", "Island"],
		["Black", "Swamp"],
		["Red", "Mountain"],
		["Green", "Forest"],
	];

	try {
		const images = await Promise.all(
			entries.map(async ([color, cardName]) => [color, await fetchLatestBasicLandArt(cardName)] as const)
		);

		return {
			White: images.find(([color]) => color === "White")?.[1] ?? "",
			Blue: images.find(([color]) => color === "Blue")?.[1] ?? "",
			Black: images.find(([color]) => color === "Black")?.[1] ?? "",
			Red: images.find(([color]) => color === "Red")?.[1] ?? "",
			Green: images.find(([color]) => color === "Green")?.[1] ?? "",
		};
	} catch {
		return DEFAULT_LAND_ART_BY_COLOR;
	}
}
