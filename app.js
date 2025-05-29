// TODO: 画像解析ロジックを追加
// app.js --- Step 1: 画像プレビューまで

document.getElementById('files').addEventListener('change', handleFiles);

function handleFiles(evt) {
  const fileList = evt.target.files;
  if (!fileList.length) return;

  // 画面をリセット
  document.getElementById('out').textContent = '';
  const preview = document.querySelector('#preview') || createPreview();

  // 最初の画像だけ表示（複数対応は後で）
  const imgFile = fileList[0];
  const reader  = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
  };
  reader.readAsDataURL(imgFile);
}

// helper: img 要素が無ければ作る
function createPreview() {
  const img = document.createElement('img');
  img.id = 'preview';
  img.style.maxWidth = '100%';
  document.body.appendChild(img);
  return img;
}
/* ---------- ① OCR して総スタートを拾う ---------- */
async function extractTotalStart(file) {

  // ① ワーカー生成（logger は渡さない）
  const worker = await Tesseract.createWorker();

  // ② 言語ロード & 初期化
  await worker.loadLanguage('jpn');
  await worker.initialize('jpn');

  // ③ 画像を認識（ここで logger を渡す）
  const { data:{ text } } = await worker.recognize(file, {
    logger: m => console.log(m)
  });

  await worker.terminate();   // メモリ解放

  // ---- 正規表現で「総スタート xxx」だけ取り出す ----
  const m = text.replace(/[，,]/g,'')      // カンマ除去
                .match(/総スタート\s*([0-9０-９]+)/);
  if (!m) throw new Error('総スタートが読み取れませんでした');

  // 全角→半角変換して数値化
  const digits = m[1].replace(/[０-９]/g,
      ch => String.fromCharCode(ch.charCodeAt(0)-65248));
  return parseInt(digits,10);
}

  // ① プレビューはグラフだけ
  showPreview(graphImg);

  // ② OCR → 総スタート数
  try {
    document.getElementById('out').textContent = 'OCR 読み取り中…';
    const totalStart = await extractTotalStart(tableImg);
    document.getElementById('out').textContent =
      `総スタート：${totalStart.toLocaleString()} 回`;
  } catch (e) {
    document.getElementById('out').textContent = e.message;
  }
}
function showPreview(file){
  const preview = document.querySelector('#preview') || createPreview();
  const reader = new FileReader();
  reader.onload = () => (preview.src = reader.result);
  reader.readAsDataURL(file);
}
/* ===== OCR 単体テスト (あとで削除OK) ===== */
(async () => {
  const worker = await Tesseract.createWorker();
  await worker.loadLanguage('jpn');
  await worker.initialize('jpn');

  const { data:{ text } } = await worker.recognize('table.png', {
    logger: m => console.log(m)
  });

  console.log('----- OCR RESULT -----\n' + text);
  await worker.terminate();
})();