import test from 'node:test';
import assert from 'node:assert/strict';

import { inputParametersToJsonSchema } from './schema-utils.js';

test('inputParametersToJsonSchema wraps composio-style object schema', () => {
	const schema = inputParametersToJsonSchema({
		type: 'object',
		properties: { email: { type: 'string' } },
		required: ['email'],
	});
	assert.equal(schema.type, 'object');
	assert.ok(schema.properties.email);
	assert.deepEqual(schema.required, ['email']);
});

test('inputParametersToJsonSchema falls back to empty object', () => {
	const schema = inputParametersToJsonSchema(null);
	assert.deepEqual(schema, { type: 'object', properties: {} });
});
