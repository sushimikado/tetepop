export default async function handler(req, res) {
  try {

    const NOTION_TOKEN =
      process.env.NOTION_TOKEN;

    const NOTION_MEMBERS_DATABASE_ID =
      process.env.NOTION_MEMBERS_DATABASE_ID;

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

    const notionData =
      await notionRes.json();

    // =========================
    // チャンネル一覧
    // =========================

    const channels =
      notionData.results
        .map(page => {

          const p =
            page.properties;

          const name =
            (p["名前"]?.title || [])
              .map(t => t.plain_text || "")
              .join("")
              .trim();

          const channelId =
            p["YouTubeChannelID"]
              ?.rich_text?.[0]
              ?.plain_text || "";

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

          const rssRes =
            await fetch(rssUrl);

          const xml =
            await rssRes.text();

          const entries =
            xml.split("<entry>");

          for (const entry of entries) {

            const titleMatch =
              entry.match(
                /<title>(.*?)<\/title>/s
              );

            const title =
              titleMatch?.[1]?.trim() || "";

            const videoIdMatch =
              entry.match(
                /<yt:videoId>(.*?)<\/yt:videoId>/
              );

            const videoId =
              videoIdMatch?.[1]?.trim();

            if (!videoId) continue;

            // =========================
            // 動画ページ取得
            // =========================

            let startTime = null;

            try {

              const watchRes =
                await fetch(
                  `https://www.youtube.com/watch?v=${videoId}`,
                  {
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0"
                    }
                  }
                );

              const watchHtml =
                await watchRes.text();

              // scheduledStartTime
              const scheduledMatch =
                watchHtml.match(
                  /"scheduledStartTime":"(\d+)"/
                );

              // actualStartTime
              const actualMatch =
                watchHtml.match(
                  /"actualStartTime":"(\d+)"/
                );

              const unix =
                scheduledMatch?.[1]
                || actualMatch?.[1];

              if (unix) {
                startTime =
                  new Date(
                    Number(unix) * 1000
                  );
              }

            } catch (e) {
              console.error(
                "watch fetch error",
                videoId
              );
            }

            if (!startTime) continue;

            // =========================
            // おととい以前除外
            // =========================

            const now =
              new Date();

            const border =
              new Date();

            border.setDate(
              border.getDate() - 2
            );

            if (startTime < border) {
              continue;
            }

            allStreams.push({

              memberName:
                member.name,

              title,

              videoId,

              thumbnail:
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

              startTime
            });
          }

        } catch (err) {

          console.error(
            "RSS error:",
            member.channelId,
            err
          );
        }
      })
    );

    // =========================
    // 開始時刻順
    // =========================

    allStreams.sort((a, b) => {
      return a.startTime - b.startTime;
    });

    // =========================
    // 日付グループ
    // =========================

    const yesterday = [];
    const today = [];
    const tomorrow = [];

    const now =
      new Date();

    function dateKey(d) {
      return (
        d.getFullYear() +
        "-" +
        (d.getMonth() + 1) +
        "-" +
        d.getDate()
      );
    }

    const todayKey =
      dateKey(now);

    const y =
      new Date();

    y.setDate(
      y.getDate() - 1
    );

    const yesterdayKey =
      dateKey(y);

    const t =
      new Date();

    t.setDate(
      t.getDate() + 1
    );

    const tomorrowKey =
      dateKey(t);

    for (const stream of allStreams) {

      const key =
        dateKey(stream.startTime);

      if (key === yesterdayKey) {
        yesterday.push(stream);
      }

      else if (key === todayKey) {
        today.push(stream);
      }

      else if (key === tomorrowKey) {
        tomorrow.push(stream);
      }
    }

    // =========================
    // カード生成
    // =========================

    function renderGroup(
      label,
      items
    ) {

      if (items.length === 0) {
        return "";
      }

      return `

<div class="schedule-group">

  <h3 class="schedule-title">
    ${label}
  </h3>

  ${items.map(v => {

    const d =
      v.startTime;

    const hh =
      String(
        d.getHours()
      ).padStart(2, "0");

    const mm =
      String(
        d.getMinutes()
      ).padStart(2, "0");

    return `

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
        ${hh}:${mm}
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
`;
  }).join("")}

</div>
`;
    }

    const html = `
${renderGroup("昨日", yesterday)}
${renderGroup("今日", today)}
${renderGroup("明日", tomorrow)}
`;

    // =========================
    // キャッシュ
    // =========================

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=59"
    );

    res.setHeader(
      "Content-Type",
      "text/html"
    );

    res.status(200).send(html);

  } catch (e) {

    console.error(e);

    res.status(500).send(`
<div class="card">
  ERROR
</div>
`);
  }
}
