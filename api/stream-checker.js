export default async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "s-maxage=900, stale-while-revalidate=59"
  );

  res.setHeader(
    "Content-Type",
    "text/html"
  );

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

      const title =
        entry.match(/<title>(.*?)<\/title>/s)?.[1]?.trim()
        || "No Title";

      if (
        title.includes("#shorts")
      ) {
        continue;
      }

      const thumbnail =
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      allStreams.push({
        memberName: member.name,
        title,
        videoId,
        thumbnail,
        published
      });
    }
  } catch (e) { console.error("Error:", e); }
}));

const now = Date.now();

console.log(
  "ててぽぷ候補:",
  allStreams
    .filter(v =>
      v.title.includes("#ててぽぷ")
    )
    .map(v => ({
      title: v.title,
      videoId: v.videoId
    }))
);

const recentStreams =
  allStreams.filter(v => {

    if (!v.published)
      return false;

    const publishedTime =
      new Date(v.published).getTime();

    const isRecent =
      now - publishedTime
      <
      24 * 60 * 60 * 1000;

    // タイトルフィルター
    // const isTetepopu =
    //   v.title.includes("#ててぽぷ");

    return (
      isRecent
      // && isTetepopu
    );

  });

const allIds =
  recentStreams.map(v => v.videoId);

const detailsMap = {};

for (
  let i = 0;
  i < allIds.length;
  i += 50
) {

  const ids =
    allIds.slice(i, i + 50);

  console.log(
    "API request:",
    ids.length
  );

  const apiUrl =
    "https://www.googleapis.com/youtube/v3/videos"
    + "?part=liveStreamingDetails"
    + "&id=" + ids.join(",")
    + "&key=" + process.env.YOUTUBE_API_KEY;

  const apiRes =
    await fetch(apiUrl);

  const apiData =
    await apiRes.json();

  for (
    const item of
    (apiData.items || [])
  ) {

    console.log(
      item.id,
      item.liveStreamingDetails
    );

    detailsMap[item.id] = {

      scheduled:
        item.liveStreamingDetails
          ?.scheduledStartTime,

      actualStart:
        item.liveStreamingDetails
          ?.actualStartTime,

      actualEnd:
        item.liveStreamingDetails
          ?.actualEndTime
    };
  }
}

for (const stream of recentStreams) {

  const detail =
    detailsMap[stream.videoId];

  if (!detail) continue;

  stream.scheduledTime =
    detail.scheduled;

  stream.actualStartTime =
    detail.actualStart;

  stream.actualEndTime =
    detail.actualEnd;
}

console.log(
  "ended count:",
  recentStreams.filter(
    v => v.actualEndTime
  ).length
);

console.log(
  "scheduled count:",
  recentStreams.filter(
    v =>
      v.scheduledTime &&
      !v.actualStartTime
  ).length
);

console.log(
  "live count:",
  recentStreams.filter(
    v =>
      v.actualStartTime &&
      !v.actualEndTime
  ).length
);

console.log(
  "recentStreams:",
  recentStreams.length
);

console.log(
  recentStreams.slice(0, 20).map(v => ({
    title: v.title,
    videoId: v.videoId
  }))
);

// 3. ソートとフィルタリング
const filteredStreams =
  recentStreams
    .filter(v => {

      if (!v.scheduledTime)
        return false;

      // 配信終了
      if (v.actualEndTime) {

        const end =
          new Date(
            v.actualEndTime
          ).getTime();

        return (
          now - end
          <
          6 * 60 * 60 * 1000
        );
      }

      // 配信予定・配信中
      return true;
    })
  
    .sort((a, b) => {

      return (
        new Date(
          a.scheduledTime
        ).getTime()

        -

        new Date(
          b.scheduledTime
        ).getTime()
      );
    });
    
console.log(
  "filteredStreams:",
  filteredStreams.length
);

console.log(
  filteredStreams.map(v => ({
    title: v.title,
    status:
      v.actualEndTime
        ? "ended"
        : v.actualStartTime
        ? "live"
        : "scheduled"
  }))
);

// 4. HTML生成
const html = filteredStreams.length === 0 
  ? '<div class="card"><div class="title">配信情報が見つかりません</div></div>'
  : filteredStreams.map(v => {

      const scheduled =
        new Date(
          v.scheduledTime
        );
      
      let statusText =
        "● 配信予定";
      
      let statusClass =
        "status-futurePlan";
      
      if (
        v.actualStartTime
        &&
        !v.actualEndTime
      ) {
      
        statusText =
          "● 配信中";
      
        statusClass =
          "status-now";
      }
      
      if (
        v.actualEndTime
      ) {
      
        statusText =
          "● 配信終了";
      
        statusClass =
          "status-ended";
      }
      
      return `
        <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" class="card-link">
          <div class="card">
            <img class="thumb" src="${v.thumbnail}">
            <div class="card-bottom">
              <div class="status-and-date">
                <div class="${statusClass}">${statusText}</div>
                <div class="stream-date">
                  ${
                    scheduled.toLocaleString(
                      "ja-JP",
                      {
                        timeZone: "Asia/Tokyo",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      }
                    )
                    ～
                  }
                </div>
              </div>
              <div class="name">${v.memberName}</div>
              <div class="title">${v.title.replace(/</g, "&lt;")}</div>
            </div>
          </div>
        </a>
      `;
    }).join("");

    res.status(200).send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send("エラー");
  }
}
