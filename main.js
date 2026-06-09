// CSSの読み込み（Viteの仕様として残しておきます）
import './style.css'

// ハンバーガーメニューの開閉処理
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');

  // 要素が正しく取得できているか確認
  if (hamburger && navMenu) {
    // ハンバーガーをクリックしたときの処理
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // リンクをクリックしたときにメニューを閉じる処理
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  } else {
    console.error("ハンバーガーメニューの要素が見つかりません。HTMLのIDを確認してください。");
  }
});