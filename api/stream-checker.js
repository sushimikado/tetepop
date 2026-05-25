export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Content-Type", "text/html");

  try {
    // Notion取得ロジック（既存のもの）
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_MEMBERS_DATABASE_ID}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" }
    });
    const notionData = await notionRes.json();
    const channels = notionData.results.map(page => ({
      name: page.properties["名前"]?.title[0]?.plain_text || "Unknown",
      channelId: page.properties["YouTubeChannelID"]?.rich_text[0]?.plain_text || ""
    })).filter(v => v.channelId);

    const allStreams = [];

    // RSS取得と時刻抽出
    await Promise.all(channels.map(async member => {
      try {
        const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${member.channelId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        const xml = await rssRes.text();
        const entries = xml.split("<entry>").slice(1);

        for (const entry of entries) {
          const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
          if (!videoId) continue;

          // 配信ページから開始時刻をJSONから抽出
          const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
          const html = await watchRes.text();
          
          // 【改良点】開始時刻の候補を広げる（JSON内の各種キーを検索）
          const timeMatch = html.match(/"(scheduledStartTime|actualStartTime|startTimestamp)":"?(\d+)"?/);
          const startTime = timeMatch ? timeMatch[2] : "";

          allStreams.push({
            memberName: member.name,
            title: entry.match(/<title>(.*?)<\/title>/s)?.[1]?.trim() || "No Title",
            videoId,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            startTime: startTime // Unixタイムスタンプ（秒）
          });
        }
      } catch (e) { console.error("Error:", e); }
    }));

    // 【改良点】ソート：startTimeがあるものを優先し、過去から未来へ並べる
    allStreams.sort((a, b) => {
      const aTime = Number(a.startTime) || 0;
      const bTime = Number(b.startTime) || 0;
      return aTime - bTime;
    });

const now = Math.floor(Date.now() / 1000);
// 配信終了後、3時間以上経過したものは除外する例
const filteredStreams = allStreams.filter(v => (Number(v.startTime) || 0) > (now - 10800));
    
    // HTML生成
    const html = allStreams.length === 0 
      ? '<div class="card"><div class="title">配信情報が見つかりません</div></div>'
      : allStreams.map(v => `
        <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" class="card-link">
          <div class="card">
            <img class="thumb" src="${v.thumbnail}">
            <div class="card-bottom">
              <div class="title">${v.title.replace(/</g, "&lt;")}</div>
              <div class="name">${v.memberName}</div>
              <div class="stream-date">${v.startTime ? new Date(Number(v.startTime) * 1000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "日時未定"}</div>
            </div>
          </div>
        </a>
      `).join("");

    res.status(200).send(html);
  } catch (e) {
    res.status(500).send("エラー");
  }
}
