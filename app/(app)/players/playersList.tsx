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

	const [createOpen, setCreateOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [newColor, setNewColor] = useState("#000000");
	const [addingPlayer, setAddingPlayer] = useState(false);

	const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
	const [editName, setEditName] = useState("");
	const [editColor, setEditColor] = useState("#000000");
	const [savingPlayer, setSavingPlayer] = useState(false);
	const [deletingPlayer, setDeletingPlayer] = useState(false);

	const [error, setError] = useState<string | null>(null);

	const { isEditor } = useEditor();

	useEffect(() => {
		void loadPlayers();
	}, []);

	async function loadPlayers() {
		const res = await fetch("/api/players");
		const text = await res.text();
		const loadedPlayers: Player[] = text ? JSON.parse(text) : [];
		setPlayers(loadedPlayers);
	}

	function openCreatePopup() {
		setCreateOpen(true);
		setError(null);
	}

	function closeCreatePopup() {
		setCreateOpen(false);
		setNewName("");
		setNewColor("#000000");
		setError(null);
	}

	function openEditPopup(player: Player) {
		setEditingPlayerId(player.id);
		setEditName(player.name);
		setEditColor(player.color);
		setError(null);
	}

	function closeEditPopup() {
		setEditingPlayerId(null);
		setEditName("");
		setEditColor("#000000");
		setError(null);
	}

	async function addPlayer() {
		const trimmedName = newName.trim();
		if (!trimmedName)
			return;

		setError(null);
		setAddingPlayer(true);

		try {
			const res = await fetch("/api/players", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: trimmedName, color: newColor }),
			});

			if (!res.ok) {
				setError(await res.text());
				return;
			}

			const created: Player = await res.json();
			setPlayers(prev => [...prev, created]);
			closeCreatePopup();
		} finally {
			setAddingPlayer(false);
		}
	}

	async function savePlayerChanges() {
		if (editingPlayerId == null)
			return;

		const trimmedName = editName.trim();
		if (!trimmedName) {
			setError("Player name is required");
			return;
		}

		setError(null);
		setSavingPlayer(true);

		try {
			const res = await fetch("/api/players", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: editingPlayerId,
					name: trimmedName,
					color: editColor,
				}),
			});

			if (!res.ok) {
				setError(await res.text());
				return;
			}

			const saved: Player = await res.json();
			setPlayers(prev => prev.map(p => (p.id === saved.id ? saved : p)));
			closeEditPopup();
		} finally {
			setSavingPlayer(false);
		}
	}

	async function deletePlayer() {
		if (editingPlayerId == null)
			return;

		const confirmed = window.confirm("Are you sure you want to delete this player?");
		if (!confirmed)
			return;

		setError(null);
		setDeletingPlayer(true);

		try {
			const res = await fetch("/api/players", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: editingPlayerId }),
			});

			if (!res.ok) {
				setError(await res.text());
				return;
			}

			setPlayers(prev => prev.filter(player => player.id !== editingPlayerId));
			closeEditPopup();
		} finally {
			setDeletingPlayer(false);
		}
	}

	return (
		<section className="w-full max-w-md space-y-8">
			<ReadOnlyBanner message="Log in to edit players." />

			{isEditor && (
				<div>
					<button
						onClick={openCreatePopup}
						className="w-full border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
					>
						Create new player
					</button>
				</div>
			)}

			<ul className="space-y-3">
				{players.map(player => (
					<li
						key={player.id}
						className="border-b border-neutral-200 pb-3"
					>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<div
									className="h-4 w-4 rounded"
									style={{ backgroundColor: player.color }}
								/>
								<span className="text-neutral-900">{player.name}</span>
							</div>

							{isEditor && (
								<button
									onClick={() => openEditPopup(player)}
									className="text-sm text-neutral-600 hover:text-neutral-900"
								>
									Edit
								</button>
							)}
						</div>
					</li>
				))}
			</ul>

			{isEditor && createOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="w-full max-w-md border border-neutral-200 bg-white shadow-2xl">
						<div className="border-b border-neutral-200 px-6 py-4">
							<div className="text-lg font-semibold text-neutral-900">Create new player</div>
						</div>

						<div className="space-y-3 px-6 py-4">
							<div className="flex items-center gap-3">
								<label className="text-sm text-neutral-600">Name</label>
								<input
									value={newName}
									onChange={e => setNewName(e.target.value)}
									placeholder="Player name"
									className="w-full border border-neutral-300 px-3 py-2 text-sm"
								/>
							</div>

							<div className="flex items-center gap-3">
								<label className="text-sm text-neutral-600">Color</label>
								<input
									type="color"
									value={newColor}
									onChange={e => setNewColor(e.target.value)}
									className="h-9 w-14 cursor-pointer"
								/>
							</div>

							{error && <p className="text-sm text-red-600">{error}</p>}
						</div>

						<div className="border-t border-neutral-200 px-6 py-4">
							<div className="flex gap-3">
								<button
									onClick={addPlayer}
									disabled={addingPlayer || !newName.trim()}
									className="flex-1 border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
								>
									Create
								</button>
								<button
									onClick={closeCreatePopup}
									className="border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{isEditor && editingPlayerId != null && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="w-full max-w-md border border-neutral-200 bg-white shadow-2xl">
						<div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 gap-3">
							<div className="text-lg font-semibold text-neutral-900">Edit player</div>
							<button
								onClick={deletePlayer}
								disabled={savingPlayer || deletingPlayer}
								className="whitespace-nowrap border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-200 disabled:text-red-300 disabled:hover:bg-white"
							>
								Delete
							</button>
						</div>

						<div className="space-y-3 px-6 py-4">
							<div className="flex items-center gap-3">
								<label className="text-sm text-neutral-600">Name</label>
								<input
									value={editName}
									onChange={e => setEditName(e.target.value)}
									placeholder="Player name"
									className="w-full border border-neutral-300 px-3 py-2 text-sm"
								/>
							</div>

							<div className="flex items-center gap-3">
								<label className="text-sm text-neutral-600">Color</label>
								<input
									type="color"
									value={editColor}
									onChange={e => setEditColor(e.target.value)}
									className="h-9 w-14 cursor-pointer"
								/>
							</div>

							{error && <p className="text-sm text-red-600">{error}</p>}
						</div>

						<div className="border-t border-neutral-200 px-6 py-4">
							<div className="flex gap-3">
								<button
									onClick={savePlayerChanges}
									disabled={savingPlayer || deletingPlayer || !editName.trim()}
									className="flex-1 border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
								>
									Save
								</button>

								<button
									onClick={closeEditPopup}
									disabled={savingPlayer || deletingPlayer}
									className="border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
