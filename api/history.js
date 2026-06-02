export default async function handler(req, res) {

  try {

    function escapeHtml(str) {

      if (!str) return "";

      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    const notionRes =
      await fetch(
        `https://api.notion.com/v1/databases/${process.env.NOTION_HISTORY_DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${process.env.NOTION_TOKEN}`,
            "Content-Type":
              "application/json",
            "Notion-Version":
              "2022-06-28"
          }
        }
      );

    const data =
      await notionRes.json();

    const items =
      data.results.map(page => {

        const p =
          page.properties;

        const title =
          p["タイトル"]
            ?.title
            ?.map(t => t.plain_text)
            .join("")
            || "";

        const url =
          p["URL"]?.url || "";

        const dateProp =
          p["日付"]?.date;

        const startDate =
          dateProp?.start || "";

        const endDate =
          dateProp?.end || "";

        let image = "";

        const file =
          p["画像"]?.files?.[0];

        if (file) {

          image =
            file.type === "external"
              ? file.external.url
              : file.file.url;
        }

        return {
          title,
          image,
          url,
          startDate,
          endDate
        };
      });

    // =========================
    // 日付表示
    // =========================
    function formatPeriod(
      start,
      end
    ) {

      if (!start) return "";

      const startDate =
        new Date(start);

      const startYear =
        startDate.getFullYear();

      const startText =
        `${startYear}.` +
        `${String(startDate.getMonth() + 1).padStart(2, "0")}.` +
        `${String(startDate.getDate()).padStart(2, "0")}`;

      if (!end) {
        return startText;
      }

      const endDate =
        new Date(end);

      const endYear =
        endDate.getFullYear();

      const endText =
        startYear === endYear

          // 同じ年なら年を省略
          ? `${String(endDate.getMonth() + 1).padStart(2, "0")}.` +
            `${String(endDate.getDate()).padStart(2, "0")}`

          // 違う年ならフル表示
          : `${endYear}.` +
            `${String(endDate.getMonth() + 1).padStart(2, "0")}.` +
            `${String(endDate.getDate()).padStart(2, "0")}`;

      if (
        startDate.getTime()
        ===
        endDate.getTime()
      ) {
        return startText;
      }

      return `${startText} ～ ${endText}`;
    }

    // =========================
    // 開始日昇順
    // =========================
    items.sort((a, b) =>
      new Date(a.startDate)
      -
      new Date(b.startDate)
    );

    // =========================
    // HTML生成
    // =========================
    const html =
      items.map(item => `

    <a
      href="${item.url || "#"}"
      target="_blank"
      rel="noopener noreferrer"
      class="history-card"
    >
      <div class="history-image">
        ${
          item.image
            ? `<img
                src="${item.image}"
                alt="${escapeHtml(item.title)}"
              >`
            : ""
        }
      </div>

      <div class="history-info">
        <div class="history-title">
          ${escapeHtml(item.title)}
        </div>
        <div class="history-date">
          ${formatPeriod(
            item.startDate,
            item.endDate
          )}
        </div>
      </div>
    </a>

    `).join("");

        res.setHeader(
          "Content-Type",
          "text/html"
        );

        res.status(200).send(html);

  } catch (e) {

    console.error(
      "history error:",
      e
    );

    res.status(500).send(
      "history error"
    );
  }
}
