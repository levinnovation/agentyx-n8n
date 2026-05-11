import crypto from 'node:crypto';

import { fetchWithRetry, redactUrl } from './composio.js';
import { logLine } from './logger.js';

export interface TriggerTypeItem {
	slug: string;
	name?: string;
	description?: string;
	toolkit?: { slug?: string; name?: string };
	config?: Record<string, unknown>;
}

export interface ActiveTriggerItem {
	id: string;
	trigger_name?: string;
	trigger_slug?: string;
	connected_account_id?: string;
	connected_account?: { id?: string };
	user_id?: string;
	disabled_at?: string | null;
	[key: string]: unknown;
}

export interface WebhookSubscriptionItem {
	id: string;
	webhook_url: string;
	enabled_events: string[];
	version?: 'V1' | 'V2' | 'V3';
	secret?: string;
	created_at?: string;
	updated_at?: string;
}

interface CursorPage<T> {
	items?: T[];
	next_cursor?: string | null;
}

export interface ListTriggerTypesOptions {
	toolkit?: string;
}

export interface CreateActiveTriggerInput {
	triggerSlug: string;
	userId: string;
	connectedAccountId?: string;
	triggerConfig?: Record<string, unknown>;
}

export interface ListActiveTriggersOptions {
	connectedAccountIds?: string[];
	triggerNames?: string[];
	triggerIds?: string[];
	authConfigIds?: string[];
	showDisabled?: boolean;
	userId?: string;
}

export interface UpsertWebhookSubscriptionInput {
	webhookUrl: string;
	enabledEvents: string[];
	version?: 'V1' | 'V2' | 'V3';
}

export interface VerifyWebhookInput {
	id: string;
	timestamp: string;
	payload: string;
	signature: string;
	secret: string;
	toleranceSec?: number;
}

export interface ComposioWebhookMetadataV3 {
	trigger_slug?: string;
	trigger_id?: string;
	connected_account_id?: string;
	user_id?: string;
	[key: string]: unknown;
}

export interface ComposioWebhookPayloadV3 {
	id?: string;
	type?: string;
	metadata?: ComposioWebhookMetadataV3;
	data?: unknown;
	timestamp?: string;
	[key: string]: unknown;
}

export interface VerifyWebhookResult {
	version: 'v3' | 'legacy';
	payload: ComposioWebhookPayloadV3;
	rawPayload: string;
}

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/$/, '');
}

function parseResponseJson(raw: string): Record<string, unknown> {
	try {
		return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
	} catch {
		return { raw };
	}
}

function extractSignatureValue(signature: string): string {
	const trimmed = signature.trim();
	const parts = trimmed.split(',');
	return (parts.length > 1 ? parts[1] : parts[0])?.trim() ?? '';
}

function parseTimestampSeconds(value: string): number {
	if (!value.trim()) return 0;
	const asNumber = Number(value);
	if (Number.isFinite(asNumber) && asNumber > 0) {
		// Support both epoch seconds and milliseconds.
		return asNumber > 1_000_000_000_000 ? Math.floor(asNumber / 1000) : Math.floor(asNumber);
	}
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
}

export function verifyComposioWebhook(input: VerifyWebhookInput): VerifyWebhookResult {
	const toleranceSec = input.toleranceSec ?? 300;
	if (!input.secret) throw new Error('COMPOSIO_WEBHOOK_SECRET is not configured');
	const nowSec = Math.floor(Date.now() / 1000);
	const tsSec = parseTimestampSeconds(input.timestamp);
	if (!tsSec) throw new Error('Invalid webhook timestamp');
	if (toleranceSec > 0 && Math.abs(nowSec - tsSec) > toleranceSec) {
		throw new Error('Webhook timestamp outside tolerance window');
	}
	const signingString = `${input.id}.${input.timestamp}.${input.payload}`;
	const expected = crypto.createHmac('sha256', input.secret).update(signingString).digest('base64');
	const received = extractSignatureValue(input.signature);
	if (!received) throw new Error('Missing webhook signature');
	const expectedBuf = Buffer.from(expected);
	const receivedBuf = Buffer.from(received);
	if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
		throw new Error('Invalid webhook signature');
	}
	const payload = parseResponseJson(input.payload) as ComposioWebhookPayloadV3;
	const version = payload.metadata ? 'v3' : 'legacy';
	return { version, payload, rawPayload: input.payload };
}

