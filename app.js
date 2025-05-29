// app.js ── 総スタート抽出（画像 1 枚・上 45 % に限定）

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
  const img  = document.querySelector('#preview') || createPreview();
  const rdr  = new FileReader();
  rdr.onload = () => (img.src = rdr.result);
  rdr.readAsDataURL(file);
}

/* ---------- OCR & 総スタート抽出 ---------- */
async function extractTotalStart(blob) {
  const worker = await Tesseract.createWorker();
  await worker.load();
  await worker.loadLanguage('jpn');
  await worker.initialize('jpn');

  // ─ OCR 実行 ─
  const { data:{ text, words } } = await worker.recognize(blob);
  await worker.terminate();

  // ─ デバッグ表示 ─
  console.log('<<< OCR RAW TEXT >>>\n' + text);

  // 画像高さ（bbox に入っている）
  const pageH = words.length ? words[0].pageHeight : 1;

  // ─ 候補抽出 ─
  const candidates = words
    .filter(w => /^[0-9０-９]{2,4}$/.test(w.text))        // 数字 2～4 桁
    .map(w => ({
      num   : parseInt(
                w.text.replace(/[０-９]/g,
                  ch => String.fromCharCode(ch.charCodeAt(0)-65248)), 10),
      yRate : w.bbox.y0 / pageH                            // 上端の割合
    }))
    console.table(allNums);               // ★← ここを追加
    .filter(o => o.yRate < 0.45)   // ★ 上 45 % に限定
    .filter(o => o.num >= 100 && o.num <= 5000);           // 100～5000 のみ

  console.log('CANDIDATES (<=45 %):', candidates);

  if (!candidates.length)
    throw new Error('総スタートが読み取れませんでした');

  // 最大値を採用（例 2375 > 529 > 21 …）
  return candidates.sort((a,b) => b.num - a.num)[0].num;
}

/* ---------- メイン ---------- */
async function handleFiles(e) {
  const [imgFile] = e.target.files;
  if (!imgFile) return;

  showPreview(imgFile);
  document.getElementById('out').textContent = 'OCR 読み取り中…';

  try {
    // 1) Bitmap 化
    const bmp = await createImageBitmap(imgFile);

    // 2) 上 45 % をトリミング
    const cropH = Math.round(bmp.height * 0.45);
    const cvs   = new OffscreenCanvas(bmp.width, cropH);
    cvs.getContext('2d')
        .drawImage(bmp, 0, 0, bmp.width, cropH, 0, 0, bmp.width, cropH);

    // 3) OCR → 総スタート
    const totalStart = await extractTotalStart(await cvs.convertToBlob());

    document.getElementById('out').textContent =
      `総スタート：${totalStart.toLocaleString()} 回`;

    /* ★ ここで bmp を OpenCV.js に渡して
         赤線の最深 y 座標を取得し、
         回転率 = totalStart ÷ (投資玉数/250) を表示する処理を追加予定 */

  } catch (err) {
    document.getElementById('out').textContent = err.message;
  }
}
