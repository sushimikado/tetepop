import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  // Vercel Cronからの実行であることを確認（セキュリティ）
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  try {
    // 1. NotionからチャンネルID取得 (前回のコードと同様)
    // ... (Notion取得ロジック) ...
    const channelIds = /* Notionから取得したIDリスト */;

    const results = [];
    // 2. YouTube APIを叩く (50件なら search 以外の手法もありますが、まずは簡潔に)
    for (const channelId of channelIds) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${process.env.YOUTUBE_API_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      
      if (data.items?.[0]) {
        const live = data.items[0];
        results.push({
          title: live.snippet.title,
          url: `https://youtube.com/watch?v=${live.id.videoId}`,
          thumbnail: live.snippet.thumbnails?.medium?.url || ""
        });
      }
    }

    // 3. 結果をKVに保存（"live_data" という名前で保存）
    await kv.set('live_data', JSON.stringify(results));

    res.status(200).json({ success: true, updatedCount: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}