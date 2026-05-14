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

export interface ComposioToolSchemaDescriptor {
	slug: string;
	name: string;
	description: string;
	toolkit: string | null;
	inputSchema: Record<string, unknown>;
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
	userPrompt?: string;
}

export interface ExecuteToolOptions {
	entityId?: string;
	connectedAccountId?: string;
	userPrompt?: string;
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

interface AuthConfig {
	id: string;
	status?: string;
	auth_scheme?: string;
	auth_mode?: string;
	type?: string;
}

interface AuthConfigsResponse {
	items?: AuthConfig[];
}

interface ComposioPlannerSearchResult {
	tools: ComposioToolItem[];
	source: 'local' | 'composio';
}

export interface InitiatedConnection {
	connectedAccountId: string;
	status: string;
	redirectUrl?: string;
	scheme: string;
	toolkit: string;
	entityId: string;
}

export interface ConnectedAccountStatus {
	connectedAccountId: string;
	status: string;
	toolkit: string | null;
	entityId: string | null;
}

export class StructuredToolError extends Error {
	constructor(
		message: string,
		public readonly payload: Record<string, unknown>,
	) {
		super(message);
	}
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

export async function fetchWithRetry(
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

export function redactUrl(url: string): string {
	try {
		const u = new URL(url);
		return `${u.origin}${u.pathname}`;
	} catch {
		return 'invalid-url';
	}
}

function normalizeToolkitSlug(value: ConnectedAccount | string | undefined | null): string {
	if (!value) return '';
	if (typeof value === 'string') return value.trim().toLowerCase();
	return (value.toolkit?.slug ?? value.appName ?? '').trim().toLowerCase();
}

function blockedActionSlugs(): Set<string> {
	return new Set(
		(process.env.COMPOSIO_BLOCKED_ACTIONS ?? '')
			.split(',')
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean),
	);
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
	const tk = normalizeToolkitSlug(tool.toolkit?.slug);
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

function normalizeAuthScheme(config: AuthConfig): string {
	return String(config.auth_scheme ?? config.auth_mode ?? config.type ?? 'UNKNOWN')
		.trim()
		.toUpperCase()
		.replace(/[\s-]+/g, '_');
}

function isOAuthScheme(scheme: string): boolean {
	return scheme.includes('OAUTH');
}

function isApiKeyScheme(scheme: string): boolean {
	return scheme.includes('API_KEY') || scheme.includes('APIKEY');
}

function isMissingConnectionErrorMessage(message: string): boolean {
	return /no connected account/i.test(message) || /connection .* not found/i.test(message);
}

function tokenizeQuery(query: string): string[] {
	return query
		.toLowerCase()
		.split(/\s+/)
		.map((part) => part.trim())
		.filter((part) => part.length > 1);
}

function summarizePrompt(prompt?: string): string | null {
	if (!prompt) return null;
	const compact = prompt.replace(/\s+/g, ' ').trim();
	if (!compact) return null;
	return compact.slice(0, 140);
}

function uniqueStrings(values: string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function extractEmails(text?: string): string[] {
	if (!text) return [];
	return uniqueStrings(
		Array.from(text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)).map((match) =>
			match[0].toLowerCase(),
		),
	);
}

function normalizeEmailList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return uniqueStrings(value.flatMap((item) => extractEmails(String(item ?? ''))));
	}
	if (typeof value === 'string') return extractEmails(value);
	return [];
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function markdownishToHtml(value: string): string {
	const paragraphs = value
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter(Boolean);
	return paragraphs
		.map((block) => {
			const escaped = escapeHtml(block)
				.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
				.replace(/\n/g, '<br />');
			return `<p style="margin:0 0 12px 0;line-height:1.6;">${escaped}</p>`;
		})
		.join('\n');
}

function extractEmailTemplateHtml(prompt?: string): string | null {
	if (!prompt) return null;
	const match = prompt.match(/\[EMAIL_TEMPLATE_HTML\]\s*([\s\S]*?)(?:\n\s*\[EMAIL_TEMPLATE_RULE\]|\s*$)/);
	const template = match?.[1]?.trim();
	return template && template.includes('{{body_html}}') ? template : null;
}

async function fetchDefaultEmailTemplateHtml(correlationId: string): Promise<string | null> {
	const tenant = process.env.TENANT_SLUG || process.env.AGENTYX_CLIENT_SLUG || 'levinnovation';
	const base = process.env.PORTAL_TEMPLATE_API_BASE || `https://${tenant}.portal.agentyx.one`;
	const url = `${base.replace(/\/$/, '')}/api/public/templates/email?tenant=${encodeURIComponent(tenant)}`;
	try {
		const res = await fetch(url, { method: 'GET' });
		if (!res.ok) {
			logLine('warn', 'gmail_template_fetch_failed', { correlationId, status: res.status });
			return null;
		}
		const json = (await res.json()) as { html?: unknown };
		const html = typeof json.html === 'string' ? json.html.trim() : '';
		return html && html.includes('{{body_html}}') ? html : null;
	} catch (e) {
		logLine('warn', 'gmail_template_fetch_error', {
			correlationId,
			error: e instanceof Error ? e.message : String(e),
		});
		return null;
	}
}

function contentToHtml(value: string, alreadyHtml: boolean): string {
	return alreadyHtml || /<\/?[a-z][\s\S]*>/i.test(value) ? value : markdownishToHtml(value);
}

async function hardenGmailSendArgs(
	slug: string,
	args: Record<string, unknown>,
	userPrompt: string | undefined,
	correlationId: string,
): Promise<Record<string, unknown>> {
	const normalizedSlug = slug.trim().toUpperCase();
	if (!['GMAIL_SEND_EMAIL', 'GMAIL_SENDS_AN_EMAIL'].includes(normalizedSlug)) return args;

	const next = { ...args };
	const promptEmails = extractEmails(userPrompt);
	const existingTo = uniqueStrings([
		...normalizeEmailList(next.to),
		...normalizeEmailList(next.recipient_email),
	]);

	if (existingTo.length === 0 && promptEmails.length > 0) {
		next.to = [promptEmails[0]];
		logLine('info', 'gmail_send_recipient_inferred', {
			correlationId,
			slug: normalizedSlug,
			recipient: promptEmails[0],
		});
	}

	let toEmails = normalizeEmailList(next.to).length > 0 ? normalizeEmailList(next.to) : normalizeEmailList(next.recipient_email);
	if (toEmails.length === 0) {
		const fallbackTo = normalizeEmailList(
			process.env.GMAIL_DEFAULT_TO || process.env.DEFAULT_EMAIL_TO || process.env.TENANT_DEFAULT_EMAIL_TO,
		);
		if (fallbackTo.length === 0) {
			throw new Error('Gmail send requires an explicit to/recipient_email address; refusing to send to cc/bcc only.');
		}
		next.recipient_email = fallbackTo[0];
		toEmails = [fallbackTo[0]];
		logLine('warn', 'gmail_send_recipient_fallback_applied', {
			correlationId,
			slug: normalizedSlug,
			recipient: fallbackTo[0],
		});
	}
	if (toEmails.length > 0) {
		next.recipient_email = toEmails[0];
		delete next.to;
	}
	const ccEmails = normalizeEmailList(next.cc).filter((email) => !toEmails.includes(email));
	if (ccEmails.length > 0) next.cc = ccEmails;

	const templateHtml = extractEmailTemplateHtml(userPrompt) || (await fetchDefaultEmailTemplateHtml(correlationId));
	const body = typeof next.body === 'string' ? next.body : '';
	if (templateHtml && body && !body.includes('<table role="presentation" width="640"')) {
		next.body = templateHtml.replace(/\{\{body_html\}\}/g, contentToHtml(body, next.is_html === true));
		next.is_html = true;
		logLine('info', 'gmail_send_template_applied', {
			correlationId,
			slug: normalizedSlug,
		});
	}

	return next;
}

/* ─── ComposioClient class ────────────────────────────────────────── */

export class ComposioClient {
	private readonly baseUrlNorm: string;
	private allToolsCache: ComposioToolItem[] | null = null;
	private allToolsBySlug = new Map<string, ComposioToolItem>();
	private readonly authConfigsByToolkit = new Map<string, { authConfigId: string; authScheme: string }>();
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

