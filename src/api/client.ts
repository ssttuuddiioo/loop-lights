/**
 * Build the full URL for an ELM API route.
 * All ELM routes are under the /elm/ prefix (per ENTTEC ELM User Manual).
 *
 * In both dev (Vite proxy) and production (serve.js proxy),
 * /elm/* is proxied to the ELM server — so we always use /elm/.
 */
export function baseUrl(route: string): string {
  return '/elm/' + route;
}

export async function elmGet<T>(route: string): Promise<T> {
  const response = await fetch(baseUrl(route));
  if (!response.ok) throw new Error(`GET ${route} failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function elmPost(route: string): Promise<Response> {
  const response = await fetch(baseUrl(route), { method: 'POST' });
  if (!response.ok) throw new Error(`POST ${route} failed: ${response.status}`);
  return response;
}

export async function elmPostFormData(route: string, formData: FormData): Promise<Response> {
  const response = await fetch(baseUrl(route), { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`POST ${route} failed: ${response.status}`);
  return response;
}
