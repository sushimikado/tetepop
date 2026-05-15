// リッチテキストをHTMLに変換する関数
function renderRichText(richTextArray) {
    return richTextArray.map(t => {
        let text = t.plain_text.replace(/\n/g, '<br>');
        
        // リンクがある場合
        if (t.href) {
            return `<a href="${t.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
        
        // 太字などの装飾も反映したい場合（必要なら）
        if (t.annotations.bold) text = `<b>${text}</b>`;
        if (t.annotations.italic) text = `<i>${text}</i>`;
        
        return text;
    }).join('');
}

async function loadNotionCMS() {
    try {
        const response = await fetch('/api/contents');
        const contents = await response.json();

        contents.forEach(item => {
            const target = document.getElementById(item.title);
            if (target) {
                // ★修正：renderRichText関数を使って本文を作る
                const bodyHtml = renderRichText(item.richText);
                
                target.innerHTML = `
                    <h2 class="item-title">${item.title}</h2>
                    <div class="item-body">
                        <p>${bodyHtml}</p>
                        ${item.url ? `<a href="${item.url}" class="link">Link</a>` : ''}
                    </div>
                `;
                target.classList.add('loaded');
            }
        });

        // 2. メンバー表の取得（特定の場所に決め打ちで入れる）
        const memberArea = document.getElementById('MEMBER-LIST');
        if (memberArea) {
            const memRes = await fetch('/api/members');
            const memHtml = await memRes.text();
            memberArea.innerHTML = memHtml;
        }

    } catch (error) {
        console.error("読み込みエラー:", error);
    }
}

loadNotionCMS();

