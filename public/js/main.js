// リッチテキストをHTMLに変換する関数
function renderRichText(richTextArray) {
    return richTextArray.map(t => {
        let text = t.plain_text.replace(/\n/g, '<br>');
        
        // リンクがある場合
        if (t.href) {
            return `<a href="${t.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
        // 太字などの装飾も反映したい場合
        if (t.annotations.bold) text = `<b>${text}</b>`;
        if (t.annotations.italic) text = `<i>${text}</i>`;
        
        return text;
    }).join('');
}

// notionCMSを取ってくる
async function loadNotionCMS() {
    try {
        // main.js の一時的な書き換え
        // const response = await fetch('/test-data.json'); // ←ローカルのファイルを見る
        const response = await fetch('/api/contents'); // ←本番環境
        const contents = await response.json();

        contents.forEach(item => {
            const jaTitle = item.sectionJa || item.titleJa || ""; 

            // 1. 英語タイトル（セクション名）の流し込み
            const titleTarget = document.querySelector(`[data-cms-title="${item.title}"]`);
            if (titleTarget) {
                titleTarget.textContent = item.title;
            }

            // ★ここを追加：ナビゲーション用の流し込み
            const navTarget = document.querySelector(`[data-cms-nav="${item.title}"]`);
            if (navTarget) {
                navTarget.textContent = item.title;
            }

            // 2. 日本語タイトルの流し込み
            const jaTarget = document.querySelector(`[data-cms-titleJa="${item.title}"]`);
            if (jaTarget && jaTitle) {
                jaTarget.textContent = jaTitle;
            }

            // 3. 本文（テキスト）の流し込み
            const textTarget = document.querySelector(`[data-cms-text="${item.title}"]`);
            if (textTarget) {
                if (item.richText.length > 0) {
                    textTarget.innerHTML = renderRichText(item.richText);
                    textTarget.style.display = ''; 
                } else {
                    textTarget.style.display = 'none'; 
                }
            }

            // 4. URL（X埋め込み等）の流し込み
            const urlTarget = document.querySelector(`[data-cms-url="${item.title}"]`);
            if (urlTarget) {
                if (item.url) {
                    if (item.url.includes('x.com') || item.url.includes('twitter.com')) {
                        urlTarget.innerHTML = `
                            <div class="x-embed">
                                <blockquote class="twitter-tweet"><a href="${item.url}"></a></blockquote>
                            </div>`;
                    } else {
                        urlTarget.innerHTML = `<a href="${item.url}" class="link" target="_blank">Link</a>`;
                    }
                    urlTarget.style.display = '';
                    
                    if (window.twttr && window.twttr.widgets) {
                        window.twttr.widgets.load(urlTarget);
                    }
                } else {
                    urlTarget.style.display = 'none';
                }
            }
        });

        // 2. メンバー表の取得
        const memberArea = document.getElementById('MEMBER-LIST');
        if (memberArea) {
            const memRes = await fetch('/api/members');
            const memHtml = await memRes.text();
            memberArea.innerHTML = memHtml;
        }

        // 3. 配信情報の取得
        const liveArea = document.getElementById('STREAM-LIST'); // HTML側にこのIDのタグが必要
        if (liveArea) {
            try {
                const liveRes = await fetch('/api/stream');
                const lives = await liveRes.json();

                if (lives.length > 0) {
                    liveArea.innerHTML = lives.map(v => `
                        <div class="card">
                            <a href="${v.url}" target="_blank">
                                <img src="${v.thumbnail}" style="width:100%">
                                <p>${v.title}</p>
                            </a>
                        </div>
                    `).join('');
                } else {
                    liveArea.innerHTML = '<p>現在配信中のメンバーはいません</p>';
                }
            } catch (e) {
                console.error("ライブ情報の取得に失敗しました", e);
            }
        }

    } catch (error) {
        console.error("読み込みエラー:", error);
    }

}

loadNotionCMS();

// ヘッダーの動き
'use strict';
{
    $(function(){
        $('.header__btn').on('click', function(){
            $('.nav').toggleClass('active');
        });

        $('.nav__btn, .nav__list a').on('click', function(){
            $('.nav').removeClass('active');
        });
    });

}
