export default async function handler(req, res) {
  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const NOTION_MEMBERS_DATABASE_ID =
      process.env.NOTION_MEMBERS_DATABASE_ID;

    // 検索したいタグ
    // const KEYWORD = "#ててぽぷ";

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
      `https://api.notion.com/v1/databases/${NOTION_MEMBERS_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        }
      }
    );

    const notionData = await notionRes.json();

    // =========================
    // チャンネルID一覧
    // =========================
    const channels = notionData.results
      .map(page => {
        const p = page.properties;

        const name =
          (p["名前"]?.title || [])
            .map(t => t.plain_text || "")
            .join("")
            .trim();

        const channelId =
          p["YouTubeChannelID"]?.rich_text?.[0]?.plain_text || "";

        return {
          name,
          channelId
        };
      })
      .filter(v => v.channelId);

    // =========================
    // RSS取得
    // =========================
    const allStreams = [];

    await Promise.all(
      channels.map(async member => {
        try {
          const rssUrl =
            `https://www.youtube.com/feeds/videos.xml?channel_id=${member.channelId}`;

          const rssRes = await fetch(rssUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0"
            }
          });

          const xml = await rssRes.text();

          // entryごとに分割
          const entries = xml.split("<entry>");

          for (const entry of entries) {
            // タイトル
            const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
            const title = titleMatch?.[1]?.trim() || "";

            // キーワード判定
            // if (!title.includes(KEYWORD)) continue;

            // 動画ID
            const videoIdMatch = entry.match(
              /<yt:videoId>(.*?)<\/yt:videoId>/
            );

            const videoId = videoIdMatch?.[1]?.trim();

            if (!videoId) continue;

            // サムネ
            const thumbnail =
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            // 公開日時
            const publishedMatch = entry.match(
              /<published>(.*?)<\/published>/
            );

            const published =
              publishedMatch?.[1] || "";

            allStreams.push({
              memberName: member.name,
              title,
              videoId,
              thumbnail,
              published
            });
          }
        } catch (err) {
          console.error("RSS error:", member.channelId, err);
        }
      })
    );

    // =========================
    // 新しい順
    // =========================
    allStreams.sort((a, b) => {
      return new Date(b.published) - new Date(a.published);
    });

    // =========================
    // 最大30件
    // =========================
    const streams = allStreams.slice(0, 30);

    // =========================
    // HTML生成
    // =========================
    const html =
      streams.length === 0
        ? `
  <div class="card">
    <div class="thumb-empty">
      STANDBY
    </div>

    <div class="card-bottom">
      <span class="live-badge-empty">● INFO</span>

      <div class="title">
        条件に一致する配信枠が見つかりません
      </div>
    </div>
  </div>
`
        : `
<div class="grid">
${streams.map(v => `
  <a
    href="https://www.youtube.com/watch?v=${v.videoId}"
    target="_blank"
    class="card-link"
  >
    <div class="card">

      <img
        class="thumb"
        src="${v.thumbnail}"
        alt="${escapeHtml(v.title)}"
      >

      <div class="card-bottom">

        <span class="live-badge">
          ● YouTube
        </span>

        <div class="title">
          ${escapeHtml(v.title)}
        </div>

        <div class="yomi">
          ${escapeHtml(v.memberName)}
        </div>

      </div>
    </div>
  </a>
`).join("")}
</div>
`;

    // =========================
    // キャッシュ
    // =========================
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=59"
    );

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);

  } catch (e) {
    console.error(e);

    res.status(500).send(`
<div class="grid">
  <div class="card">
    <div class="thumb-empty">
      ERROR
    </div>

    <div class="card-bottom">
      <span class="live-badge-empty">● ERROR</span>

      <div class="title">
        stream-checker.js の実行に失敗しました
      </div>
    </div>
  </div>
</div>
`);
  }
}
