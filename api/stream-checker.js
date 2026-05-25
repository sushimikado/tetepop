import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const DATABASE_ID = process.env.NOTION_MEMBERS_DATABASE_ID;

    const HASHTAG = "#ててぽぷ";

    function escapeHtml(str) {
      if (!str) return "";

      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // =========================
    // Notion取得
    // =========================

    const notionRes = await fetch(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        }
      }
    );

    const notionData = await notionRes.json();

    const channelIds = notionData.results
      .map(page => {
        const prop = page.properties["YouTubeChannelID"];

        if (!prop?.rich_text?.length) return null;

        return prop.rich_text[0].plain_text.trim();
      })
      .filter(id => id && id.startsWith("UC"));

    // =========================
    // RSS取得
    // =========================

    const parser = new XMLParser({
      ignoreAttributes: false
    });

    const allVideos = [];

    await Promise.all(
      channelIds.map(async channelId => {
        try {
          const rssUrl =
            `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

          const rssText = await fetch(rssUrl, {
            cache: "no-store"
          }).then(r => r.text());

          const rss = parser.parse(rssText);

          const entries = rss.feed?.entry || [];

          const arrayEntries = Array.isArray(entries)
            ? entries
            : [entries];

          for (const entry of arrayEntries) {
            const title = entry.title || "";

            // ハッシュタグ判定
            if (!title.includes(HASHTAG)) continue;

            const videoId =
              entry["yt:videoId"];

            const published =
              entry.published || "";

            const author =
              entry.author?.name || "";

            allVideos.push({
              title,
              videoId,
              published,
              author,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail:
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            });
          }
        } catch (e) {
          console.error("RSS ERROR:", channelId, e);
        }
      })
    );

    // =========================
    // 日時順ソート
    // =========================

    allVideos.sort((a, b) => {
      return new Date(a.published) - new Date(b.published);
    });

    // 重複除去
    const uniqueVideos = Array.from(
      new Map(
        allVideos.map(v => [v.videoId, v])
      ).values()
    );

    // =========================
    // HTML
    // =========================

    const html = `
<html>
<head>

<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<style>

:root {
  --text-color-1: #523f31;
  --text-color-2: #755a46;
}

body {
  margin: 0;
  padding: 16px;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  background: transparent;
}

.grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    2px 2px 8px rgba(0,0,0,0.08);
  transition:
    transform 0.15s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow:
    4px 6px 16px rgba(0,0,0,0.12);
}

.card-link {
  text-decoration: none;
  color: inherit;
}

.thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.card-bottom {
  padding: 12px 16px 16px;
}

.badge {
  display: inline-block;
  background: #ff3b30;
  color: white;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
}

.title {
  font-size: 13px;
  line-height: 1.6;
  font-weight: 600;

  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;

  overflow: hidden;
}

.author {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-color-2);
}

.date {
  margin-top: 4px;
  font-size: 11px;
  color: #888;
}

.empty-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  box-shadow:
    2px 2px 8px rgba(0,0,0,0.08);
}

</style>
</head>

<body>

${
  uniqueVideos.length === 0
    ? `
<div class="empty-card">
  現在予定されている配信はありません
</div>
`
    : `
<div class="grid">

${uniqueVideos.map(v => {

  const date = new Date(v.published);

  const jpDate =
    date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  return `
<a
  class="card-link"
  href="${v.url}"
  target="_blank"
>

<div class="card">

<img
  class="thumb"
  src="${v.thumbnail}"
>

<div class="card-bottom">

<div class="badge">
  YouTube
</div>

<div class="title">
  ${escapeHtml(v.title)}
</div>

<div class="author">
  ${escapeHtml(v.author)}
</div>

<div class="date">
  ${jpDate}
</div>

</div>
</div>
</a>
`;

}).join("")}

</div>
`
}

</body>
</html>
`;

    // =========================
    // Cache
    // =========================

    res.setHeader(
      "Cache-Control",
      "s-maxage=900, stale-while-revalidate=300"
    );

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    res.status(200).send(html);

  } catch (e) {
    console.error(e);

    res.status(500).send(`
      <pre>${e.message}</pre>
    `);
  }
}
