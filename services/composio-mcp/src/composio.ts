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
	status?: string;
	toolkit?: { slug?: string; name?: string };
	user_id?: string;
	updated_at?: string;
	auth_config?: { id?: string; scopes?: string[] | string };
	scopes?: string[] | string;
	appName?: string;
}

interface ConnectedAccountsResponse {
	items?: ConnectedAccount[];
	next_cursor?: string | null;
}

export interface ListToolsOptions {
	preferredCategories?: string[];
	maxTools?: number;
	entityId?: string;
}

export interface ExecuteToolOptions {
	entityId?: string;
	connectedAccountId?: string;
}

export interface ConnectedAccountDebugItem {
	id: string;
	status: string;
	updatedAt: string | null;
	userId: string | null;
	scopeCount: number;
}

export interface ConnectedAccountsDebugResponse {
	entityId: string | null;
	count: number;
	byToolkit: Record<string, ConnectedAccountDebugItem[]>;
}

interface ConnectedAccountsDebugOptions {
	entityId?: string;
	forceRefresh?: boolean;
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

function normalizeToolkitSlug(account: ConnectedAccount): string {
	return (account.toolkit?.slug ?? account.appName ?? '').trim().toLowerCase();
}

function isActiveStatus(status?: string): boolean {
	return String(status ?? '').toUpperCase() === 'ACTIVE';
}

function parseTimestamp(value?: string): number {
	if (!value) return 0;
	const ts = Date.parse(value);
	return Number.isFinite(ts) ? ts : 0;
}

function getScopeCount(account: ConnectedAccount): number {
	const scopes = account.auth_config?.scopes ?? account.scopes;
	if (Array.isArray(scopes)) return scopes.length;
	if (typeof scopes === 'string') {
		return scopes
			.split(/[,\s]+/)
			.map((item) => item.trim())
			.filter(Boolean).length;
	}
	return 0;
}

function compareAccounts(a: ConnectedAccount, b: ConnectedAccount): number {
	const activeDelta = Number(isActiveStatus(b.status)) - Number(isActiveStatus(a.status));
	if (activeDelta !== 0) return activeDelta;
	const updatedDelta = parseTimestamp(b.updated_at) - parseTimestamp(a.updated_at);
	if (updatedDelta !== 0) return updatedDelta;
	const scopeDelta = getScopeCount(b) - getScopeCount(a);
	if (scopeDelta !== 0) return scopeDelta;
	return a.id.localeCompare(b.id);
}

class ConnectedAccountsRegistry {
	private byToolkit = new Map<string, ConnectedAccount[]>();
	private byId = new Map<string, ConnectedAccount>();

	rebuild(accounts: ConnectedAccount[]) {
		this.byToolkit.clear();
		this.byId.clear();
		for (const account of accounts) {
			if (!account.id) continue;
			this.byId.set(account.id, account);
			const toolkit = normalizeToolkitSlug(account);
			if (!toolkit) continue;
			const existing = this.byToolkit.get(toolkit) ?? [];
			existing.push(account);
			this.byToolkit.set(toolkit, existing);
		}
		for (const [toolkit, toolkitAccounts] of this.byToolkit.entries()) {
			toolkitAccounts.sort(compareAccounts);
			this.byToolkit.set(toolkit, toolkitAccounts);
		}
	}

	hasAccount(id: string): boolean {
		return this.byId.has(id);
	}

	toolkits(activeOnly = true): string[] {
		const result: string[] = [];
		for (const [toolkit, accounts] of this.byToolkit.entries()) {
			if (!activeOnly || accounts.some((account) => isActiveStatus(account.status))) {
				result.push(toolkit);
			}
		}
		result.sort();
		return result;
	}

	pickBest(toolkitSlug: string, entityId?: string): ConnectedAccount | null {
		const toolkit = toolkitSlug.trim().toLowerCase();
		const candidates = this.byToolkit.get(toolkit) ?? [];
		if (candidates.length === 0) return null;
		if (!entityId) return candidates[0] ?? null;
		const byEntity = candidates.filter((account) => account.user_id === entityId);
		return (byEntity.length > 0 ? byEntity[0] : candidates[0]) ?? null;
	}

	count(entityId?: string): number {
		if (!entityId) return this.byId.size;
		let count = 0;
		for (const account of this.byId.values()) {
			if (account.user_id === entityId) count++;
		}
		return count;
	}

