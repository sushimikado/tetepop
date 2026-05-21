import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  // KVからデータを読み込むだけ！
  const cachedData = await kv.get('live_data');
  const results = cachedData ? JSON.parse(cachedData) : [];

  const html = `... (前回のHTMLコード、resultsを使ってループ回すだけ) ...`;

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}