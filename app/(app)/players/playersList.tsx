"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/lib/auth/useEditor";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";

type Player = {
	id: number;
	name: string;
	color: string;
};

export default function PlayersList() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [name, setName] = useState("");
	const [color, setColor] = useState("#000000");

	const [editingId, setEditingId] = useState<number | null>(null);
	const [draftColor, setDraftColor] = useState<string>("");

	const { isEditor } = useEditor();

	useEffect(() => {
		loadPlayers();
	}, []);

	async function loadPlayers() {
		const res = await fetch("/api/players");
		setPlayers(await res.json());
	}

	async function addPlayer() {
		if (!name.trim())
			return;

		const res = await fetch("/api/players", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, color }),
		});

		if (!res.ok)
			return;

		setName("");
		setColor("#000000");
		loadPlayers();
	}

	function startColorEdit(player: Player) {
		setEditingId(player.id);
		setDraftColor(player.color);
	}

	async function applyColorChange(playerId: number) {
		const newColor = draftColor;

		setPlayers(prev =>
			prev.map(p =>
				p.id === playerId
					? { ...p, color: newColor }
					: p
			)
		);

		await fetch("/api/players", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: playerId,
				color: newColor,
			}),
		});

		setEditingId(null);
	}

	async function removePlayer(id: number) {
		const res = await fetch("/api/players", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});

		if (res.ok)
			loadPlayers();
	}

	return (
		<section className="w-full max-w-md space-y-8">

			{/* Read-only banner (auto-handles auth) */}
			<ReadOnlyBanner message="Log in to edit players." />

			{/* Players list */}
			<ul className="space-y-3">
				{players.map(player => {
					const isEditing = editingId === player.id;

					return (
						<li
							key={player.id}
							className="border-b border-neutral-200 pb-3"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div
										className="h-4 w-4 rounded"
										style={{ backgroundColor: player.color }}
									/>
									<span className="text-neutral-900">
										{player.name}
									</span>
								</div>

								{isEditor && (
									<div className="flex items-center gap-3">
										{!isEditing && (
											<button
												onClick={() => startColorEdit(player)}
												className="text-sm text-neutral-600 hover:text-neutral-900"
											>
												Change color
											</button>
										)}

										<button
											onClick={() => removePlayer(player.id)}
											className="text-sm text-red-600 hover:text-red-800"
										>
											Delete
										</button>
									</div>
								)}
							</div>

							{isEditor && isEditing && (
								<div className="mt-3 flex items-center gap-3">
									<input
										type="color"
										value={draftColor}
										onChange={e => setDraftColor(e.target.value)}
										className="h-8 w-12 cursor-pointer"
									/>

									<button
										onClick={() =>
											applyColorChange(player.id)
										}
										className="border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
									>
										Apply color
									</button>

									<button
										onClick={() => setEditingId(null)}
										className="text-sm text-neutral-500 hover:text-neutral-700"
									>
										Cancel
									</button>
								</div>
							)}
						</li>
					);
				})}
			</ul>

			{/* Add new player */}
			{isEditor && (
				<div className="space-y-3">
					<input
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="New player name"
						className="w-full border border-neutral-300 px-3 py-2 text-sm"
					/>

					<div className="flex items-center gap-3">
						<label className="text-sm text-neutral-600">
							Color
						</label>
						<input
							type="color"
							value={color}
							onChange={e => setColor(e.target.value)}
							className="h-8 w-12 cursor-pointer"
						/>
					</div>

					<button
						onClick={addPlayer}
						className="w-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
					>
						Add player
					</button>
				</div>
			)}
		</section>
	);
}
