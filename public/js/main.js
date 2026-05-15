const PAGE_ID = "358b6b10f3088162aa32f50b432cc510";

async function fetchNotionData() {
    const app = document.getElementById('notion-app');
    
    try {
        const response = await fetch(`https://notion-api.splitbee.io/v1/page/${PAGE_ID}`);
        if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
        
        const data = await response.json();
        app.innerHTML = '';

        // 1. 全てのキーからハイフンを取り除いた新しいオブジェクトを作る（比較を確実にするため）
        const normalizedBlocks = {};
        Object.keys(data).forEach(key => {
            const cleanKey = key.replace(/-/g, '');
            normalizedBlocks[cleanKey] = data[key].value || data[key];
        });

        const targetId = PAGE_ID.replace(/-/g, '');
        const rootBlock = normalizedBlocks[targetId];

        if (!rootBlock) {
            console.error("Root block not found. IDs in data:", Object.keys(normalizedBlocks));
            app.innerHTML = '<p>指定されたページIDがデータ内に見つかりません。</p>';
            return;
        }

        // 2. ページ内のコンテンツIDリストを取得
        const contentIds = rootBlock.content || [];

        if (contentIds.length === 0) {
            app.innerHTML = '<p>ページはありますが、中身（ブロック）が空のようです。</p>';
            return;
        }

        // 3. 各ブロックをループして描画
        contentIds.forEach(id => {
            const cleanId = id.replace(/-/g, '');
            const block = normalizedBlocks[cleanId];
            if (!block) return;

            const type = block.type;
            const properties = block.properties;
            
            // テキスト抽出
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
                        let imgUrl = rawUrl;
                        // Notion内の画像ならプロキシ経由のURLに変換（簡易版）
                        if (rawUrl.startsWith("/")) {
                            imgUrl = `https://www.notion.so${rawUrl}`;
                        }
                        element.innerHTML = `<img src="${imgUrl}" class="notion-image" style="width:100%; border-radius:8px; margin:1em 0;">`;
                    }
                    break;
                case 'bulleted_list':
                    element.innerHTML = `<ul class="notion-list"><li>${text}</li></ul>`;
                    break;
                case 'callout':
                    const icon = block.format?.page_icon || '💡';
                    element.innerHTML = `<div class="notion-callout" style="padding:15px; background:#f1f1f1; border-radius:5px; display:flex; gap:10px;"><span>${icon}</span><span>${text}</span></div>`;
                    break;
                default:
                    // 知らないタイプはとりあえずテキストとして出す
                    if(text) element.innerHTML = `<p class="notion-other">${text}</p>`;
                    break;
            }
            app.appendChild(element);
        });

        // ページタイトルを反映
        const pageTitle = rootBlock.properties?.title?.[0]?.[0];
        if (pageTitle) document.title = pageTitle;

    } catch (error) {
        console.error("Error:", error);
        app.innerHTML = `<p>エラーが発生しました: ${error.message}</p>`;
    }
}

fetchNotionData();
