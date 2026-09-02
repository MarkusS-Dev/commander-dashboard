export type Commander = {
	id: number;
	name: string;
	colors: string[];
	manaCost: string;
};

export function createCommander(
	commanders: Commander[],
	name: string,
	colors: string[],
	manaCost: string
): Commander {
	const trimmedName = name.trim();
	if (!trimmedName)
		throw new Error("Commander name is required");

	const exists = commanders.some(
		c => c.name.toLowerCase() === trimmedName.toLowerCase()
	);

	if (exists)
		throw new Error("Commander already exists");

	const nextId =
		commanders.length === 0
			? 1
			: Math.max(...commanders.map(c => c.id)) + 1;

	return {
		id: nextId,
		name: trimmedName,
		colors,
		manaCost
	};
}
