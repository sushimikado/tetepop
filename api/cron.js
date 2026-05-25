import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  // セキュリティチェック
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  try {
    // NotionからチャンネルIDリストを取得
    const response = await notion.databases.query({ database_id: process.env.NOTION_DATABASE_ID });
    // ※ Notionのプロパティ名は適宜調整してください
    const channelIds = response.results.map(page => page.properties.YouTubeChannelID.rich_text[0].plain_text);

    const results = [];
    for (const channelId of channelIds) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${process.env.YOUTUBE_API_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      
      if (data.items && data.items.length > 0) {
        const live = data.items[0];
        results.push({
          title: live.snippet.title,
          url: `https://youtube.com/watch?v=${live.id.videoId}`,
          thumbnail: live.snippet.thumbnails?.medium?.url || ""
        });
      }
    }

    await kv.set('live_data', JSON.stringify(results));
    res.status(200).json({ success: true, updatedCount: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
