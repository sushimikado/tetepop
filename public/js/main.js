// NotionページID
const PAGE_ID = "358b6b10f3088162aa32f50b432cc510";

async function fetchNotionData() {
    const app = document.getElementById('notion-app');
    console.log("Fetching data for:", PAGE_ID); // デバッグ用

    try {
        const response = await fetch(`https://notion-api.splitbee.io/v1/page/${PAGE_ID}`);
        
        if (!response.ok) {
            throw new Error(`HTTPエラー! ステータス: ${response.status}`);
        }

        const data = await response.json();
        console.log("取得したデータ:", data); // ここで中身をチェック！

        // データが空（{}）の場合の処理
        if (Object.keys(data).length === 0) {
            app.innerHTML = '<p>データが空です。Notionの公開設定を確認してください。</p>';
            return;
        }

        app.innerHTML = '';

        Object.keys(data).forEach(key => {
            const block = data[key].value;
            if (!block || !block.properties) return;

            const type = block.type;
            const textArray = block.properties.title;
            const text = textArray ? textArray[0][0] : '';

            const element = document.createElement('div');

            switch (type) {
                case 'page':
                    element.innerHTML = `<h1 class="notion-title">${text}</h1>`;
                    break;
                case 'header':
                    element.innerHTML = `<h2 class="notion-h1">${text}</h2>`;
                    break;
                case 'sub_header':
                    element.innerHTML = `<h3 class="notion-h2">${text}</h3>`;
                    break;
                case 'text':
                    element.innerHTML = `<p class="notion-text">${text}</p>`;
                    break;
                case 'image':
                    const imgUrl = block.format?.display_source || (block.properties.source ? block.properties.source[0][0] : '');
                    if (imgUrl) {
                        element.innerHTML = `<img src="${imgUrl}" class="notion-image">`;
                    }
                    break;
            }
            app.appendChild(element);
        });

    } catch (error) {
        console.error("エラー詳細:", error);
        app.innerHTML = `<p>エラーが発生しました: ${error.message}</p>`;
    }
}

fetchNotionData();
