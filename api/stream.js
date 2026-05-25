import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  try {
    // KVからデータを取得
    const data = await kv.get('live_data');
    
    // データが空の場合は空の配列を返す
    res.status(200).json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
