// app.js ── 総スタート抽出（画像 1 枚・下 45 % を OCR）

document.getElementById('files').addEventListener('change', handleFiles);

/* ---------- プレビュー ---------- */
function createPreview () {
  const img = document.createElement('img');
  img.id = 'preview';
  img.style.maxWidth = '100%';
  document.body.appendChild(img);
  return img;
}
function showPreview (file) {
  const img = document.querySelector('#preview') || createPreview();
  const rdr = new FileReader();
  rdr.onload = () => (img.src = rdr.result);
  rdr.readAsDataURL(file);
}

/* ---------- OCR ＆ 総スタート抽出 ---------- */
async function extractTotalStart (blob) {
  const worker = await Tesseract.createWorker();
  await worker.load();
  await worker.loadLanguage('jpn');
  await worker.initialize('jpn');

  const { data:{ text, words } } = await worker.recognize(blob);
  await worker.terminate();

  console.log('<<< OCR RAW TEXT >>>\n' + text);

  /* ---- ページ高さ（bbox.y1 の最大値） ---- */
  const pageH = words.length
      ? Math.max(...words.map(w => w.bbox?.y1 ?? 0))
      : 1;

  /* ---- 数字 2〜4 桁と yRate を列挙 ---- */
  const allNums = words
    .filter(w => /^[0-9０-９]{2,4}$/.test(w.text))
    .map(w => ({
      num   : parseInt(
        w.text.replace(/[０-９]/g,
          ch => String.fromCharCode(ch.charCodeAt(0) - 65248)), 10),
      yRate : (w.bbox?.y0 ?? 0) / pageH      // 0(top)〜1(bottom)
    }));

  console.table(allNums);                     // デバッグ

  /* ---- yRate 0.55〜0.90 かつ 100〜5000 ---- */
  const candidates = allNums
    .filter(o => o.yRate >= 0.55 && o.yRate <= 0.90)
    .filter(o => o.num  >= 100  && o.num  <= 5000);

  console.log('CANDIDATES (0.55–0.90):', candidates);

  if (!candidates.length)
    throw new Error('総スタートが読み取れませんでした');

  /* 最大値を採用（例: 2375 > 529 > 21） */
  return candidates.sort((a, b) => b.num - a.num)[0].num;
}

/* ---------- メイン ---------- */
async function handleFiles (e) {
  const [imgFile] = e.target.files;
  if (!imgFile) return;

  showPreview(imgFile);
  document.getElementById('out').textContent = 'OCR 読み取り中…';

  try {
    const bmp = await createImageBitmap(imgFile);

    /* ★ 下 45 % だけをトリミングして OCR コストを減らす */
    const offsetY = Math.round(bmp.height * 0.55);   // 開始位置
    const cropH   = bmp.height - offsetY;            // 高さ＝下 45 %
    const cvs     = new OffscreenCanvas(bmp.width, cropH);
    cvs.getContext('2d')
       .drawImage(bmp,
                  0, offsetY,              // 画像の切り出し開始 Y
                  bmp.width, cropH,        // 幅・高さ
                  0, 0,                    // Canvas 描画先 (0,0)
                  bmp.width, cropH);

    const totalStart = await extractTotalStart(await cvs.convertToBlob());

    document.getElementById('out').textContent =
      `総スタート：${totalStart.toLocaleString()} 回`;

  } catch (err) {
    document.getElementById('out').textContent = err.message;
  }
}
