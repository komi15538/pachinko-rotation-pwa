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

  // text を含めて受け取る
  const { data:{ text, words } } = await worker.recognize(blob);
  await worker.terminate();

  // ***** デバッグ ***** ここで全文を表示
  console.log('<<< OCR RAW TEXT >>>\n' + text);

  // 画像の高さ
  const pageH = words.length ? words[0].pageHeight : 1;

  // 上 50 % にある 2〜4 桁数字を候補に
  const candidates = words
    .filter(w => /^[0-9０-９]{2,4}$/.test(w.text))
    .filter(w => (w.bbox.y0 / pageH) < 0.50)
    .map(w => parseInt(
      w.text.replace(/[０-９]/g,
        ch => String.fromCharCode(ch.charCodeAt(0) - 65248)), 10));

  if (!candidates.length) throw new Error('総スタートが読み取れませんでした');

  return candidates.sort((a, b) => b - a)[0];   // 最大値
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
