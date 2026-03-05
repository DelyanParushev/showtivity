/**
 * Server-side proxy for MDBList ratings API.
 * Required because mdblist.com does not send CORS headers,
 * so direct browser requests are blocked.
 *
 * GET /api/ratings?imdbId=tt0944947
 * Returns raw MDBList JSON.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const imdbId = url.searchParams.get('imdbId');

  if (!imdbId) {
    return Response.json({ error: 'imdbId required' }, { status: 400 });
  }

  const apiKey = process.env.EXPO_PUBLIC_MDBLIST_API_KEY ?? '';
  const mdbUrl = new URL('https://mdblist.com/api/');
  mdbUrl.searchParams.set('i', imdbId);
  if (apiKey) mdbUrl.searchParams.set('apikey', apiKey);

  try {
    const res = await fetch(mdbUrl.toString());
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: 'upstream fetch failed' }, { status: 502 });
  }
}
