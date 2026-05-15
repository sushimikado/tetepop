// NotionページID
const PAGE_ID = "358b6b10f3088162aa32f50b432cc510";

async function fetchNotionData() {
    const app = document.getElementById('notion-app');
    
    try {
        const response = await fetch(`https://notion-api.splitbee.io/v1/page/${PAGE_ID}`);
        if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
        
        const data = await response.json();
        app.innerHTML = '';

        // 1. ページのメインブロックを特定（IDが一致するもの、もしくはtypeがpageのもの）
        // IDはハイフンなしで来る場合があるため、正規化して探します
        const rootKey = Object.keys(data).find(key => key.replace(/-/g, '') === PAGE_ID.replace(/-/g, ''));
        const rootBlock = data[rootKey]?.value;

        if (!rootBlock || !rootBlock.content) {
            console.error("ページの中身が見つかりません。rootBlock:", rootBlock);
            app.innerHTML = '<p>データ構造が想定外です。コンソールを確認してください。</p>';
            return;
        }

        // 2. rootBlock.content に入っている「IDのリスト」順に描画する
        rootBlock.content.forEach(blockId => {
            const block = data[blockId]?.value;
            if (!block) return;

            const type = block.type;
            // テキスト抽出（入れ子配列を平滑化）
            const text = block.properties?.title ? block.properties.title.map(t => t[0]).join('') : '';

            const element = document.createElement('div');
            element.className = `notion-block notion-${type}`;

            switch (type) {
                case 'header': // 見出し1
                    element.innerHTML = `<h2 class="notion-h1">${text}</h2>`;
                    break;
                case 'sub_header': // 見出し2
                    element.innerHTML = `<h3 class="notion-h2">${text}</h3>`;
                    break;
                case 'sub_sub_header': // 見出し3
                    element.innerHTML = `<h4 class="notion-h3">${text}</h4>`;
                    break;
                case 'text':
                    if (text) {
                        element.innerHTML = `<p class="notion-text">${text}</p>`;
                    } else {
                        element.innerHTML = `<br>`; // 空行
                    }
                    break;
                case 'image':
                    const imgUrl = block.format?.display_source || block.properties?.source?.[0]?.[0];
                    if (imgUrl) {
                        // Notionの画像URLは署名付きURLに変換される
                        const finalImgUrl = imgUrl.startsWith("http") ? imgUrl : `https://www.notion.so/image/${encodeURIComponent(imgUrl)}?table=block&id=${block.id}`;
                        element.innerHTML = `<img src="${finalImgUrl}" class="notion-image" style="width:100%; max-width:600px; display:block; margin:20px auto;">`;
                    }
                    break;
                case 'bulleted_list':
                    element.innerHTML = `<ul class="notion-list"><li>${text}</li></ul>`;
                    break;
                default:
                    console.log("スキップしたブロックタイプ:", type);
                    break;
            }
            app.appendChild(element);
        });

        // ページタイトルをHTMLのtitleタグに反映
        const pageTitle = rootBlock.properties?.title?.[0]?.[0];
        if (pageTitle) document.title = pageTitle;

    } catch (error) {
        console.error("エラー詳細:", error);
        app.innerHTML = `<p>エラーが発生しました: ${error.message}</p>`;
    }
}

fetchNotionData();
