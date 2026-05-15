/* get-notion */
async function loadNotionData() {
    const container = document.getElementById('notion-content');

    try {
        // 自前のAPI窓口からデータを取得
        const response = await fetch('/api/get-notion');
        const data = await response.json();

        container.innerHTML = ''; // 読み込み中を消去

        data.forEach(page => {
            const props = page.properties;
            
            // プロパティの抽出
            const title = props["セクション名"]?.title[0]?.plain_text || "";
            const text = props["テキスト"]?.rich_text[0]?.plain_text || "";
            const url = props["URL"]?.url || "";

            // HTMLの組み立て
            const section = document.createElement('section');
            section.className = 'info-card';
            section.innerHTML = `
                <h2>${title}</h2>
                <p>${text.replace(/\n/g, '<br>')}</p>
                ${url ? `<a href="${url}" target="_blank">リンクを開く</a>` : ''}
            `;
            container.appendChild(section);
        });
    } catch (err) {
        container.innerHTML = '<p>読み込みに失敗しました。</p>';
        console.error(err);
    }
}

loadNotionData();

/* live */
fetch('/api/live')
  .then(res => res.text())
  .then(html => {
    document.getElementById('live').innerHTML = html;
  });

/* members */
fetch('/api/members')
  .then(res => res.text())
  .then(html => {
    document.getElementById('members').innerHTML = html;
  });
