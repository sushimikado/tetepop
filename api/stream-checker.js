export default async function handler(req, res) {
  // キャッシュを完全に無効化（常に最新をチェック）
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Content-Type", "text/html");

  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const NOTION_MEMBERS_DATABASE_ID = process.env.NOTION_MEMBERS_DATABASE_ID;

    // NotionからチャンネルID取得
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_MEMBERS_DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      }
    });
    const notionData = await notionRes.json();
    const channels = notionData.results
      .map(page => ({
        name: page.properties["名前"]?.title[0]?.plain_text || "Unknown",
        channelId: page.properties["YouTubeChannelID"]?.rich_text[0]?.plain_text || ""
      }))
      .filter(v => v.channelId);

    const allStreams = [];

    // RSS取得と解析
    await Promise.all(channels.map(async member => {
      try {
        const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${member.channelId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        const xml = await rssRes.text();
        const entries = xml.split("<entry>").slice(1);

        for (const entry of entries) {
          const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
          if (!videoId) continue;

          // 配信ページから開始時刻を抽出
          const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
          const html = await watchRes.text();
          
          // 開始時刻を抽出（正規表現を強化）
          const timeMatch = html.match(/"(actual|scheduled)StartTime":"?(\d+)"?/);
          const startTime = timeMatch ? timeMatch[2] : "";

          allStreams.push({
            memberName: member.name,
            title: entry.match(/<title>(.*?)<\/title>/s)?.[1]?.trim() || "No Title",
            videoId,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            startTime
          });
        }
      } catch (e) { console.error("RSS Fetch Error:", e); }
    }));

    // 時刻が早い順にソート
    allStreams.sort((a, b) => (Number(a.startTime) || 0) - (Number(b.startTime) || 0));

    // HTML生成
    const html = allStreams.length === 0 
      ? '<div class="card"><div class="title">現在配信中のメンバーはいません</div></div>'
      : allStreams.slice(0, 30).map(v => `
        <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" class="card-link">
          <div class="card">
            <img class="thumb" src="${v.thumbnail}">
            <div class="card-bottom">
              <div class="title">${v.title.replace(/</g, "&lt;")}</div>
              <div class="name">${v.memberName}</div>
              <div class="stream-date">${v.startTime ? new Date(Number(v.startTime) * 1000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "時刻未定"}</div>
            </div>
          </div>
        </a>
      `).join("");

    res.status(200).send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send("エラーが発生しました");
  }
}
