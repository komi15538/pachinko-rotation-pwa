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
async function extractTotalStart(file) {
  // ① 言語 "jpn" を指定して作成（ここでロード完了）
  const worker = await Tesseract.createWorker('jpn');

  // ② 画像を認識（logger は一旦付けない）
  const { data:{ text } } = await worker.recognize(file);

  await worker.terminate();

  // ---- 総スタート抽出 ----
  const m = text.replace(/[，,]/g,'')
                .match(/総スタート\s*([0-9０-９]+)/);
  if (!m) throw new Error('総スタートが読み取れませんでした');

  const digits = m[1].replace(/[０-９]/g,
      ch => String.fromCharCode(ch.charCodeAt(0)-65248));
  return parseInt(digits,10);
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

    // ② “総スタート” 領域だけトリミング（上 35% 程度）
    const cropH = Math.round(imgBitmap.height * 0.35);
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
