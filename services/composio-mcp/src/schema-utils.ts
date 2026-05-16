/**
 * Recursively make a JSON Schema strict-compatible for OpenAI strict mode.
 * Strict mode requires:
 * 1. additionalProperties: false on every object
 * 2. All properties listed in required
 * 3. Optional properties expressed as nullable unions
 */
function strictifySchema(schema: unknown): unknown {
	if (!schema || typeof schema !== 'object') return schema;
	if (Array.isArray(schema)) return schema.map(strictifySchema);

	const s = schema as Record<string, unknown>;
	const result: Record<string, unknown> = {};

	for (const [k, v] of Object.entries(s)) {
		result[k] = (k === 'properties' || k === 'items' || k === 'additionalItems') ? v : strictifySchema(v);
	}

	const isObject = result.type === 'object' || (result.properties && !result.type);
	if (isObject) {
		result.additionalProperties = false;
		if (result.properties && typeof result.properties === 'object') {
			const props = result.properties as Record<string, unknown>;
			const existingRequired = Array.isArray(result.required) ? (result.required as string[]) : [];
			const allKeys = Object.keys(props);

			const normalizedProps: Record<string, unknown> = {};
			for (const key of allKeys) {
				const prop = props[key] as Record<string, unknown>;
				if (!prop || typeof prop !== 'object') {
					normalizedProps[key] = prop;
					continue;
				}
				// Recurse into the property definition
				const normalizedProp = strictifySchema(prop) as Record<string, unknown>;
				// If optional (not in required), wrap type as nullable union
				if (!existingRequired.includes(key)) {
					const t = normalizedProp.type;
					if (t && t !== 'null') {
						normalizedProp.type = Array.isArray(t) && !t.includes('null')
							? [...(t as string[]), 'null']
							: [t as string, 'null'];
					}
				}
				normalizedProps[key] = normalizedProp;
			}
			result.properties = normalizedProps;
			result.required = allKeys; // all keys required (nullables for optional)
		}
	}
	return result;
}

/**
 * Normalize Composio `input_parameters` into a JSON Schema object for MCP `inputSchema`.
 */
export function inputParametersToJsonSchema(parameters: unknown): {
	type: 'object';
	properties: Record<string, unknown>;
	required?: string[];
	additionalProperties?: boolean;
} {
	if (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) {
		const p = parameters as Record<string, unknown>;

		if (p.type === 'object' && p.properties && typeof p.properties === 'object') {
			const schema = {
				type: 'object' as const,
				properties: p.properties as Record<string, unknown>,
				...(Array.isArray(p.required) ? { required: p.required as string[] } : {}),
				...(typeof p.additionalProperties === 'boolean'
					? { additionalProperties: p.additionalProperties }
					: {}),
			};
			return strictifySchema(schema) as ReturnType<typeof inputParametersToJsonSchema>;
		}

		if (p.properties && typeof p.properties === 'object') {
			return strictifySchema({
				type: 'object',
				properties: p.properties as Record<string, unknown>,
				...(Array.isArray(p.required) ? { required: p.required as string[] } : {}),
			}) as ReturnType<typeof inputParametersToJsonSchema>;
		}
	}

	return { type: 'object', properties: {}, additionalProperties: false };
}
