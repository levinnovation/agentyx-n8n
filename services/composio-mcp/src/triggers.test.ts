import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { forwardTriggerToN8n, verifyComposioWebhook } from './triggers.js';

function sign(id: string, timestamp: string, payload: string, secret: string): string {
	const signingString = `${id}.${timestamp}.${payload}`;
	const digest = crypto.createHmac('sha256', secret).update(signingString).digest('base64');
	return `v1,${digest}`;
}

test('verifyComposioWebhook accepts valid signed payload', () => {
	const id = 'wh_123';
	const timestamp = String(Math.floor(Date.now() / 1000));
	const payload = JSON.stringify({
		id: 'msg_1',
		metadata: { trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE', trigger_id: 'tr_1', user_id: 'u1' },
		data: { example: true },
	});
	const secret = 'top-secret';
	const result = verifyComposioWebhook({
		id,
		timestamp,
		payload,
		signature: sign(id, timestamp, payload, secret),
		secret,
	});
	assert.equal(result.version, 'v3');
	assert.equal(result.payload.metadata?.trigger_slug, 'GMAIL_NEW_GMAIL_MESSAGE');
});

test('verifyComposioWebhook rejects invalid signatures', () => {
	const id = 'wh_123';
	const timestamp = String(Math.floor(Date.now() / 1000));
	const payload = JSON.stringify({ metadata: { trigger_slug: 'X' } });
	assert.throws(
		() =>
			verifyComposioWebhook({
				id,
				timestamp,
				payload,
				signature: 'v1,invalid',
				secret: 'top-secret',
			}),
		/Invalid webhook signature/,
	);
});

test('verifyComposioWebhook rejects stale timestamps', () => {
	const id = 'wh_123';
	const timestamp = String(Math.floor(Date.now() / 1000) - 1000);
	const payload = JSON.stringify({ metadata: { trigger_slug: 'X' } });
	const secret = 'top-secret';
	assert.throws(
		() =>
			verifyComposioWebhook({
				id,
				timestamp,
				payload,
				signature: sign(id, timestamp, payload, secret),
				secret,
				toleranceSec: 300,
			}),
		/outside tolerance window/,
	);
});

test('forwardTriggerToN8n posts payload and returns status mapping', async () => {
	const originalFetch = global.fetch;
	let calledUrl = '';
	let calledMethod = '';
	let calledBody = '';
	let calledSecret = '';
	global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		calledUrl = String(input instanceof Request ? input.url : input);
		calledMethod = init?.method ?? '';
		calledBody = typeof init?.body === 'string' ? init.body : '';
		const headers = (init?.headers ?? {}) as Record<string, string>;
		calledSecret = headers['X-Auth-Proxy-Secret'] ?? headers['x-auth-proxy-secret'] ?? '';
		return new Response(JSON.stringify({ ok: true }), { status: 202 });
	}) as typeof global.fetch;
	try {
		const payload = JSON.stringify({ metadata: { trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE' } });
		const result = await forwardTriggerToN8n(
			'cid-forward',
			'https://levinnovation.n8n.agentyx.one/webhook/composio/gmail_new_gmail_message',
			payload,
			{ 'X-Auth-Proxy-Secret': 'proxy-secret', 'X-Composio-Trigger-Slug': 'GMAIL_NEW_GMAIL_MESSAGE' },
		);
		assert.equal(result.ok, true);
		assert.equal(result.status, 202);
		assert.equal(calledMethod, 'POST');
		assert.equal(
			calledUrl,
			'https://levinnovation.n8n.agentyx.one/webhook/composio/gmail_new_gmail_message',
		);
		assert.equal(calledBody, payload);
		assert.equal(calledSecret, 'proxy-secret');
	} finally {
		global.fetch = originalFetch;
	}
});
