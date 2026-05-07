import { logLine } from './logger.js';

export interface ComposioToolItem {
	slug: string;
	name: string;
	description: string;
	human_description?: string;
	toolkit?: { slug: string; name: string };
	input_parameters: unknown;
	is_deprecated?: boolean;
}

interface ToolsListResponse {
	items: ComposioToolItem[];
	next_cursor?: string | null;
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
	url: string,
	init: RequestInit,
	correlationId: string,
): Promise<Response> {
	const max = Math.min(Math.max(parseInt(process.env.COMPOSIO_HTTP_MAX_RETRIES ?? '3', 10), 0), 8);
	const timeoutMs = Math.min(
		Math.max(parseInt(process.env.COMPOSIO_HTTP_TIMEOUT_MS ?? '60000', 10), 1000),
		300_000,
	);

	let attempt = 0;
	let lastErr: unknown;
	while (attempt <= max) {
		const ac = new AbortController();
		const t = setTimeout(() => ac.abort(), timeoutMs);
		try {
			const res = await fetch(url, { ...init, signal: ac.signal });
			clearTimeout(t);
			if (res.status === 429 || res.status >= 500) {
				const retryAfter = res.headers.get('retry-after');
				const waitMs = retryAfter
					? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
					: Math.min(500 * 2 ** attempt, 10_000);
				if (attempt < max) {
					logLine('warn', 'composio_upstream_retry', {
						correlationId,
						url: redactUrl(url),
						status: res.status,
						attempt,
						waitMs,
					});
					await sleep(waitMs);
					attempt++;
					continue;
				}
			}
			return res;
		} catch (e) {
			clearTimeout(t);
			lastErr = e;
			if (attempt < max) {
				const waitMs = Math.min(500 * 2 ** attempt, 10_000);
				logLine('warn', 'composio_fetch_retry', {
					correlationId,
					url: redactUrl(url),
					attempt,
					waitMs,
					error: e instanceof Error ? e.message : String(e),
				});
				await sleep(waitMs);
				attempt++;
				continue;
			}
			throw e;
		}
	}
	throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function redactUrl(url: string): string {
	try {
		const u = new URL(url);
		return `${u.origin}${u.pathname}`;
	} catch {
		return 'invalid-url';
	}
}

export class ComposioClient {
	private readonly baseUrlNorm: string;

	constructor(
		private readonly apiKey: string,
		baseUrl: string,
	) {
		this.baseUrlNorm = baseUrl.replace(/\/$/, '');
	}

	private headers(): HeadersInit {
		return {
			'x-api-key': this.apiKey,
			'Content-Type': 'application/json',
		};
	}

	async listTools(correlationId: string): Promise<ComposioToolItem[]> {
		const excludeDeprecated = process.env.COMPOSIO_EXCLUDE_DEPRECATED !== 'false';
		const maxItems = Math.min(
			Math.max(parseInt(process.env.COMPOSIO_TOOLS_MAX ?? '500', 10), 1),
			2000,
		);
		const pageLimit = Math.min(
			Math.max(parseInt(process.env.COMPOSIO_TOOLS_PAGE_LIMIT ?? '100', 10), 1),
			1000,
		);
		const allowedToolkits = process.env.COMPOSIO_ALLOWED_TOOLKITS?.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const allowedSlugs = new Set(
			process.env.COMPOSIO_ALLOWED_ACTIONS?.split(',')
				.map((s) => s.trim())
				.filter(Boolean) ?? [],
		);

		const merged = new Map<string, ComposioToolItem>();

		const ingestItems = (items: ComposioToolItem[]) => {
			for (const it of items) {
				if (!it?.slug) continue;
				if (excludeDeprecated && it.is_deprecated) continue;
				if (allowedSlugs.size > 0 && !allowedSlugs.has(it.slug)) continue;
				if (!merged.has(it.slug)) merged.set(it.slug, it);
			}
		};

		const fetchAllForQuery = async (params: URLSearchParams) => {
			params.set('limit', String(pageLimit));
			let cursor: string | undefined;
			let count = 0;
			let pages = 0;
			const maxPages = Math.min(
				Math.max(parseInt(process.env.COMPOSIO_TOOLS_MAX_PAGES ?? '100', 10), 1),
				500,
			);
			do {
				if (cursor) params.set('cursor', cursor);
				else params.delete('cursor');
				const url = `${this.baseUrlNorm}/tools?${params.toString()}`;
				const res = await fetchWithRetry(
					url,
					{ method: 'GET', headers: this.headers() },
					correlationId,
				);
				if (!res.ok) {
					const text = await res.text();
					throw new Error(`Composio list tools failed: ${res.status} ${text.slice(0, 500)}`);
				}
				const data = (await res.json()) as ToolsListResponse;
				ingestItems(data.items ?? []);
				count += data.items?.length ?? 0;
				cursor = data.next_cursor ?? undefined;
				pages++;
				if (merged.size >= maxItems || pages >= maxPages) break;
			} while (cursor && count < maxItems * 20);
		};

		if (allowedToolkits && allowedToolkits.length > 0) {
			for (const tk of allowedToolkits) {
				const params = new URLSearchParams();
				params.set('toolkit_slug', tk);
				await fetchAllForQuery(params);
				if (merged.size >= maxItems) break;
			}
		} else {
			const params = new URLSearchParams();
			await fetchAllForQuery(params);
		}

		return [...merged.values()].slice(0, maxItems);
	}

	async executeTool(
		slug: string,
		args: Record<string, unknown>,
		correlationId: string,
	): Promise<unknown> {
		const entityId = process.env.COMPOSIO_ENTITY_ID ?? process.env.COMPOSIO_USER_ID;
		const url = `${this.baseUrlNorm}/tools/execute/${encodeURIComponent(slug)}`;
		const body: Record<string, unknown> = {
			arguments: args,
		};
		if (entityId) body.user_id = entityId;
		const connected = process.env.COMPOSIO_CONNECTED_ACCOUNT_ID;
		if (connected) body.connected_account_id = connected;

		const res = await fetchWithRetry(
			url,
			{
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(body),
			},
			correlationId,
		);

		const text = await res.text();
		let json: unknown;
		try {
			json = text ? JSON.parse(text) : {};
		} catch {
			json = { raw: text };
		}

		if (!res.ok) {
			const msg =
				typeof json === 'object' && json !== null && 'error' in json
					? JSON.stringify((json as { error: unknown }).error)
					: text.slice(0, 1000);
			throw new Error(`Composio execute failed (${res.status}): ${msg}`);
		}

		return json;
	}
}
