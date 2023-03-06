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

// Proxy request to GCP Text-to-speech API, add API key
export default {
	async fetch(
		request: Request
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
			if (!url.search) {
				response = await fetch(
					UPSTREAM_ENDPOINT + "voices?key=" + GCP_API_KEY
				);
			} else if (url.search.startsWith("?languageCode=")) {
				response = await fetch(
					UPSTREAM_ENDPOINT + "voices" + url.search + "&key=" + GCP_API_KEY
				);
			}
		}
		if (url.pathname === "/text:synthesize") {
			if (request.method !== "POST") {
				return new Response(null, {status: 405}); // Method Not Allowed
			}
			response = await fetch(
				UPSTREAM_ENDPOINT + "text:synthesize?key=" + GCP_API_KEY,
				{
					method: "POST",
					body: request.body,
				}
			);
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
