import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  // KVからデータを読み込むだけ！
  const cachedData = await kv.get('live_data');
  const results = cachedData ? JSON.parse(cachedData) : [];

  const html = `
    ${
      results.length === 0
      
        ? `<div class="card">
              <div class="thumb-empty">STANDBY</div>
              <div class="card-bottom">
                <span class="live-badge-empty">● INFO</span>
                <div class="title">配信中の参加者がここに表示されます</div>
              </div>
          </div>
      
        <div class="card">
              <div class="thumb-empty">STANDBY</div>
              <div class="card-bottom">
                <span class="live-badge-empty">● INFO</span>
                <div class="title">API制限により情報が取得されない場合があります</div>
              </div>
          </div>`
      
        : cards
    }
`;
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
