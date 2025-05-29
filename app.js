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
  // Tesseract.js ワーカー（初回は 3〜5 MB 読み込みで少し待ちます）
  const worker = Tesseract.createWorker({
    logger: m => console.log(m)   // 進捗をコンソールに表示
  });
  await worker.load();
  await worker.loadLanguage('jpn');   // 日本語＋数字
  await worker.initialize('jpn');
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789総スタート ',
    preserve_interword_spaces: '1'
  });

  const { data:{ text } } = await worker.recognize(file);

  await worker.terminate();           // メモリ解放

  // ---- 正規表現で「総スタート xxx」だけ取り出す ----
  // 例：総スタート 2375
  const m = text.replace(/[，,]/g,'')      // カンマ除去
                .match(/総スタート\s*([0-9]+)/);
  if (m) return parseInt(m[1],10);
  throw new Error('総スタートが読み取れませんでした');
}
async function handleFiles(evt) {
  const [graphImg, tableImg] = evt.target.files;
  if (!tableImg) {
    alert('グラフとテーブル、2枚のスクショを選んでください');
    return;
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
// ★ このテストは動作確認が終わったら削除でOK
(async () => {
  const worker = Tesseract.createWorker({ logger: m => console.log(m) });
  await worker.load();
  await worker.loadLanguage('jpn');
  await worker.initialize('jpn');
  // samples/table.png は 自分のスクショ(当たり履歴) でもOK
  const { data:{ text } } = await worker.recognize('samples/table.png');
  console.log('OCR RESULT:\n', text);
  await worker.terminate();
})();
