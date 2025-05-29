// app.js ── OCR で総スタート抽出まで

document.getElementById('files').addEventListener('change', handleFiles);

/* ---------- プレビュー ---------- */
function createPreview() {
  const img = document.createElement('img');
  img.id = 'preview';
  img.style.maxWidth = '100%';
  document.body.appendChild(img);
  return img;
}
function showPreview(file) {
  const img = document.querySelector('#preview') || createPreview();
  const rdr = new FileReader();
  rdr.onload = () => (img.src = rdr.result);
  rdr.readAsDataURL(file);
}

/* ---------- OCR ---------- */
async function extractTotalStart(blob) {
  const worker = await Tesseract.createWorker();
  await worker.load();
  await worker.loadLanguage('jpn');
  await worker.initialize('jpn');

  const { data:{ text } } = await worker.recognize(blob);
  await worker.terminate();

  console.log('<<< OCR RAW TEXT >>>\n' + text);   // デバッグ用

  // 全角→半角、カンマ除去
  const cleaned = text
      .replace(/[０-９]/g, ch =>
          String.fromCharCode(ch.charCodeAt(0) - 65248))
      .replace(/[，,]/g, '');

  // 2〜4 桁の数字を全部抜く
  const nums = cleaned.match(/\d{3,4}/g) || [];

  // 100〜4000 の範囲にある最大値を採用
  const total = nums
      .map(n => parseInt(n, 10))
      .filter(n => n >= 100 && n <= 4000)
      .sort((a, b) => b - a)[0];

  if (!total) throw new Error('総スタートが読み取れませんでした');
  return total;
}

/* ---------- メイン ---------- */
async function handleFiles (e) {
  const [imgFile] = e.target.files;
  if (!imgFile) return;

  showPreview(imgFile);                 // プレビューはそのまま

  document.getElementById('out').textContent = 'OCR 読み取り中…';

  try {
    // ① File → HTMLImageElement へ
    const imgBitmap = await createImageBitmap(imgFile);

    // ② “総スタート” 領域だけトリミング（上 55% 程度）
    const cropH = Math.round(imgBitmap.height * 0.55);
    const canvas = new OffscreenCanvas(imgBitmap.width, cropH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgBitmap, 0, 0, imgBitmap.width, cropH, 0, 0,
                  imgBitmap.width, cropH);

    // ③ canvas を blob → OCR
    const dashBlob = await canvas.convertToBlob();
    const total = await extractTotalStart(dashBlob);

    document.getElementById('out').textContent =
      `総スタート：${total.toLocaleString()} 回`;

    // ★ ここで imgBitmap 全体を使って OpenCV で赤線最深値を取る
    //    （まだ実装していなければ後で追加）

  } catch (err) {
    document.getElementById('out').textContent = err.message;
  }
}
