async function fetchContents() {
    const container = document.getElementById('content-list');
    
    try {
        const response = await fetch('/api/contents');
        const data = await response.json();

        container.innerHTML = ''; // 読み込み中の表示をクリア

        data.forEach(item => {
            // セクション用のHTML構造を組み立て
            const section = document.createElement('section');
            section.className = 'notion-item';

            section.innerHTML = `
                <h2 class="item-title">${item.title}</h2>
                <p class="item-text">${item.text.replace(/\n/g, '<br>')}</p>
                ${item.url ? `<a href="${item.url}" target="_blank" class="item-link">詳細リンク</a>` : ''}
            `;

            container.appendChild(section);
        });
    } catch (error) {
        container.innerHTML = '<p>データの取得に失敗しました。</p>';
    }
}

// ページ読み込み時に実行
fetchContents();
