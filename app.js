// app.js ── 総スタート抽出（画像 1 枚・上 45 % を OCR）

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

/* ---------- OCR & 総スタート抽出 ---------- */
async function extractTotalStart (blob) {
  const worker = await Tesseract.createWorker();
  await worker.load();
  await worker.loadLanguage('jpn');
  await worker.initialize('jpn');

  const { data:{ text, words } } = await worker.recognize(blob);
  await worker.terminate();

  console.log('<<< OCR RAW TEXT >>>\n' + text);

  /* ページ高さ（bbox.y1 の最大値） */
  const pageH = words.length
      ? Math.max(...words.map(w => w.bbox?.y1 ?? 0))
      : 1;

  /* 数字 2〜4 桁＋ yRate 一覧 */
  const allNums = words
    .filter(w => /^[0-9０-９]{2,4}$/.test(w.text))
    .map(w => ({
      num   : parseInt(
        w.text.replace(/[０-９]/g,
          ch => String.fromCharCode(ch.charCodeAt(0) - 65248)), 10),
      yRate : (w.bbox?.y0 ?? 0) / pageH
    }));

  console.table(allNums);                        // デバッグ

/* ---- yRate 0.70〜0.95 かつ 100〜5000 ---- */
const candidates = allNums
  .filter(o => o.yRate >= 0.70 && o.yRate <= 0.95)   // ←★変更
  .filter(o => o.num  >= 100  && o.num  <= 5000);

  console.log('CANDIDATES (0–0.45):', candidates);

  if (!candidates.length)
    throw new Error('総スタートが読み取れませんでした');

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

    /* ★ 赤線点列を取得してログへ */
    const poly = await extractRedPolyline(bmp);
    console.log('poly length=', poly.length, poly.slice(0,10));
    
    /* ★ 上 45 % をトリミングして OCR */
    const cropH = Math.round(bmp.height * 0.45);
    const cvs   = new OffscreenCanvas(bmp.width, cropH);
    cvs.getContext('2d')
       .drawImage(bmp,
                  0, 0,                  // 画像切り出し開始 (上端)
                  bmp.width, cropH,      // 幅・高さ
                  0, 0,                  // Canvas 描画先
                  bmp.width, cropH);

    const totalStart = await extractTotalStart(await cvs.convertToBlob());

    document.getElementById('out').textContent =
      `総スタート：${totalStart.toLocaleString()} 回`;

  } catch (err) {
    document.getElementById('out').textContent = err.message;
  }
}

/* ========= ★ 赤線抽出ユーティリティ ========= */
/** ImageBitmap から赤線の (x,y) 配列を返す */
async function extractRedPolyline(bmp){
  const cvs = new OffscreenCanvas(bmp.width, bmp.height);
  cvs.getContext('2d').drawImage(bmp, 0, 0);
  const src = cv.imread(cvs);

  cv.cvtColor(src, src, cv.COLOR_RGBA2RGB);
  cv.cvtColor(src, src, cv.COLOR_RGB2HSV);

  const low1  = new cv.Mat(src.rows, src.cols, src.type(), [  0,120,120,0]);
  const high1 = new cv.Mat(src.rows, src.cols, src.type(), [ 10,255,255,0]);
  const low2  = new cv.Mat(src.rows, src.cols, src.type(), [170,120,120,0]);
  const high2 = new cv.Mat(src.rows, src.cols, src.type(), [180,255,255,0]);
  const m1=new cv.Mat(), m2=new cv.Mat(), mask=new cv.Mat();
  cv.inRange(src, low1, high1, m1);
  cv.inRange(src, low2, high2, m2);
  cv.bitwise_or(m1, m2, mask);

  const pts=[];
  for(let x=0;x<mask.cols;x++){
    for(let y=0;y<mask.rows;y++){
      if(mask.ucharPtr(y,x)[0]){ pts.push({x,y}); break; }
    }
  }

  /* 後片付け */
  [src,low1,high1,low2,high2,m1,m2,mask].forEach(mat=>mat.delete());
  return pts;
}
