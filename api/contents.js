export default async function handler(req, res) {
  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const DATABASE_ID = process.env.NOTION_TEXT_DATABASE_ID;

    const notionRes = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      }
    });

    const data = await notionRes.json();

    const contents = data.results.map(page => {
      const p = page.properties;
      return {
        title: p["セクション名"]?.title?.[0]?.plain_text || "",
        titleJa: p["セクション名日本語"]?.rich_text?.[0]?.plain_text || "",
        richText: p["テキスト"]?.rich_text || [],
        url: p["URL"]?.url || ""
      };
    });

    // JSONとしてデータを返す
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(contents);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
