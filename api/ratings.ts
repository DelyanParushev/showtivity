/**
 * Vercel serverless function — server-side proxy for MDBList ratings.
 * Lives in the project-root /api/ folder so Vercel deploys it as a
 * serverless function regardless of the static web export in /dist/.
 *
 * GET /api/ratings?imdbId=tt0944947
 */
export default async function handler(req: any, res: any) {
  // CORS headers so the static web client can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const imdbId = req.query?.imdbId as string | undefined;
  if (!imdbId) {
    return res.status(400).json({ error: 'imdbId query param required' });
  }

  const apiKey = process.env.EXPO_PUBLIC_MDBLIST_API_KEY ?? '';
  const url = new URL('https://mdblist.com/api/');
  url.searchParams.set('i', imdbId);
  if (apiKey) url.searchParams.set('apikey', apiKey);

  try {
    const upstream = await fetch(url.toString());
    const data = await upstream.json();
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'upstream MDBList fetch failed' });
  }
}
