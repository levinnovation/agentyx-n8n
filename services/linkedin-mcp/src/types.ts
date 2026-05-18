export interface LinkedInProfile {
	full_name: string;
	company: string;
	title: string;
	linkedin_url: string;
	location: string;
	summary: string;
}

export interface SearchResult {
	data: LinkedInProfile[];
	source: string;
	query: string;
	count: number;
}

export interface SearchRequest {
	query: string;
	limit?: number;
}
