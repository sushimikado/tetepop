// リッチテキストをHTMLに
function renderRichText(richTextArray) {
  return richTextArray.map(t => {
    let text = t.plain_text.replace(/\n/g, "<br>");

    // リンク
    if (t.href) {
      text = `
        <a
          href="${t.href}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${text}
        </a>
      `;
    }

    // 装飾
    if (t.annotations.bold) {
      text = `<b>${text}</b>`;
    }

    if (t.annotations.italic) {
      text = `<i>${text}</i>`;
    }

    return text;
  }).join("");
}

// =========================
// Notion CMS 読み込み
// =========================
async function loadNotionCMS() {
  try {

    // 本番
    const response = await fetch("/api/contents");

    // ローカルテスト用
    // const response = await fetch("/test-data.json");

    const contents = await response.json();

    contents.forEach(item => {

      const jaTitle =
        item.sectionJa ||
        item.titleJa ||
        "";

      // 英語タイトル
      const titleTarget = document.querySelector(
        `[data-cms-title="${item.title}"]`
      );

      if (titleTarget) {
        titleTarget.textContent = item.title;
      }

      // ナビゲーション
      document
        .querySelectorAll(
          `[data-cms-nav="${item.title}"]`
        )
        .forEach(el => {
          el.textContent = item.title;
        });

      // 日本語タイトル
      const jaTarget = document.querySelector(
        `[data-cms-titleJa="${item.title}"]`
      );

      if (jaTarget && jaTitle) {
        jaTarget.textContent = jaTitle;
      }

      // 本文
      const textTarget = document.querySelector(
        `[data-cms-text="${item.title}"]`
      );

      if (textTarget) {

        if (item.richText.length > 0) {
          textTarget.innerHTML =
            renderRichText(item.richText);

          textTarget.style.display = "";

        } else {
          textTarget.style.display = "none";
        }
      }

      // URL埋め込み
      const urlTarget = document.querySelector(
        `[data-cms-url="${item.title}"]`
      );

      if (urlTarget) {

        if (item.url) {

          // X(Twitter)
          if (
            item.url.includes("x.com") ||
            item.url.includes("twitter.com")
          ) {

            urlTarget.innerHTML = `
              <div class="x-embed">
                <blockquote class="twitter-tweet">
                  <a href="${item.url}"></a>
                </blockquote>
              </div>
            `;

          } else {

            urlTarget.innerHTML = `
              <a
                href="${item.url}"
                class="link"
                target="_blank"
              >
                Link
              </a>
            `;
          }

          urlTarget.style.display = "";

          // Twitter Widget 再読み込み
          if (window.twttr?.widgets) {
            window.twttr.widgets.load(urlTarget);
          }

        } else {
          urlTarget.style.display = "none";
        }
      }
    });

    // =========================
    // MEMBER
    // =========================
    const memberArea =
      document.getElementById("MEMBER-LIST");

    if (memberArea) {

      const memRes = await fetch("/api/members", {
        cache: "no-store"
      });

      const memHtml = await memRes.text();

      memberArea.innerHTML = memHtml;
    }

    // =========================
    // HISTORY
    // =========================
    const historyArea =
      document.getElementById("HISTORY-LIST");

    if (historyArea) {

      const historyRes =
        await fetch("/api/history", {
          cache: "no-store"
        });

      const historyHtml =
        await historyRes.text();

      historyArea.innerHTML =
        historyHtml;
    }

  } catch (error) {

    console.error(
      "Notion CMS 読み込みエラー:",
      error
    );
  }
}

// =========================
// STREAM
// =========================
async function loadStreamChecker() {

  const el =
    document.getElementById("STREAM-LIST");

  if (!el) return;

  try {

    const res = await fetch(
      "/api/stream-checker",
      {
        cache: "no-store"
      }
    );

    const html = await res.text();

    el.innerHTML = html;

  } catch (e) {

    console.error(
      "stream-checker 読み込みエラー:",
      e
    );

    el.innerHTML = `

        <div class="card">

          <div class="thumb-empty">
            ERROR
          </div>

          <div class="card-bottom">

            <span class="live-badge-empty">
              ● ERROR
            </span>

            <div class="title">
              配信情報の取得に失敗しました
            </div>

          </div>
        </div>
    `;
  }
}

// =========================
// 実行
// =========================
loadNotionCMS();
loadStreamChecker();

// =========================
// ヘッダー
// =========================
"use strict";

{
  $(function(){

    $(".header__btn").on("click", function(){
      $(".nav").toggleClass("active");
    });

    $(".nav__btn, .nav__list a").on(
      "click",
      function(){
        $(".nav").removeClass("active");
      }
    );

  });
}

// =========================
// HISTORYボタン
// =========================
const list =
  document.getElementById(
    "HISTORY-LIST"
  );

const nextBtn =
  document.getElementById(
    "history-next"
  );

const prevBtn =
  document.getElementById(
    "history-prev"
  );

if (list && nextBtn && prevBtn) {

  nextBtn.addEventListener(
    "click",
    () => {
      list.scrollBy({
        left: 320,
        behavior: "smooth"
      });
    }
  );

  prevBtn.addEventListener(
    "click",
    () => {
      list.scrollBy({
        left: -320,
        behavior: "smooth"
      });
    }
  );

}

// =========================
// バウンスイン
// =========================
const observer =
  new IntersectionObserver(
    (entries) => {

      entries.forEach(entry => {

        if (entry.isIntersecting) {

          entry.target.classList.add(
            "show"
          );

        }

      });

    },
    {
      threshold: 0.2
    }
  );

document
  .querySelectorAll(".bounce")
  .forEach(el => {
    observer.observe(el);
  });
