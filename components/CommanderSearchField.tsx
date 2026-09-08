"use client";

import { useMemo, useState } from "react";
import type { CommanderSummary } from "@/lib/github/commanderIndexRepository";

type CommanderSearchFieldProps = {
	label: string;
	selectedId: string;
	selectedName: string;
	commanders: CommanderSummary[];
	onSelect: (commander: CommanderSummary | null) => void;
	excludedIds?: string[];
};

function normalizeForSearch(text: string) {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/['’`]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

export default function CommanderSearchField({
	label,
	selectedId,
	selectedName,
	commanders,
	onSelect,
	excludedIds = [],
}: CommanderSearchFieldProps) {
	const [query, setQuery] = useState(selectedName);

	const searchableCommanders = useMemo(
		() => commanders.map(commander => ({
			commander,
			normalizedName: normalizeForSearch(commander.name),
		})),
		[commanders]
	);

	const results = useMemo(() => {
		const normalizedQuery = normalizeForSearch(query);
		if (!normalizedQuery)
			return [] as CommanderSummary[];

		const tokens = normalizedQuery.split(" ").filter(Boolean);

		return searchableCommanders
			.filter(({ commander }) => !excludedIds.includes(commander.id))
			.filter(({ normalizedName }) =>
				tokens.every(token => normalizedName.includes(token))
			)
			.map(({ commander }) => commander)
			.slice(0, 12);
	}, [excludedIds, query, searchableCommanders]);

	function chooseCommander(commander: CommanderSummary) {
		onSelect(commander);
		setQuery(commander.name);
	}

	return (
		<div className="space-y-2">
			<div className="space-y-1">
				<label className="text-sm text-neutral-600">
					{label}
				</label>
				<input
					value={query}
					onChange={e => {
						setQuery(e.target.value);
						if (selectedId)
							onSelect(null);
					}}
					placeholder="Search by commander name"
					className="w-full rounded-2xl border border-neutral-300 px-3 py-2 text-sm"
				/>
			</div>

			{selectedId && (
				<p className="text-xs text-neutral-500">
					Selected: {selectedName}
				</p>
			)}

			{results.length > 0 && (
				<ul className="max-h-56 overflow-auto rounded-2xl border border-neutral-200 bg-white">
					{results.map(commander => (
						<li key={commander.id}>
							<button
								type="button"
								onClick={() => chooseCommander(commander)}
								className="flex w-full flex-col gap-1 border-b border-neutral-100 px-3 py-2 text-left hover:bg-neutral-50"
							>
								<span className="text-sm font-medium text-neutral-900">
									{commander.name}
								</span>
								<span className="text-xs text-neutral-500">
									{commander.manaCost || "—"}
									{commander.colors.length > 0 ? ` · ${commander.colors.join(" / ")}` : ""}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
