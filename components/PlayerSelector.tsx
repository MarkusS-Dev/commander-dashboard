"use client";

export type PlayerOption = {
	id: string;
	label: string;
};

type PlayerSelectorProps = {
	players: PlayerOption[];
	value: string | null;
	onChange: (playerId: string | null) => void;
	placeholder?: string;
};

export default function PlayerSelector({
	players,
	value,
	onChange,
	placeholder = "All players",
}: PlayerSelectorProps) {
	return (
		<select
			value={value ?? ""}
			onChange={(e) =>
				onChange(e.target.value || null)
			}
			className="border border-neutral-300 px-3 py-2 text-sm bg-white"
		>
			<option value="">{placeholder}</option>

			{players.map((p) => (
				<option key={p.id} value={p.id}>
					{p.label}
				</option>
			))}
		</select>
	);
}