export class ComposioTriggersClient {
	private readonly baseUrlNorm: string;
	private readonly apiKey: string;

	constructor(apiKey: string, baseUrl: string) {
		this.apiKey = apiKey;
		this.baseUrlNorm = normalizeBaseUrl(baseUrl);
	}

	private headers(): HeadersInit {
		return {
			'x-api-key': this.apiKey,
			'Content-Type': 'application/json',
		};
	}

	private async fetchPaginated<T>(
		correlationId: string,
		path: string,
		buildParams: (cursor?: string) => URLSearchParams,
	): Promise<T[]> {
		const merged: T[] = [];
		let cursor: string | undefined;
		do {
			const params = buildParams(cursor);
			const url = `${this.baseUrlNorm}${path}?${params.toString()}`;
			const res = await fetchWithRetry(url, { method: 'GET', headers: this.headers() }, correlationId);
			if (!res.ok) {
				const body = (await res.text()).slice(0, 500);
				throw new Error(`Composio triggers list failed (${res.status}) ${redactUrl(url)}: ${body}`);
			}
			const page = (await res.json()) as CursorPage<T>;
			merged.push(...(page.items ?? []));
			cursor = page.next_cursor ?? undefined;
		} while (cursor);
		return merged;
	}

	async listTriggerTypes(correlationId: string, options?: ListTriggerTypesOptions): Promise<TriggerTypeItem[]> {
		return this.fetchPaginated<TriggerTypeItem>(correlationId, '/triggers_types', (cursor) => {
			const params = new URLSearchParams();
			params.set('limit', '100');
			if (options?.toolkit) params.append('toolkit_slugs', options.toolkit.trim().toLowerCase());
			if (cursor) params.set('cursor', cursor);
			return params;
		});
	}

	async listActiveTriggers(
		correlationId: string,
		options?: ListActiveTriggersOptions,
	): Promise<ActiveTriggerItem[]> {
		return this.fetchPaginated<ActiveTriggerItem>(correlationId, '/trigger_instances/active', (cursor) => {
			const params = new URLSearchParams();
			params.set('limit', '100');
			if (cursor) params.set('cursor', cursor);
			if (options?.showDisabled) params.set('show_disabled', 'true');
			if (options?.userId) params.append('user_ids', options.userId);
			for (const id of options?.connectedAccountIds ?? []) params.append('connected_account_ids', id);
			for (const id of options?.triggerNames ?? []) params.append('trigger_names', id);
			for (const id of options?.triggerIds ?? []) params.append('trigger_ids', id);
			for (const id of options?.authConfigIds ?? []) params.append('auth_config_ids', id);
			return params;
		});
	}

	async createActiveTrigger(correlationId: string, input: CreateActiveTriggerInput): Promise<ActiveTriggerItem> {
		const body: Record<string, unknown> = {};
		if (input.connectedAccountId) body.connected_account_id = input.connectedAccountId;
		if (input.triggerConfig && Object.keys(input.triggerConfig).length > 0) {
			body.trigger_config = input.triggerConfig;
		}
		const url = `${this.baseUrlNorm}/trigger_instances/${encodeURIComponent(input.triggerSlug)}/upsert`;
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
		const parsed = parseResponseJson(text);
		if (!res.ok) {
			throw new Error(`Composio create trigger failed (${res.status}): ${text.slice(0, 500)}`);
		}
		return parsed as ActiveTriggerItem;
	}

	async listWebhookSubscriptions(correlationId: string): Promise<WebhookSubscriptionItem[]> {
		const url = `${this.baseUrlNorm}/webhook_subscriptions?limit=100`;
		const res = await fetchWithRetry(url, { method: 'GET', headers: this.headers() }, correlationId);
		const text = await res.text();
		const parsed = parseResponseJson(text);
		if (!res.ok) {
			throw new Error(`Composio list webhook subscriptions failed (${res.status}): ${text.slice(0, 500)}`);
		}
		const items = parsed.items;
		return Array.isArray(items) ? (items as WebhookSubscriptionItem[]) : [];
	}

