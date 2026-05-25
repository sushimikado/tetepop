export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Content-Type", "text/html");

  try {
    // 1. NotionからチャンネルID取得
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

    // 2. RSS取得
    await Promise.all(channels.map(async member => {
      try {
        const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${member.channelId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        const xml = await rssRes.text();
        const entries = xml.split("<entry>").slice(1);

        for (const entry of entries) {
          const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
          const published = entry.match(/<published>(.*?)<\/published>/)?.[1]; // RSSの公開日時
          if (!videoId) continue;

          // 配信ページから開始時刻をJSONから抽出
          const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
          const html = await watchRes.text();
          
          // 配信予定時刻を取得、設定されていなければ枠を作成した時間（RSS公開日時）
          const timeMatch = html.match(/"scheduledStartTime":"?(\d+)"?/);
          const startTime = timeMatch ? timeMatch[1] : Math.floor(new Date(published).getTime() / 1000);
          
          // 【改善】JSONの開始時刻があればそれを使う。なければRSSの公開日時をDate型に変換してUnixタイムスタンプにする
          let startTime = timeMatch ? timeMatch[2] : Math.floor(new Date(published).getTime() / 1000);

          allStreams.push({
            memberName: member.name,
            title: entry.match(/<title>(.*?)<\/title>/s)?.[1]?.trim() || "No Title",
            videoId,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            startTime: startTime 
          });
        }
      } catch (e) { console.error("Error:", e); }
    }));

    // 3. ソートとフィルタリング
    const now = Math.floor(Date.now() / 1000);
    const filteredStreams = allStreams
      .filter(v => (Number(v.startTime) || 0) > (now - 21600)) // 6時間以内の枠のみ
      .sort((a, b) => Number(a.startTime) - Number(b.startTime)); // 昇順ソート

    // 4. HTML生成
    const html = filteredStreams.length === 0 
      ? '<div class="card"><div class="title">配信情報が見つかりません</div></div>'
      : filteredStreams.map(v => {
          // 【追加】状況判定ロジック
          const start = Number(v.startTime);
          let statusText = "配信予定";
          let statusClass = "status-futurePlan"; // クラス名を生成

          if (start < now) {
            statusText = (now - start) > 7200 ? "配信終了" : "配信中";
            statusClass = (now - start) > 7200 ? "status-ended" : "status-now";
          }
          
          return `
            <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" class="card-link">
              <div class="card">
                <img class="thumb" src="${v.thumbnail}">
                <div class="card-bottom">
                  <div class="status ${statusClass}">${statusText}</div>
                  <div class="title">${v.title.replace(/</g, "&lt;")}</div>
                  <div class="name">${v.memberName}</div>
                  <div class="stream-date">${new Date(start * 1000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            </a>
          `;
        }).join("");

    res.status(200).send(html);
  } catch (e) {
    res.status(500).send("エラー");
  }
}
