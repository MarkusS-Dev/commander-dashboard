type CacheEntry = {
	expiresAt: number;
	value: unknown;
};

const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

function nowMs() {
	return Date.now();
}

function isFresh(entry: CacheEntry | undefined) {
	return Boolean(entry && entry.expiresAt > nowMs());
}

export async function fetchJsonCached<T>(
	url: string,
	options?: {
		ttlMs?: number;
	}
): Promise<T> {
	const ttlMs = options?.ttlMs ?? 30_000;
	const cached = responseCache.get(url);

	if (isFresh(cached))
		return cached!.value as T;

	const pending = inFlight.get(url);
	if (pending)
		return pending as Promise<T>;

	const request = (async () => {
		const res = await fetch(url);
		if (!res.ok)
			throw new Error(await res.text());

		const text = await res.text();
		const value = (text ? JSON.parse(text) : []) as T;

		if (ttlMs > 0) {
			responseCache.set(url, {
				value,
				expiresAt: nowMs() + ttlMs,
			});
		}

		return value;
	})();

	inFlight.set(url, request);

	try {
		return await request as T;
	} finally {
		inFlight.delete(url);
	}
}

export function invalidateFetchCacheByPrefix(prefixes: string[]) {
	for (const key of responseCache.keys()) {
		if (prefixes.some(prefix => key.startsWith(prefix)))
			responseCache.delete(key);
	}
}

export function clearFetchCache() {
	responseCache.clear();
}
