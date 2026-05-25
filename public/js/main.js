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

    } catch (error) {
        console.error("読み込みエラー:", error);
    }

}

loadNotionCMS();

// 配信スケジュール
async function loadStreamChecker() {
  const el = document.getElementById("STREAM-LIST");

  if (!el) return;

  try {
    const res = await fetch("/api/stream-checker");
    const html = await res.text();

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `
      <div class="grid">
        <div class="card">
          <div class="thumb-empty">
            ERROR
          </div>

          <div class="card-bottom">
            <span class="live-badge-empty">● ERROR</span>

            <div class="title">
              配信情報の取得に失敗しました
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

loadStreamChecker();

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
