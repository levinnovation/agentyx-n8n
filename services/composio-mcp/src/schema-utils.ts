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
			return schema;
		}

		if (p.properties && typeof p.properties === 'object') {
			return {
				type: 'object',
				properties: p.properties as Record<string, unknown>,
				...(Array.isArray(p.required) ? { required: p.required as string[] } : {}),
			};
		}
	}

	return { type: 'object', properties: {} };
}
