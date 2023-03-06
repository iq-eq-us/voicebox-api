/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// GCP Text-to-speech API
const UPSTREAM_ENDPOINT = "https://texttospeech.googleapis.com/v1/";
const ORIGIN = "v.iq-eq.us";

interface Env {
  GCP_API_KEY: string;
}

/**
 * Proxy request to GCP Text-to-speech API, add API key
 */
export default {
	async fetch(
		request: Request, env: Env
	): Promise<Response> {
		const url = new URL(request.url);
		if (url.hostname !== ORIGIN) {
			return new Response(null, {status: 403}); // Forbidden
		}
		const cache: Cache = caches.default;
		let response: Response | undefined = await cache.match(request);
		if (response) {
			return response;
		}
		if (url.pathname === "/voices") {
			if (request.method !== "GET") {
				return new Response(null, {status: 405}); // Method Not Allowed
			}
			if (url.search) { // ensure query string (key, languageCode) exists
				const params: URLSearchParams = new URLSearchParams(url.search);
				if (params.has("languageCode")) {
					response = await fetch(UPSTREAM_ENDPOINT + "voices?languageCode=" + params.get("languageCode")
						+ "&key=" + env.GCP_API_KEY
					);
				}
			}
		}
		if (url.pathname === "/text:synthesize") {
			if (request.method !== "POST") {
				return new Response(null, {status: 405}); // Method Not Allowed
			}
			if (url.search) { // ensure query string (key) exists
				response = await fetch(UPSTREAM_ENDPOINT + "text:synthesize?key=" + env.GCP_API_KEY,
					{
						method: "POST",
						body: request.body,
					}
				);
			}
		}
		if (!response) {
			return new Response(null, {status: 400}); // Bad Request
		}
		return new Response(response.body, {
			status: response.status,
			headers: {
				...response.headers,
				"Access-Control-Allow-Origin": "https://" + ORIGIN,
				"Cache-Control": "max-age=7200", // 2 hours
			}
		});
	},
};