	summary(entityId?: string): Record<string, ConnectedAccountDebugItem[]> {
		const byToolkit: Record<string, ConnectedAccountDebugItem[]> = {};
		for (const [toolkit, accounts] of this.byToolkit.entries()) {
			const filtered = entityId ? accounts.filter((account) => account.user_id === entityId) : accounts;
			if (filtered.length === 0) continue;
			byToolkit[toolkit] = filtered.map((account) => ({
				id: account.id,
				status: String(account.status ?? 'UNKNOWN').toUpperCase(),
				updatedAt: account.updated_at ?? null,
				userId: account.user_id ?? null,
				scopeCount: getScopeCount(account),
			}));
		}
		return byToolkit;
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
	const preferredSet =
		preferredCategories && preferredCategories.length > 0
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
	const text =
		`${tool.slug} ${tool.name} ${tool.description} ${tool.human_description ?? ''} ${tool.toolkit?.name ?? ''}`.toLowerCase();
	for (const term of queryTerms) {
		if (text.includes(term)) score += 1;
	}
	return score;
}

/* ─── ComposioClient class ────────────────────────────────────────── */

export class ComposioClient {
	private readonly baseUrlNorm: string;
	private allToolsCache: ComposioToolItem[] | null = null;
	private allToolsBySlug = new Map<string, ComposioToolItem>();
	private connectedToolkits: Set<string> = new Set();
	private toolsCacheTimestamp = 0;
	private accountsCacheTimestamp = 0;
	private accountsCacheEntityId: string | null = null;
	private readonly connectedAccounts = new ConnectedAccountsRegistry();
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

	private resolveEntityId(override?: string): string | undefined {
		return override ?? process.env.COMPOSIO_ENTITY_ID ?? process.env.COMPOSIO_USER_ID;
	}

	private setToolsCache(tools: ComposioToolItem[]) {
		this.allToolsCache = tools;
		this.allToolsBySlug = new Map(tools.map((tool) => [tool.slug, tool]));
		this.toolsCacheTimestamp = Date.now();
	}

	private async refreshConnectedAccounts(correlationId: string, entityIdOverride?: string): Promise<void> {
		try {
			const entityId = this.resolveEntityId(entityIdOverride);
			const pageLimit = 200;
			let cursor: string | undefined;
			const merged: ConnectedAccount[] = [];
			let endpoint = `${this.baseUrlNorm}/connected_accounts`;

			do {
				const params = new URLSearchParams();
				params.set('limit', String(pageLimit));
				if (entityId) params.append('user_ids[]', entityId);
				if (cursor) params.set('cursor', cursor);
				endpoint = `${this.baseUrlNorm}/connected_accounts?${params.toString()}`;
				const res = await fetchWithRetry(endpoint, { method: 'GET', headers: this.headers() }, correlationId);
				if (!res.ok) {
					const body = (await res.text()).slice(0, 500);
					logLine('warn', 'connected_accounts_fetch_failed', {
						correlationId,
						status: res.status,
						endpoint: redactUrl(endpoint),
						bodySnippet: body,
					});
					return;
				}
				const data = (await res.json()) as ConnectedAccountsResponse;
				merged.push(...(data.items ?? []));
				cursor = data.next_cursor ?? undefined;
			} while (cursor);

			this.connectedAccounts.rebuild(merged);
			this.connectedToolkits = new Set(this.connectedAccounts.toolkits(true));
			this.accountsCacheTimestamp = Date.now();
			this.accountsCacheEntityId = entityId ?? null;

			const byToolkitSummary = Object.entries(this.connectedAccounts.summary(entityId))
				.map(([toolkit, accounts]) => `${toolkit}:${accounts.length}`)
				.slice(0, 20)
				.join(',');

			logLine('info', 'connected_accounts_refreshed', {
				correlationId,
				entityId: entityId ?? null,
				count: this.connectedAccounts.count(entityId),
				toolkits: [...this.connectedToolkits].slice(0, 20),
				byToolkit: byToolkitSummary,
			});
		} catch (e) {
			logLine('warn', 'connected_accounts_refresh_error', {
				correlationId,
				error: e instanceof Error ? e.message : String(e),
				endpoint: `${this.baseUrlNorm}/connected_accounts`,
			});
		}
	}

	async ensureConnectedAccounts(
		correlationId: string,
		options?: { entityId?: string; forceRefresh?: boolean },
	): Promise<void> {
		const entityId = this.resolveEntityId(options?.entityId) ?? null;
		const now = Date.now();
		const stale = now - this.accountsCacheTimestamp > this.cacheTtlMs;
		const entityChanged = entityId !== this.accountsCacheEntityId;
		if (options?.forceRefresh || stale || this.accountsCacheTimestamp === 0 || entityChanged) {
			await this.refreshConnectedAccounts(correlationId, entityId ?? undefined);
		}
	}

	private async getToolkitForToolSlug(correlationId: string, slug: string): Promise<string | undefined> {
		const now = Date.now();
		if (!this.allToolsCache || now - this.toolsCacheTimestamp > this.cacheTtlMs) {
			const tools = await this.fetchAllTools(correlationId);
			this.setToolsCache(tools);
		}
		const tool = this.allToolsBySlug.get(slug);
		return tool?.toolkit?.slug?.toLowerCase();
	}

