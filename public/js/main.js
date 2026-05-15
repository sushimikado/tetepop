// NotionページID
const PAGE_ID = "358b6b10f3088162aa32f50b432cc510";

async function fetchNotionData() {
    const app = document.getElementById('notion-app');
    
    try {
        const response = await fetch(`https://notion-api.splitbee.io/v1/page/${PAGE_ID}`);
        if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
        
        const data = await response.json();
        console.log("Raw Data:", data); // デバッグ用

        app.innerHTML = '';

        // 1. データの正規化（.valueがある場合とない場合の両方に対応）
        const blocks = {};
        Object.keys(data).forEach(key => {
            // data[key].value があればそれを、なければ data[key] 自体を採用
            blocks[key.replace(/-/g, '')] = data[key].value || data[key];
        });

        // 2. ルートとなるページブロックを探す
        const rootId = PAGE_ID.replace(/-/g, '');
        let rootBlock = blocks[rootId];

        // もしIDで見つからなければ、typeが"page"のものを探す
        if (!rootBlock) {
            const pageKey = Object.keys(blocks).find(k => blocks[k].type === 'page');
            rootBlock = blocks[pageKey];
        }

        // 3. 表示処理
        // rootBlockのcontent（子要素IDリスト）がある場合はそれに従う、なければ全ブロックを表示
        const contentIds = rootBlock?.content || Object.keys(blocks);

        contentIds.forEach(id => {
            const blockId = id.replace(/-/g, '');
            const block = blocks[blockId];
            if (!block || block.type === 'page') return; // ページ自身はスキップ

            const type = block.type;
            const properties = block.properties;
            if (!properties && type !== 'image') return;

            // テキストの抽出
            const text = properties?.title ? properties.title.map(t => t[0]).join('') : '';

            const element = document.createElement('div');
            element.className = `notion-block notion-${type}`;

            switch (type) {
                case 'header':
                    element.innerHTML = `<h2 class="notion-h1">${text}</h2>`;
                    break;
                case 'sub_header':
                    element.innerHTML = `<h3 class="notion-h2">${text}</h3>`;
                    break;
                case 'sub_sub_header':
                    element.innerHTML = `<h4 class="notion-h3">${text}</h4>`;
                    break;
                case 'text':
                    element.innerHTML = text ? `<p class="notion-text">${text}</p>` : `<br>`;
                    break;
                case 'image':
                    const rawUrl = block.format?.display_source || properties?.source?.[0]?.[0];
                    if (rawUrl) {
                        // Notionの画像URLをブラウザで表示可能な形式に変換
                        let imgUrl = rawUrl;
                        if (rawUrl.startsWith("/")) {
                            imgUrl = `https://www.notion.so${rawUrl}`;
                        }
                        element.innerHTML = `<img src="${imgUrl}" class="notion-image" style="width:100%; max-width:600px; display:block; margin:20px auto; border-radius:8px;">`;
                    }
                    break;
                case 'bulleted_list':
                    element.innerHTML = `<ul class="notion-list"><li>${text}</li></ul>`;
                    break;
                default:
                    // 未対応のものは無視するか、ログを出す
                    break;
            }
            app.appendChild(element);
        });

        if (app.innerHTML === '') {
            app.innerHTML = '<p>表示できるコンテンツが見つかりませんでした。</p>';
        }

    } catch (error) {
        console.error("Error:", error);
        app.innerHTML = `<p>エラーが発生しました: ${error.message}</p>`;
    }
}

fetchNotionData();
