import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  try {
    const cachedData = await kv.get('live_data');
    const results = cachedData ? JSON.parse(cachedData) : [];

    // HTMLではなく「JSON」で返す
    res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