	async getConnectedAccountsDebug(
		correlationId: string,
		options?: ConnectedAccountsDebugOptions,
	): Promise<ConnectedAccountsDebugResponse> {
		await this.ensureConnectedAccounts(correlationId, {
			entityId: options?.entityId,
			forceRefresh: options?.forceRefresh,
		});
		const entityId = this.resolveEntityId(options?.entityId) ?? null;
		return {
			entityId,
			count: this.connectedAccounts.count(entityId ?? undefined),
			byToolkit: this.connectedAccounts.summary(entityId ?? undefined),
		};
	}

	/* ─── Raw tool fetching (bypass cache) ──────────────────────────── */

	async fetchAllTools(correlationId: string): Promise<ComposioToolItem[]> {
		const excludeDeprecated = process.env.COMPOSIO_EXCLUDE_DEPRECATED !== 'false';
		const maxItems = Math.min(Math.max(parseInt(process.env.COMPOSIO_TOOLS_MAX ?? '2000', 10), 1), 5000);
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
				const res = await fetchWithRetry(url, { method: 'GET', headers: this.headers() }, correlationId);
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

		const tools = [...merged.values()].slice(0, maxItems);
		this.setToolsCache(tools);
		return tools;
	}

	/* ─── Cached tool list (with smart defaults) ────────────────────── */

	async listTools(correlationId: string, options?: ListToolsOptions): Promise<ComposioToolItem[]> {
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

		const hasExplicitFilters =
			(allowedToolkits && allowedToolkits.length > 0) || (allowedSlugs && allowedSlugs.length > 0);

		if (hasExplicitFilters || !smartDefault) {
			return this.fetchAllTools(correlationId);
		}

		const now = Date.now();
		if (!this.allToolsCache || now - this.toolsCacheTimestamp > this.cacheTtlMs) {
			logLine('info', 'tools_cache_refresh', { correlationId });
			await this.fetchAllTools(correlationId);
		}
		await this.ensureConnectedAccounts(correlationId, { entityId: options?.entityId });
		const cachedTools = this.allToolsCache ?? [];

		const totalAvailable = cachedTools.length;
		const targetCount = Math.min(Math.max(options?.maxTools ?? smartDefaultCount, 1), 200);
		const curated = pickDiverseTop(
			cachedTools,
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
		if (!this.allToolsCache || now - this.toolsCacheTimestamp > this.cacheTtlMs) {
			await this.fetchAllTools(correlationId);
		}
		await this.ensureConnectedAccounts(correlationId);
		const cachedTools = this.allToolsCache ?? [];

		const terms = query
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 1);

		if (terms.length === 0) {
			return pickDiverseTop(cachedTools, this.connectedToolkits, maxResults);
		}

		const scored = cachedTools.map((tool) => ({
			tool,
			score: searchRelevanceScore(tool, terms),
		}));

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
		options?: ExecuteToolOptions,
	): Promise<unknown> {
		const entityId = this.resolveEntityId(options?.entityId);
		const requestedConnectedAccountId = options?.connectedAccountId?.trim();
		let connectedAccountId: string | undefined;
		let accountSelectionSource: 'header' | 'registry' | 'env' | 'none' = 'none';
		const toolkitSlug = await this.getToolkitForToolSlug(correlationId, slug);

		await this.ensureConnectedAccounts(correlationId, { entityId: options?.entityId });

		if (requestedConnectedAccountId) {
			connectedAccountId = requestedConnectedAccountId;
			accountSelectionSource = 'header';
			if (!this.connectedAccounts.hasAccount(requestedConnectedAccountId)) {
				logLine('warn', 'mcp_account_override_unknown', {
					correlationId,
					slug,
					connectedAccountId: requestedConnectedAccountId,
				});
			}
		} else if (toolkitSlug) {
			const best = this.connectedAccounts.pickBest(toolkitSlug, entityId);
			if (best?.id) {
				connectedAccountId = best.id;
				accountSelectionSource = 'registry';
			}
		}
		if (!connectedAccountId) {
			const envConnected = process.env.COMPOSIO_CONNECTED_ACCOUNT_ID;
			if (envConnected) {
				connectedAccountId = envConnected;
				accountSelectionSource = 'env';
			}
		}

		logLine('info', 'mcp_account_selected', {
			correlationId,
			slug,
			toolkit: toolkitSlug ?? null,
			entityId: entityId ?? null,
			accountId: connectedAccountId ?? null,
			source: accountSelectionSource,
		});

		const url = `${this.baseUrlNorm}/tools/execute/${encodeURIComponent(slug)}`;
		const body: Record<string, unknown> = {
			arguments: args,
		};
		if (entityId) body.user_id = entityId;
		if (connectedAccountId) body.connected_account_id = connectedAccountId;

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
