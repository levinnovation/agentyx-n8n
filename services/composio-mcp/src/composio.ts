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

interface ConnectedAccount {
	id: string;
	appName: string;
	status: string;
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

/* ─── Toolkit category taxonomy for smart curation ───────────────── */

const TOOLKIT_CATEGORIES: Record<string, string[]> = {
	search: ['google-search', 'bing-search', 'serpapi', 'tavily', 'perplexity', 'exa'],
	communication: ['gmail', 'slack', 'discord', 'teams', 'whatsapp', 'telegram', 'twilio', 'sendgrid'],
	productivity: ['google-docs', 'google-sheets', 'notion', 'airtable', 'asana', 'trello', 'monday', 'clickup', 'confluence'],
	calendar: ['google-calendar', 'outlook-calendar', 'calendly'],
	crm: ['hubspot', 'salesforce', 'pipedrive', 'zoho-crm', 'freshsales'],
	finance: ['stripe', 'quickbooks', 'xero', 'paypal', 'plaid'],
	storage: ['google-drive', 'dropbox', 'box', 'onedrive'],
	dev: ['github', 'gitlab', 'linear', 'jira', 'sentry'],
	social: ['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'reddit'],
	data: ['postgres', 'mysql', 'mongodb', 'snowflake', 'bigquery'],
};

function getCategory(toolkitSlug?: string): string {
	if (!toolkitSlug) return 'other';
	const slug = toolkitSlug.toLowerCase();
	for (const [cat, prefixes] of Object.entries(TOOLKIT_CATEGORIES)) {
		if (prefixes.some((p) => slug.includes(p))) return cat;
	}
	return 'other';
}

/* ─── Scoring weights ─────────────────────────────────────────────── */

const UTILITY_WEIGHTS: Record<string, number> = {
	search: 10,
	communication: 9,
	productivity: 8,
	calendar: 7,
	crm: 6,
	storage: 5,
	dev: 4,
	finance: 3,
	social: 2,
	data: 2,
	other: 1,
};

function scoreTool(tool: ComposioToolItem, connectedToolkits: Set<string>): number {
	let score = 0;

	// 1. Connected toolkit bonus (highest priority)
	const tk = tool.toolkit?.slug ?? '';
	if (connectedToolkits.has(tk)) score += 100;

	// 2. Category utility
	const cat = getCategory(tk);
	score += UTILITY_WEIGHTS[cat] ?? 1;

	// 3. Description quality (longer = more useful, but penalize extreme length)
	const desc = tool.description || tool.human_description || '';
	score += Math.min(desc.length / 50, 5);

	// 4. Deprecation penalty
	if (tool.is_deprecated) score -= 50;

	return score;
}

/* ─── Smart curation: pick diverse top-N ──────────────────────────── */

function pickDiverseTop(
	tools: ComposioToolItem[],
	connectedToolkits: Set<string>,
	targetCount: number,
	preferredCategories?: string[],
): ComposioToolItem[] {
	const scored = tools.map((t) => ({
		tool: t,
		score: scoreTool(t, connectedToolkits),
	}));

	// Sort by score descending
	scored.sort((a, b) => b.score - a.score);

	const picked: ComposioToolItem[] = [];
	const catsUsed = new Map<string, number>();
	const preferredSet = preferredCategories && preferredCategories.length > 0
		? new Set(preferredCategories.map((c) => c.toLowerCase()))
		: null;
	const maxPerCategory = Math.ceil(targetCount / (preferredSet ? preferredSet.size : 6));

	for (const { tool } of scored) {
		if (picked.length >= targetCount) break;
		const cat = getCategory(tool.toolkit?.slug);
		// If preferred categories are specified, skip tools outside them
		if (preferredSet && !preferredSet.has(cat)) continue;
		const catCount = catsUsed.get(cat) ?? 0;
		if (catCount >= maxPerCategory) continue;
		picked.push(tool);
		catsUsed.set(cat, catCount + 1);
	}

	return picked;
}

/* ─── Search relevance scoring ────────────────────────────────────── */

function searchRelevanceScore(tool: ComposioToolItem, queryTerms: string[]): number {
	let score = 0;
	const text = `${tool.slug} ${tool.name} ${tool.description} ${tool.human_description ?? ''} ${tool.toolkit?.name ?? ''}`.toLowerCase();
	for (const term of queryTerms) {
		if (text.includes(term)) score += 1;
	}
	return score;
}

/* ─── ComposioClient class ────────────────────────────────────────── */

export class ComposioClient {
	private readonly baseUrlNorm: string;
	private allToolsCache: ComposioToolItem[] | null = null;
	private connectedToolkits: Set<string> = new Set();
	private cacheTimestamp = 0;
	private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

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

	/* ─── Connected accounts discovery ──────────────────────────────── */

	async refreshConnectedAccounts(correlationId: string): Promise<void> {
		try {
			const entityId = process.env.COMPOSIO_ENTITY_ID ?? process.env.COMPOSIO_USER_ID;
			const params = new URLSearchParams();
			if (entityId) params.set('user_uuid', entityId);
			const url = `${this.baseUrlNorm}/connected_accounts${params.toString() ? '?' + params.toString() : ''}`;
			const res = await fetchWithRetry(url, { method: 'GET', headers: this.headers() }, correlationId);
			if (!res.ok) {
				logLine('warn', 'connected_accounts_fetch_failed', { correlationId, status: res.status });
				return;
			}
			const data = (await res.json()) as { items?: ConnectedAccount[] };
			const items = data.items ?? [];
			this.connectedToolkits = new Set(
				items
					.filter((a) => a.status === 'ACTIVE')
					.map((a) => a.appName.toLowerCase()),
			);
			logLine('info', 'connected_accounts_refreshed', {
				correlationId,
				count: this.connectedToolkits.size,
				toolkits: [...this.connectedToolkits].slice(0, 20),
			});
		} catch (e) {
			logLine('warn', 'connected_accounts_refresh_error', {
				correlationId,
				error: e instanceof Error ? e.message : String(e),
			});
		}
	}

	/* ─── Raw tool fetching (bypass cache) ──────────────────────────── */

	async fetchAllTools(correlationId: string): Promise<ComposioToolItem[]> {
		const excludeDeprecated = process.env.COMPOSIO_EXCLUDE_DEPRECATED !== 'false';
		const maxItems = Math.min(
			Math.max(parseInt(process.env.COMPOSIO_TOOLS_MAX ?? '2000', 10), 1),
			5000,
		);
		const pageLimit = Math.min(
			Math.max(parseInt(process.env.COMPOSIO_TOOLS_PAGE_LIMIT ?? '250', 10), 1),
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
				Math.max(parseInt(process.env.COMPOSIO_TOOLS_MAX_PAGES ?? '200', 10), 1),
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

	/* ─── Cached tool list (with smart defaults) ────────────────────── */

	async listTools(
		correlationId: string,
		options?: { preferredCategories?: string[]; maxTools?: number },
	): Promise<ComposioToolItem[]> {
		const smartDefault = process.env.COMPOSIO_SMART_DEFAULT !== 'false';
		const smartDefaultCount = Math.min(
			Math.max(parseInt(process.env.COMPOSIO_SMART_DEFAULT_COUNT ?? '50', 10), 1),
			200,
		);
		const allowedToolkits = process.env.COMPOSIO_ALLOWED_TOOLKITS?.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const allowedSlugs = process.env.COMPOSIO_ALLOWED_ACTIONS?.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		// If explicit allowlists are set, respect them fully (power-user mode)
		const hasExplicitFilters = (allowedToolkits && allowedToolkits.length > 0) || (allowedSlugs && allowedSlugs.length > 0);

		if (hasExplicitFilters || !smartDefault) {
			return this.fetchAllTools(correlationId);
		}

		// Smart default mode: cache + curate
		const now = Date.now();
		if (!this.allToolsCache || now - this.cacheTimestamp > this.cacheTtlMs) {
			logLine('info', 'tools_cache_refresh', { correlationId });
			this.allToolsCache = await this.fetchAllTools(correlationId);
			await this.refreshConnectedAccounts(correlationId);
			this.cacheTimestamp = now;
		}

		const totalAvailable = this.allToolsCache.length;
		const targetCount = Math.min(
			Math.max(options?.maxTools ?? smartDefaultCount, 1),
			200,
		);
		const curated = pickDiverseTop(
			this.allToolsCache,
			this.connectedToolkits,
			targetCount,
			options?.preferredCategories,
		);

		logLine('info', 'tools_smart_default_applied', {
			correlationId,
			totalAvailable,
			returned: curated.length,
			targetCount,
			preferredCategories: options?.preferredCategories?.join(',') ?? 'none',
			connectedToolkits: this.connectedToolkits.size,
			categories: Object.entries(
				curated.reduce((acc, t) => {
					const c = getCategory(t.toolkit?.slug);
					acc[c] = (acc[c] ?? 0) + 1;
					return acc;
				}, {} as Record<string, number>),
			)
				.map(([k, v]) => `${k}:${v}`)
				.join(','),
		});

		return curated;
	}

	/* ─── Search tools by query ─────────────────────────────────────── */

	async searchTools(correlationId: string, query: string, maxResults = 25): Promise<ComposioToolItem[]> {
		const now = Date.now();
		if (!this.allToolsCache || now - this.cacheTimestamp > this.cacheTtlMs) {
			this.allToolsCache = await this.fetchAllTools(correlationId);
			await this.refreshConnectedAccounts(correlationId);
			this.cacheTimestamp = now;
		}

		const terms = query
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 1);

		if (terms.length === 0) {
			return pickDiverseTop(this.allToolsCache, this.connectedToolkits, maxResults);
		}

		const scored = this.allToolsCache.map((tool) => ({
			tool,
			score: searchRelevanceScore(tool, terms),
		}));

		// Sort by relevance, then boost connected toolkits
		scored.sort((a, b) => {
			const aTk = a.tool.toolkit?.slug ?? '';
			const bTk = b.tool.toolkit?.slug ?? '';
			const aConnected = this.connectedToolkits.has(aTk) ? 1 : 0;
			const bConnected = this.connectedToolkits.has(bTk) ? 1 : 0;
			return bConnected - aConnected || b.score - a.score;
		});

		const results = scored.filter((s) => s.score > 0).map((s) => s.tool).slice(0, maxResults);

		logLine('info', 'tools_search', {
			correlationId,
			query,
			terms: terms.join(','),
			results: results.length,
		});

		return results;
	}

	/* ─── Tool execution ────────────────────────────────────────────── */

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
