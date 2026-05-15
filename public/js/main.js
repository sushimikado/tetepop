const PAGE_ID = "358b6b10f3088162aa32f50b432cc510";

async function fetchNotionData() {
    const app = document.getElementById("notion-app");

    try {
        const response = await fetch(
            `https://notion-api.splitbee.io/v1/page/${PAGE_ID}`
        );

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }

        const data = await response.json();

        app.innerHTML = "";

        // ブロックを正規化
        const blocks = {};

        Object.keys(data).forEach((key) => {
            const cleanKey = key.replace(/-/g, "");
            blocks[cleanKey] = data[key];
        });

        const targetId = PAGE_ID.replace(/-/g, "");

        // root block取得
        const rootRaw = blocks[targetId];

        if (!rootRaw) {
            console.error("Root block not found");
            app.innerHTML = "<p>ページが見つかりません。</p>";
            return;
        }

        // valueを取得
        const rootBlock = rootRaw.value || rootRaw;

        // content取得
        const contentIds = rootBlock.content || [];

        if (!contentIds.length) {
            app.innerHTML =
                "<p>ページはありますが、中身（ブロック）が空のようです。</p>";
            return;
        }

        // ブロック描画
        contentIds.forEach((id) => {
            const cleanId = id.replace(/-/g, "");

            const rawBlock = blocks[cleanId];

            if (!rawBlock) return;

            const block = rawBlock.value || rawBlock;

            const type = block.type;
            const properties = block.properties || {};

            const text = properties.title
                ? properties.title.map((t) => t[0]).join("")
                : "";

            const element = document.createElement("div");
            element.className = `notion-block notion-${type}`;

            switch (type) {
                case "header":
                    element.innerHTML = `<h2>${text}</h2>`;
                    break;

                case "sub_header":
                    element.innerHTML = `<h3>${text}</h3>`;
                    break;

                case "sub_sub_header":
                    element.innerHTML = `<h4>${text}</h4>`;
                    break;

                case "text":
                    element.innerHTML = text
                        ? `<p>${text}</p>`
                        : "<br>";
                    break;

                case "bulleted_list":
                    element.innerHTML = `<ul><li>${text}</li></ul>`;
                    break;

                case "numbered_list":
                    element.innerHTML = `<ol><li>${text}</li></ol>`;
                    break;

                case "image": {
                    const rawUrl =
                        block.format?.display_source ||
                        properties?.source?.[0]?.[0];

                    if (rawUrl) {
                        let imgUrl = rawUrl;

                        if (rawUrl.startsWith("/")) {
                            imgUrl = `https://www.notion.so${rawUrl}`;
                        }

                        element.innerHTML = `
                            <img 
                                src="${imgUrl}" 
                                alt=""
                                class="notion-image"
                                style="
                                    max-width:100%;
                                    border-radius:8px;
                                    margin:1em 0;
                                "
                            >
                        `;
                    }

                    break;
                }

                case "callout": {
                    const icon = block.format?.page_icon || "💡";

                    element.innerHTML = `
                        <div style="
                            padding:15px;
                            background:#f3f3f3;
                            border-radius:8px;
                            display:flex;
                            gap:10px;
                            margin:1em 0;
                        ">
                            <span>${icon}</span>
                            <span>${text}</span>
                        </div>
                    `;
                    break;
                }

                default:
                    if (text) {
                        element.innerHTML = `<p>${text}</p>`;
                    }
                    break;
            }

            app.appendChild(element);
        });

        // タイトル設定
        const pageTitle =
            rootBlock.properties?.title?.[0]?.[0];

        if (pageTitle) {
            document.title = pageTitle;
        }
    } catch (error) {
        console.error(error);

        app.innerHTML = `
            <p>
                エラーが発生しました:<br>
                ${error.message}
            </p>
        `;
    }
}

fetchNotionData();
