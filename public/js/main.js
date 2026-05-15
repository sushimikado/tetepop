// NotionページID
const PAGE_ID = "358b6b10f3088162aa32f50b432cc510";

async function fetchNotionData() {
    const app = document.getElementById('notion-app');
    
    try {
        const response = await fetch(`https://notion-api.splitbee.io/v1/page/${PAGE_ID}`);
        if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
        
        const data = await response.json();
        console.log("全データ構造:", data); // 中身を詳しく見るため

        app.innerHTML = '';

        // Notionのデータは各ブロックがIDをキーとしたオブジェクトになっています
        const blockIds = Object.keys(data);
        
        if (blockIds.length === 0) {
            app.innerHTML = '<p>ページが空か、公開設定がされていません。</p>';
            return;
        }

        blockIds.forEach(key => {
            const block = data[key].value;
            if (!block || !block.properties) return;

            const type = block.type;
            // Notionのテキストデータは複雑な配列になっているので安全に取得
            const text = block.properties.title ? block.properties.title.map(t => t[0]).join('') : '';

            const element = document.createElement('div');
            element.className = `notion-block notion-${type}`;

            switch (type) {
                case 'page':
                    element.innerHTML = `<h1 class="notion-title">${text}</h1>`;
                    break;
                case 'header': // Heading 1
                    element.innerHTML = `<h2 class="notion-h1">${text}</h2>`;
                    break;
                case 'sub_header': // Heading 2
                    element.innerHTML = `<h3 class="notion-h2">${text}</h3>`;
                    break;
                case 'sub_sub_header': // Heading 3
                    element.innerHTML = `<h4 class="notion-h3">${text}</h4>`;
                    break;
                case 'text':
                    element.innerHTML = `<p class="notion-text">${text}</p>`;
                    break;
                case 'bulleted_list':
                case 'numbered_list':
                    element.innerHTML = `<li class="notion-list-item">${text}</li>`;
                    break;
                case 'image':
                    const imgUrl = block.format?.display_source || (block.properties.source ? block.properties.source[0][0] : '');
                    if (imgUrl) {
                        // Notionの画像URLを変換（プロキシ経由などが必要な場合がありますが一旦そのまま）
                        element.innerHTML = `<img src="${imgUrl}" class="notion-image" style="width:100%">`;
                    }
                    break;
                default:
                    console.log("未対応のブロックタイプ:", type);
                    break;
            }
            app.appendChild(element);
        });

    } catch (error) {
        console.error("エラー発生:", error);
        app.innerHTML = `<p>エラーが発生しました。詳細はコンソールを確認してください。</p>`;
    }
}

fetchNotionData();