	async createWebhookSubscription(
		correlationId: string,
		input: UpsertWebhookSubscriptionInput,
	): Promise<WebhookSubscriptionItem> {
		const url = `${this.baseUrlNorm}/webhook_subscriptions`;
		const res = await fetchWithRetry(
			url,
			{
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify({
					webhook_url: input.webhookUrl,
					enabled_events: input.enabledEvents,
					version: input.version ?? 'V3',
				}),
			},
			correlationId,
		);
		const text = await res.text();
		const parsed = parseResponseJson(text);
		if (!res.ok) {
			throw new Error(`Composio create webhook subscription failed (${res.status}): ${text.slice(0, 500)}`);
		}
		return parsed as unknown as WebhookSubscriptionItem;
	}

	async updateWebhookSubscription(
		correlationId: string,
		subscriptionId: string,
		input: UpsertWebhookSubscriptionInput,
	): Promise<WebhookSubscriptionItem> {
		const url = `${this.baseUrlNorm}/webhook_subscriptions/${encodeURIComponent(subscriptionId)}`;
		const res = await fetchWithRetry(
			url,
			{
				method: 'PATCH',
				headers: this.headers(),
				body: JSON.stringify({
					webhook_url: input.webhookUrl,
					enabled_events: input.enabledEvents,
					version: input.version ?? 'V3',
				}),
			},
			correlationId,
		);
		const text = await res.text();
		const parsed = parseResponseJson(text);
		if (!res.ok) {
			throw new Error(`Composio update webhook subscription failed (${res.status}): ${text.slice(0, 500)}`);
		}
		return parsed as unknown as WebhookSubscriptionItem;
	}

	async rotateWebhookSubscriptionSecret(correlationId: string, subscriptionId: string): Promise<string> {
		const url = `${this.baseUrlNorm}/webhook_subscriptions/${encodeURIComponent(subscriptionId)}/rotate_secret`;
		const res = await fetchWithRetry(
			url,
			{
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify({}),
			},
			correlationId,
		);
		const text = await res.text();
		const parsed = parseResponseJson(text);
		if (!res.ok) {
			throw new Error(`Composio rotate webhook secret failed (${res.status}): ${text.slice(0, 500)}`);
		}
		const secret = typeof parsed.secret === 'string' ? parsed.secret : '';
		if (!secret) throw new Error('Missing secret in rotate webhook response');
		return secret;
	}

	async enableTrigger(correlationId: string, triggerId: string): Promise<void> {
		await this.toggleTrigger(correlationId, triggerId, 'enable');
	}

	async disableTrigger(correlationId: string, triggerId: string): Promise<void> {
		await this.toggleTrigger(correlationId, triggerId, 'disable');
	}

	async deleteTrigger(correlationId: string, triggerId: string): Promise<void> {
		const url = `${this.baseUrlNorm}/triggers/${encodeURIComponent(triggerId)}`;
		const res = await fetchWithRetry(url, { method: 'DELETE', headers: this.headers() }, correlationId);
		if (!res.ok) {
			const body = (await res.text()).slice(0, 500);
			throw new Error(`Composio delete trigger failed (${res.status}): ${body}`);
		}
	}

	private async toggleTrigger(
		correlationId: string,
		triggerId: string,
		action: 'enable' | 'disable',
	): Promise<void> {
		const url = `${this.baseUrlNorm}/triggers/${encodeURIComponent(triggerId)}/${action}`;
		const res = await fetchWithRetry(
			url,
			{ method: 'POST', headers: this.headers(), body: JSON.stringify({}) },
			correlationId,
		);
		if (!res.ok) {
			const body = (await res.text()).slice(0, 500);
			throw new Error(`Composio ${action} trigger failed (${res.status}): ${body}`);
		}
	}
}

export async function forwardTriggerToN8n(
	correlationId: string,
	targetUrl: string,
	payload: string,
	headers: Record<string, string>,
): Promise<{ ok: boolean; status: number; bodySnippet: string }> {
	const res = await fetchWithRetry(
		targetUrl,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
			body: payload,
		},
		correlationId,
	);
	const body = (await res.text()).slice(0, 500);
	logLine('info', 'composio_trigger_forward_http', {
		correlationId,
		status: res.status,
		target: redactUrl(targetUrl),
	});
	return { ok: res.ok, status: res.status, bodySnippet: body };
}
