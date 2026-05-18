import * as cheerio from 'cheerio';
import type { LinkedInProfile } from './types.js';
import { logLine } from './logger.js';

const REQUEST_DELAY_MS = parseInt(process.env.REQUEST_DELAY_MS ?? '2000', 10);
const FETCH_TIMEOUT_MS = 20_000;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? '';

const USER_AGENTS = [
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

function pickUA(): string {
	return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

function extractLinkedinUrl(href: string): string | null {
	if (!href) return null;

	// DuckDuckGo redirect: //duckduckgo.com/l/?uddg=https%3A%2F%2F...&rut=...
	if (href.includes('uddg=')) {
		try {
			const qs = href.includes('?') ? href.split('?')[1]! : href;
			const uddg = new URLSearchParams(qs).get('uddg');
			if (uddg && uddg.includes('linkedin.com/in/')) {
				return uddg.startsWith('http') ? uddg : `https:${uddg}`;
			}
		} catch {
			// ignore decode errors
		}
	}

	if (href.includes('linkedin.com/in/')) {
		const clean = href.split('?')[0]!.replace(/\/$/, '');
		return clean.startsWith('//') ? `https:${clean}` : clean;
	}

	return null;
}

function normaliseUrl(url: string): string {
	return url
		.replace(/^https?:\/\/(?:www\.)?linkedin\.com/, 'https://www.linkedin.com')
		.split('?')[0]!
		.replace(/\/$/, '');
}

// ─── Title parser ─────────────────────────────────────────────────────────────

function parseTitle(rawTitle: string, snippet: string, linkedinUrl: string): LinkedInProfile | null {
	if (!rawTitle) return null;

	const clean = rawTitle
		.replace(/\s*[|–\-]\s*LinkedIn\.?com?\s*$/i, '')
		.replace(/\s*\|\s*LinkedIn\s*$/i, '')
		.replace(/&amp;/g, '&')
		.trim();

	if (!clean) return null;

	const sepMatch = clean.match(/^(.+?)\s+[–\-]\s+(.+)$/);
	let full_name = clean;
	let roleCompany = '';

	if (sepMatch) {
		full_name = sepMatch[1]!.trim();
		roleCompany = sepMatch[2]!.trim();
	}

	if (!full_name || full_name.length < 2 || full_name.length > 80) return null;
	if (/^(linkedin|people|search|jobs?|companies|view)/i.test(full_name)) return null;

	let title = '';
	let company = '';

	if (roleCompany) {
		const atIdx = roleCompany.toLowerCase().indexOf(' at ');
		if (atIdx > 0) {
			title = roleCompany.slice(0, atIdx).trim();
			company = roleCompany.slice(atIdx + 4).trim();
			const trailDash = company.search(/\s+[–\-]\s+/);
			if (trailDash > 0) company = company.slice(0, trailDash).trim();
		} else {
			title = roleCompany.trim();
		}
	}

	let location = '';
	if (snippet) {
		const parts = snippet.split(/\s*·\s*/);
		if (parts.length >= 3) {
			const candidate = parts[parts.length - 1]!.replace(/\|.*$/, '').trim();
			if (candidate && candidate.length < 80) location = candidate;
		}
	}

	return {
		full_name,
		company,
		title,
		linkedin_url: normaliseUrl(linkedinUrl),
		location,
		summary: snippet.slice(0, 300),
	};
}

// ─── Tavily (primary — when TAVILY_API_KEY is set) ────────────────────────────

async function searchTavily(
	query: string,
	limit: number,
): Promise<{ profiles: LinkedInProfile[]; source: string }> {
	logLine('info', 'tavily_search_start', { query, limit });

	const res = await fetch('https://api.tavily.com/search', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${TAVILY_API_KEY}`,
		},
		body: JSON.stringify({
			query: `site:linkedin.com/in ${query}`,
			include_domains: ['linkedin.com'],
			max_results: Math.min(limit, 20),
			search_depth: 'basic',
		}),
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`Tavily HTTP ${res.status}: ${body.slice(0, 200)}`);
	}

	const data = (await res.json()) as { results?: Array<{ url: string; title: string; content: string }> };
	const results = data.results ?? [];

	const seen = new Set<string>();
	const profiles: LinkedInProfile[] = [];

	for (const r of results) {
		if (profiles.length >= limit) break;
		if (!r.url.includes('linkedin.com/in/')) continue;
		const url = normaliseUrl(r.url);
		if (seen.has(url)) continue;
		const p = parseTitle(r.title ?? '', r.content ?? '', url);
		if (p) {
			seen.add(url);
			profiles.push(p);
		}
	}

	logLine('info', 'tavily_search_done', { found: profiles.length });
	return { profiles, source: 'tavily' };
}

// ─── DuckDuckGo HTML (fallback A) ─────────────────────────────────────────────

async function searchDuckDuckGo(
	query: string,
	limit: number,
): Promise<{ profiles: LinkedInProfile[]; source: string }> {
	logLine('info', 'ddg_search_start', { query, limit });

	const ua = pickUA();
	const params = new URLSearchParams({ q: `site:linkedin.com/in ${query}`, kl: 'us-en', k1: '-1' });
	const url = `https://html.duckduckgo.com/html/?${params}`;

	// Step 1: warm up session (collect cookies)
	const warmup = await fetch('https://html.duckduckgo.com/html/', {
		headers: { 'User-Agent': ua, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.5' },
		signal: AbortSignal.timeout(10_000),
	});
	const rawCookie = warmup.headers.get('set-cookie') ?? '';
	const cookie = rawCookie.split(';')[0] ?? '';

	await delay(500);

	// Step 2: actual search with session cookie
	const res = await fetch(url, {
		headers: {
			'User-Agent': ua,
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.5',
			Referer: 'https://duckduckgo.com/',
			...(cookie ? { Cookie: cookie } : {}),
		},
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});

	if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);

	const html = await res.text();

	// DuckDuckGo returned a "click here" page — likely throttled
	if (html.length < 5000 || !html.includes('result__a')) {
		throw new Error('DuckDuckGo returned empty/blocked response');
	}

	const $ = cheerio.load(html);
	const profiles: LinkedInProfile[] = [];
	const seen = new Set<string>();

	$('.result, .web-result').each((_, el) => {
		if (profiles.length >= limit) return false;
		const titleEl = $(el).find('a.result__a').first();
		const snippetEl = $(el).find('.result__snippet').first();
		const rawTitle = titleEl.text().trim();
		const href = titleEl.attr('href') ?? '';
		const snippet = snippetEl.text().trim();
		const linkedinUrl = extractLinkedinUrl(href);
		if (!linkedinUrl) return;
		if (seen.has(linkedinUrl)) return;
		const p = parseTitle(rawTitle, snippet, linkedinUrl);
		if (p) { seen.add(linkedinUrl); profiles.push(p); }
	});

	logLine('info', 'ddg_search_done', { found: profiles.length });
	return { profiles, source: 'duckduckgo' };
}

// ─── Google (fallback B) ──────────────────────────────────────────────────────

async function searchGoogle(
	query: string,
	limit: number,
): Promise<{ profiles: LinkedInProfile[]; source: string }> {
	logLine('info', 'google_search_start', { query, limit });

	const params = new URLSearchParams({
		q: `site:linkedin.com/in ${query}`,
		num: String(Math.min(limit, 10)),
		hl: 'en',
		gl: 'us',
		pws: '0',
	});

	const res = await fetch(`https://www.google.com/search?${params}`, {
		headers: {
			'User-Agent': pickUA(),
			Accept: 'text/html,application/xhtml+xml',
			'Accept-Language': 'en-US,en;q=0.9',
		},
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});

	const html = await res.text();

	if (html.includes('sorry/index') || html.includes('recaptcha') || html.length < 5000) {
		throw new Error('Google CAPTCHA/blocked');
	}

	const $ = cheerio.load(html);
	const profiles: LinkedInProfile[] = [];
	const seen = new Set<string>();

	$('a[href*="linkedin.com/in/"]').each((_, el) => {
		if (profiles.length >= limit) return false;
		const href = $(el).attr('href') ?? '';
		const linkedinUrl = extractLinkedinUrl(href);
		if (!linkedinUrl) return;
		if (seen.has(linkedinUrl)) return;
		const container = $(el).closest('div[class]');
		const rawTitle = container.find('h3').first().text().trim();
		const snippet = container.find('.VwiC3b, [data-sncf], .IsZvec').first().text().trim();
		if (!rawTitle) return;
		const p = parseTitle(rawTitle, snippet, linkedinUrl);
		if (p) { seen.add(linkedinUrl); profiles.push(p); }
	});

	logLine('info', 'google_search_done', { found: profiles.length });
	return { profiles, source: 'google' };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchLinkedIn(
	query: string,
	limit = 25,
): Promise<{ profiles: LinkedInProfile[]; source: string }> {

	// 1. Tavily (most reliable — when key is configured)
	if (TAVILY_API_KEY) {
		try {
			return await searchTavily(query, limit);
		} catch (err) {
			logLine('warn', 'tavily_failed', { error: err instanceof Error ? err.message : String(err) });
		}
		await delay(REQUEST_DELAY_MS);
	}

	// 2. DuckDuckGo HTML
	try {
		const r = await searchDuckDuckGo(query, limit);
		if (r.profiles.length > 0) return r;
		logLine('warn', 'ddg_empty', { query });
	} catch (err) {
		logLine('warn', 'ddg_failed', { error: err instanceof Error ? err.message : String(err) });
	}

	await delay(REQUEST_DELAY_MS);

	// 3. Google
	return await searchGoogle(query, limit);
}
