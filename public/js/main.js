async function loadNotionCMS() {
    try {
        // 1. contentsデータの取得
        const response = await fetch('/api/contents');
        const contents = await response.json();

        contents.forEach(item => {
            // Notionの「セクション名」と一致するIDの要素を探す
            const target = document.getElementById(item.title);
            
            if (target) {
                // その場所にHTMLを流し込む
                target.innerHTML = `
                    <h2 class="item-title">${item.title}</h2>
                    <div class="item-body">
                        <p>${item.text.replace(/\n/g, '<br>')}</p>
                        ${item.url ? `<a href="${item.url}" class="link">Link</a>` : ''}
                    </div>
                `;
                // 成功したらクラスを付与してデザインを当てやすくする
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
