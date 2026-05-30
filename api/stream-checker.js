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
      
      // 値の抽出をより安全に
      let startTime = "";
      let isLiveNow = false;
      
      try {
      
        const watchUrl =
          `https://www.youtube.com/watch?v=${videoId}`;
      
        const watchRes = await fetch(
          watchUrl,
          {
            headers: {
              "User-Agent": "Mozilla/5.0"
            }
          }
        );
      
        const watchHtml =
          await watchRes.text();
        // ログを見る
        console.log(
          videoId,
          {
            scheduled:
              watchHtml.match(
                /"scheduledStartTime":"([^"]+)"/
              )?.[1],
        
            liveNow:
              watchHtml.includes(
                '"isLiveNow":true'
              ),
        
            liveContent:
              watchHtml.includes(
                '"isLiveContent":true'
              ),
        
            upcoming:
              watchHtml.includes(
                'upcomingEventData'
              )
          }
        );
      
        const scheduledMatch =
          watchHtml.match(
            /"scheduledStartTime":"(\d+)"/
          );
      
        if (scheduledMatch?.[1]) {
      
          startTime =
            scheduledMatch[1];
      
        } else {
      
          const pubDate =
            Math.floor(
              new Date(published).getTime() / 1000
            );
      
          startTime =
            String(pubDate);
        }
      
        isLiveNow =
          watchHtml.includes('"isLiveNow":true');
      
      } catch (e) {
      
        console.error(
          "watch page error:",
          videoId,
          e
        );
      }

      const title =
        entry.match(/<title>(.*?)<\/title>/s)?.[1]?.trim()
        || "No Title";

      const thumbnail =
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      
      allStreams.push({
        memberName: member.name,
        title,
        videoId,
        thumbnail,
        startTime,
        isLiveNow
      });
    }
  } catch (e) { console.error("Error:", e); }
}));

    // 3. ソートとフィルタリング
    const now = Math.floor(Date.now() / 1000);
    const filteredStreams =
      allStreams
        .filter(v => {
    
          const start =
            Number(v.startTime);
    
          if (!start) {
            return false;
          }
    
          const twelveHours =
            12 * 60 * 60;
    
          return (
            start > now ||
            v.isLiveNow ||
            (now - start) < twelveHours
          );
        })
        .sort((a, b) => {
          return (
            Number(a.startTime)
            -
            Number(b.startTime)
          );
        });

    // 4. HTML生成
    const html = filteredStreams.length === 0 
      ? '<div class="card"><div class="title">配信情報が見つかりません</div></div>'
      : filteredStreams.map(v => {

          const start =
            Number(v.startTime);
        
          let statusText =
            "配信予定";
          
          let statusClass =
            "status-futurePlan";
          
          if (v.isLiveNow) {
          
            statusText =
              "配信中";
          
            statusClass =
              "status-now";
          
          }
          else if (start < now) {
          
            statusText =
              "配信終了";
          
            statusClass =
              "status-ended";
          }
          
          return `
            <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" class="card-link">
              <div class="card">
                <img class="thumb" src="${v.thumbnail}">
                <div class="card-bottom">
                  <div class="status ${statusClass}">${statusText}</div>
                  <div class="title">${v.title.replace(/</g, "&lt;")}</div>
                  <div class="name">${v.memberName}</div>
                  <div class="stream-date">
                    ${
                      new Date(start * 1000)
                        .toLocaleString(
                          "ja-JP",
                          {
                            timeZone: "Asia/Tokyo",
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }
                        )
                    }
                  </div>
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
