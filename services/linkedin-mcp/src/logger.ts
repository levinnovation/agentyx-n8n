export type LogLevel = 'info' | 'warn' | 'error';

export function logLine(level: LogLevel, msg: string, fields: Record<string, unknown> = {}) {
	const line = {
		level,
		ts: new Date().toISOString(),
		msg,
		service: 'linkedin-mcp',
		...fields,
	};
	if (level === 'error') {
		console.error(JSON.stringify(line));
	} else {
		console.log(JSON.stringify(line));
	}
}