	private getAutoConnectAllowlist(): Set<string> {
		return new Set(
			(process.env.COMPOSIO_AUTO_CONNECT_TOOLKITS ?? '')
				.split(',')
				.map((item) => normalizeToolkitSlug(item))
				.filter(Boolean),
		);
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

	private async listAuthConfigs(
		correlationId: string,
		toolkitSlug: string,
	): Promise<{ authConfigId: string; authScheme: string }> {
		const toolkit = normalizeToolkitSlug(toolkitSlug);
		if (!toolkit) {
			throw new Error('toolkit_slug_required');
		}

		const cached = this.authConfigsByToolkit.get(toolkit);
		if (cached) return cached;

		const params = new URLSearchParams();
		params.set('toolkit_slug', toolkit);
		const url = `${this.baseUrlNorm}/auth_configs?${params.toString()}`;
		const res = await fetchWithRetry(url, { method: 'GET', headers: this.headers() }, correlationId);
		if (!res.ok) {
			const body = (await res.text()).slice(0, 500);
			throw new Error(`Composio auth_configs failed (${res.status}): ${body}`);
		}
		const data = (await res.json()) as AuthConfigsResponse;
		const items = data.items ?? [];
		const picked =
			items.find((item) => String(item.status ?? '').toUpperCase() === 'ACTIVE') ??
			items.find((item) => Boolean(item.id));
		if (!picked?.id) {
			throw new Error(`No auth_config found for toolkit "${toolkit}"`);
		}

		const parsed = {
			authConfigId: picked.id,
			authScheme: normalizeAuthScheme(picked),
		};
		this.authConfigsByToolkit.set(toolkit, parsed);
		return parsed;
	}

	async initiateConnectedAccount(
		input: { toolkit: string; entityId?: string; credentials?: Record<string, unknown> },
		correlationId: string,
		options?: { implicit?: boolean },
	): Promise<InitiatedConnection> {
		const toolkit = normalizeToolkitSlug(input.toolkit);
		if (!toolkit) throw new Error('toolkit_required');
		const allowlist = this.getAutoConnectAllowlist();
		if (!allowlist.has(toolkit)) {
			throw new Error(`auto_connect_not_allowed:${toolkit}`);
		}

		const entityId = this.resolveEntityId(input.entityId);
		if (!entityId) throw new Error('entity_id_required');

		const { authConfigId, authScheme } = await this.listAuthConfigs(correlationId, toolkit);
		if (options?.implicit && !isOAuthScheme(authScheme)) {
			throw new Error(`implicit_auto_connect_requires_oauth:${toolkit}:${authScheme}`);
		}
		if (isApiKeyScheme(authScheme) && !input.credentials) {
			throw new Error(`credentials_required_for_scheme:${authScheme}`);
		}

		const payload: Record<string, unknown> = {
			user_id: entityId,
			auth_config: { id: authConfigId },
			connection: {},
		};
		if (input.credentials && isApiKeyScheme(authScheme)) {
			payload.connection = input.credentials;
		}

		const url = `${this.baseUrlNorm}/connected_accounts`;
		const res = await fetchWithRetry(
			url,
			{
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(payload),
			},
			correlationId,
		);
		const text = await res.text();
		let json: Record<string, unknown> = {};
		try {
			json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
		} catch {
			json = { raw: text };
		}
		if (!res.ok) {
			throw new Error(`Composio connected_accounts create failed (${res.status}): ${text.slice(0, 500)}`);
		}

		const connectedAccountId =
			(typeof json.id === 'string' && json.id) ||
			(typeof json.connected_account_id === 'string' && json.connected_account_id) ||
			'';
		if (!connectedAccountId) throw new Error('connected_account_id_missing');
		const status = String(json.status ?? 'UNKNOWN').toUpperCase();
		const redirectUrl =
			typeof json.redirect_url === 'string'
				? json.redirect_url
				: typeof json.redirectUri === 'string'
					? json.redirectUri
					: undefined;

		logLine('info', 'mcp_connection_initiated', {
			correlationId,
			toolkit,
			entityId,
			scheme: authScheme,
			status,
			hasRedirectUrl: Boolean(redirectUrl),
			credentialKeys: input.credentials ? Object.keys(input.credentials) : [],
		});

		await this.ensureConnectedAccounts(correlationId, { entityId, forceRefresh: true });

		return {
			connectedAccountId,
			status,
			redirectUrl,
			scheme: authScheme,
			toolkit,
			entityId,
		};
	}

	async getConnectedAccountStatus(
		correlationId: string,
		connectedAccountId: string,
	): Promise<ConnectedAccountStatus> {
		const url = `${this.baseUrlNorm}/connected_accounts/${encodeURIComponent(connectedAccountId)}`;
		const res = await fetchWithRetry(url, { method: 'GET', headers: this.headers() }, correlationId);
		const text = await res.text();
		let json: Record<string, unknown> = {};
		try {
			json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
		} catch {
			json = { raw: text };
		}
		if (!res.ok) {
			throw new Error(`Composio connected_account status failed (${res.status}): ${text.slice(0, 500)}`);
		}
		const toolkit =
			(typeof json.toolkit === 'object' &&
				json.toolkit &&
				'slug' in json.toolkit &&
				typeof (json.toolkit as { slug?: unknown }).slug === 'string' &&
				(json.toolkit as { slug: string }).slug) ||
			(typeof json.appName === 'string' ? json.appName : null);
		const entityId = typeof json.user_id === 'string' ? json.user_id : null;
		return {
			connectedAccountId,
			status: String(json.status ?? 'UNKNOWN').toUpperCase(),
			toolkit: toolkit ? normalizeToolkitSlug(toolkit) : null,
			entityId,
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
		const blockedSlugs = blockedActionSlugs();

		const merged = new Map<string, ComposioToolItem>();

		const ingestItems = (items: ComposioToolItem[]) => {
			for (const it of items) {
				if (!it?.slug) continue;
				if (blockedSlugs.has(it.slug.toUpperCase())) continue;
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
		const promptTopN = Math.min(
			Math.max(parseInt(process.env.COMPOSIO_PROMPT_TOPN ?? '25', 10), 1),
			50,
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
		const prompt = options?.userPrompt?.trim();
		const promptTerms = prompt
			? prompt
					.toLowerCase()
					.split(/\s+/)
					.filter((term) => term.length > 1)
			: [];
		const targetCount = Math.min(
			Math.max(options?.maxTools ?? (promptTerms.length > 0 ? promptTopN : smartDefaultCount), 1),
			200,
		);
		if (promptTerms.length > 0) {
			const scored = cachedTools
				.map((tool) => {
					const toolkitSlug = normalizeToolkitSlug(tool.toolkit?.slug);
					const relevance = searchRelevanceScore(tool, promptTerms);
					const connectedBoost = this.connectedToolkits.has(toolkitSlug) ? 2 : 0;
					return { tool, relevance, connectedBoost };
				})
				.filter((item) => item.relevance > 0)
				.sort((a, b) => b.connectedBoost - a.connectedBoost || b.relevance - a.relevance);

			if (scored.length > 0) {
				const inferred = scored.slice(0, targetCount).map((item) => item.tool);
				const topToolkit = normalizeToolkitSlug(inferred[0]?.toolkit?.slug) || 'unknown';
				logLine('info', 'tools_prompt_inferred', {
					correlationId,
					promptTerms: promptTerms.slice(0, 12).join(','),
					totalAvailable,
					returned: inferred.length,
					topToolkit,
				});
				return inferred;
			}
		}
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

		const terms = tokenizeQuery(query);

		if (terms.length === 0) {
			return pickDiverseTop(cachedTools, this.connectedToolkits, maxResults);
		}

		const scored = cachedTools.map((tool) => ({
			tool,
			score: searchRelevanceScore(tool, terms),
		}));

		scored.sort((a, b) => {
			const aTk = normalizeToolkitSlug(a.tool.toolkit?.slug);
			const bTk = normalizeToolkitSlug(b.tool.toolkit?.slug);
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

	private shouldUsePlannerFallback(query: string, localResults: ComposioToolItem[]): boolean {
		if (localResults.length === 0) return true;
		const terms = tokenizeQuery(query);
		const specificTerms = terms.filter(
			(term) => !new Set(['send', 'email', 'tool', 'tools', 'use', 'using', 'with', 'via']).has(term),
		);
		if (specificTerms.length === 0) return false;
		const corpus = localResults
			.map((tool) =>
				`${tool.slug} ${tool.name} ${tool.description} ${tool.human_description ?? ''} ${tool.toolkit?.slug ?? ''}`.toLowerCase(),
			)
			.join(' ');
		return specificTerms.some((term) => !corpus.includes(term));
	}

	private async searchToolsViaComposioPlanner(
		correlationId: string,
		query: string,
		maxResults: number,
	): Promise<ComposioToolItem[]> {
		if (!this.allToolsCache || Date.now() - this.toolsCacheTimestamp > this.cacheTtlMs) {
			await this.fetchAllTools(correlationId);
		}
		const url = `${this.baseUrlNorm}/tools/execute/${encodeURIComponent('COMPOSIO_SEARCH_TOOLS')}`;
		const res = await fetchWithRetry(
			url,
			{
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify({
					arguments: {
						query,
						max_results: maxResults,
					},
				}),
			},
			correlationId,
		);
		const text = await res.text();
		if (!res.ok) {
			throw new Error(`Composio planner search failed (${res.status}): ${text.slice(0, 500)}`);
		}
		let json: Record<string, unknown> = {};
		try {
			json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
		} catch {
			return [];
		}

		const data =
			typeof json.data === 'object' && json.data !== null
				? (json.data as Record<string, unknown>)
				: typeof json === 'object' && json !== null
					? json
					: {};

		const slugs = new Set<string>();
		const addSlug = (candidate: unknown) => {
			if (typeof candidate !== 'string') return;
			const slug = candidate.trim().toUpperCase();
			if (!slug) return;
			slugs.add(slug);
		};

		const toolSchemas =
			typeof data.tool_schemas === 'object' && data.tool_schemas !== null
				? (data.tool_schemas as Record<string, unknown>)
				: {};
		for (const key of Object.keys(toolSchemas)) addSlug(key);

		const plans = Array.isArray(data.results) ? data.results : [];
		for (const plan of plans) {
			if (typeof plan !== 'object' || plan === null) continue;
			const primary = (plan as { primary_tool_slugs?: unknown }).primary_tool_slugs;
			if (Array.isArray(primary)) primary.forEach((slug) => addSlug(slug));
			const related = (plan as { related_tool_slugs?: unknown }).related_tool_slugs;
			if (Array.isArray(related)) related.forEach((slug) => addSlug(slug));
		}

		const resolved = [...slugs]
			.map((slug) => {
				const cached = this.allToolsBySlug.get(slug);
				if (cached) return cached;
				const schema = toolSchemas[slug];
				const schemaObj = typeof schema === 'object' && schema !== null ? (schema as Record<string, unknown>) : {};
				const toolkitRaw = schemaObj.toolkit;
				const toolkitSlug =
					typeof toolkitRaw === 'string'
						? normalizeToolkitSlug(toolkitRaw)
						: typeof toolkitRaw === 'object' &&
							  toolkitRaw !== null &&
							  'slug' in toolkitRaw &&
							  typeof (toolkitRaw as { slug?: unknown }).slug === 'string'
							? normalizeToolkitSlug((toolkitRaw as { slug: string }).slug)
							: '';
				const description =
					(typeof schemaObj.description === 'string' && schemaObj.description) ||
					`Composio planner-discovered tool ${slug}`;
				const inputParameters =
					(typeof schemaObj.input_schema === 'object' && schemaObj.input_schema !== null
						? schemaObj.input_schema
						: { type: 'object', properties: {} }) as unknown;
				return {
					slug,
					name: (typeof schemaObj.name === 'string' && schemaObj.name) || slug,
					description,
					toolkit: toolkitSlug ? { slug: toolkitSlug, name: toolkitSlug } : undefined,
					input_parameters: inputParameters,
				} as ComposioToolItem;
			})
			.slice(0, maxResults);
		return resolved;
	}

	async searchToolsWithComposioFallback(
		correlationId: string,
		query: string,
		maxResults = 25,
	): Promise<ComposioPlannerSearchResult> {
		const local = await this.searchTools(correlationId, query, maxResults);
		const fallbackEnabled = process.env.COMPOSIO_SEARCH_PLANNER_FALLBACK !== 'false';
		if (!fallbackEnabled || !this.shouldUsePlannerFallback(query, local)) {
			return { tools: local, source: 'local' };
		}

		try {
			const planner = await this.searchToolsViaComposioPlanner(correlationId, query, maxResults);
			if (planner.length > 0) {
				logLine('info', 'tools_search_fallback_composio', {
					correlationId,
					query,
					localResults: local.length,
					fallbackResults: planner.length,
				});
				return { tools: planner, source: 'composio' };
			}
		} catch (error) {
			logLine('warn', 'tools_search_fallback_failed', {
				correlationId,
				query,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return { tools: local, source: 'local' };
	}

	async getToolSchema(correlationId: string, slug: string): Promise<ComposioToolSchemaDescriptor> {
		const target = slug.trim().toUpperCase();
		if (!target) throw new Error('slug_required');
		if (!this.allToolsCache || Date.now() - this.toolsCacheTimestamp > this.cacheTtlMs) {
			await this.fetchAllTools(correlationId);
		}
		const tool = this.allToolsBySlug.get(target);
		if (!tool) throw new Error(`tool_not_found:${target}`);
		return {
			slug: tool.slug,
			name: tool.name,
			description: tool.description || tool.human_description || '',
			toolkit: tool.toolkit?.slug ?? null,
			inputSchema:
				(typeof tool.input_parameters === 'object' &&
				tool.input_parameters !== null &&
				'type' in (tool.input_parameters as Record<string, unknown>))
					? (tool.input_parameters as Record<string, unknown>)
					: { type: 'object', properties: {} },
		};
	}

	/* ─── Tool execution ────────────────────────────────────────────── */

	async executeTool(
		slug: string,
		args: Record<string, unknown>,
		correlationId: string,
		options?: ExecuteToolOptions,
	): Promise<unknown> {
		if (blockedActionSlugs().has(slug.trim().toUpperCase())) {
			throw new Error(`Tool blocked by policy: ${slug}`);
		}
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
			userPrompt: summarizePrompt(options?.userPrompt),
		});

		const hardenedArgs = await hardenGmailSendArgs(slug, args, options?.userPrompt, correlationId);
		const url = `${this.baseUrlNorm}/tools/execute/${encodeURIComponent(slug)}`;
		const body: Record<string, unknown> = {
			arguments: hardenedArgs,
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
			const fullMessage = `Composio execute failed (${res.status}): ${msg}`;
			if (toolkitSlug && isMissingConnectionErrorMessage(fullMessage)) {
				const allowlist = this.getAutoConnectAllowlist();
				if (allowlist.has(toolkitSlug)) {
					const initiated = await this.initiateConnectedAccount(
						{ toolkit: toolkitSlug, entityId },
						correlationId,
						{ implicit: true },
					);
					throw new StructuredToolError('missing_connection', {
						kind: 'missing_connection',
						toolkit: toolkitSlug,
						redirect_url: initiated.redirectUrl ?? null,
						connected_account_id: initiated.connectedAccountId,
						message: `User must visit redirect_url to connect ${toolkitSlug}, then retry.`,
					});
				}
			}
			throw new Error(fullMessage);
		}

		if (
			typeof json === 'object' &&
			json !== null &&
			'successful' in json &&
			(json as { successful?: unknown }).successful === false
		) {
			const obj = json as Record<string, unknown>;
			const message =
				(typeof obj.error === 'string' && obj.error.trim()) ||
				(typeof obj.message === 'string' && obj.message.trim()) ||
				'Tool execution reported unsuccessful result';
			if (toolkitSlug && isMissingConnectionErrorMessage(message)) {
				const allowlist = this.getAutoConnectAllowlist();
				if (allowlist.has(toolkitSlug)) {
					const initiated = await this.initiateConnectedAccount(
						{ toolkit: toolkitSlug, entityId },
						correlationId,
						{ implicit: true },
					);
					throw new StructuredToolError('missing_connection', {
						kind: 'missing_connection',
						toolkit: toolkitSlug,
						redirect_url: initiated.redirectUrl ?? null,
						connected_account_id: initiated.connectedAccountId,
						message: `User must visit redirect_url to connect ${toolkitSlug}, then retry.`,
					});
				}
			}
			throw new Error(message);
		}

		return json;
	}
}
