// あなたのNotionページID
const PAGE_ID = "358b6b10f3088162aa32f50b432cc510";

async function fetchNotionData() {
    const app = document.getElementById('notion-app');
    
    try {
        // 公開されているNotionページをJSONで取得できる無料APIを利用
        const response = await fetch(`https://notion-api.splitbee.io/v1/page/${PAGE_ID}`);
        if (!response.ok) throw new Error('データの取得に失敗しました');
        
        const data = await response.json();
        
        // 読み込み中表示を消す
        app.innerHTML = '';

        // ブロックごとにループしてHTMLを作成
        Object.keys(data).forEach(key => {
            const block = data[key].value;
            if (!block || !block.properties) return;

            const type = block.type;
            const text = block.properties.title ? block.properties.title[0][0] : '';

            const element = document.createElement('div');

            // ブロックタイプに合わせてHTML要素を生成
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
                    const imgUrl = block.format?.display_source || block.properties.source[0][0];
                    element.innerHTML = `<img src="${imgUrl}" class="notion-image">`;
                    break;
            }
            app.appendChild(element);
        });

    } catch (error) {
        app.innerHTML = `<p>エラーが発生しました: ${error.message}</p>`;
    }
}

fetchNotionData();