// api/get-notion.js
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_TEXT_DATABASE_ID;

export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    // ブラウザへデータを送る
    res.status(200).json(response.results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}