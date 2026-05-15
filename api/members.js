export default async function handler(req, res) {
  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const NOTION_MEMBERS_DATABASE_ID = process.env.NOTION_MEMBERS_DATABASE_ID;
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    function escapeHtml(str) {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    const notionRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_MEMBERS_DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      }
    });

    const notionData = await notionRes.json();

    const channelIds = notionData.results
      .map(page => {
        const prop = page.properties["YouTubeChannelID"];
        if (!prop || !prop.rich_text || prop.rich_text.length === 0) return null;
        return prop.rich_text[0].plain_text;
      })
      .filter(Boolean);

    const results = [];

    for (const channelId of channelIds) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;

      const r = await fetch(url);
      const data = await r.json();

      if (data.items && data.items.length > 0) {
        const v = data.items[0];

        results.push({
          title: v.snippet?.title || "",
          url: `https://youtube.com/watch?v=${v.id?.videoId || ""}`,
          thumbnail: v.snippet?.thumbnails?.medium?.url || ""
        });
      }
    }

    const cards = results.map(v => {
      const title = escapeHtml(v.title);

      return `
<a class="card-link" href="${v.url}" target="_blank">
  <div class="card">
    <img class="thumb" src="${v.thumbnail}">
    <div class="content">
      <span class="live-badge">● YouTube</span>
      <div class="title">${title}</div>
    </div>
  </div>
</a>
`;
    }).join("");

const html = `
    ${
      results.length === 0
      
        ? `<div class="card">
              <div class="thumb-empty">STANDBY</div>
              <div class="card-bottom">
                <span class="live-badge-empty">● INFO</span>
                <div class="title">配信中の参加者がここに表示されます</div>
              </div>
          </div>
      
        <div class="card">
              <div class="thumb-empty">STANDBY</div>
              <div class="card-bottom">
                <span class="live-badge-empty">● INFO</span>
                <div class="title">API制限により情報が取得されない場合があります</div>
              </div>
          </div>`
      
        : cards
    }
`;
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
