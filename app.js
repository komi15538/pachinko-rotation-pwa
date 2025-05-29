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
  const worker = await Tesseract.createWorker();
  await worker.loadLanguage('jpn');
  await worker.initialize('jpn');

  const { data:{ text } } = await worker.recognize(file, {
    logger: m => console.log(m)
  });
  await worker.terminate();

  const m = text.replace(/[，,]/g,'')
                .match(/総スタート\s*([0-9０-９]+)/);
  if (!m) throw new Error('総スタートが読み取れませんでした');

  const digits = m[1].replace(/[０-９]/g,
    ch => String.fromCharCode(ch.charCodeAt(0)-65248));
  return parseInt(digits,10);
}

/* ---------- メイン ---------- */
async function handleFiles(e) {
  const [graphImg, tableImg] = e.target.files;
  if (!tableImg) {
    alert('グラフとテーブル、2枚選択してください');
    return;
  }

  showPreview(graphImg);
  document.getElementById('out').textContent = 'OCR 読み取り中…';

  try {
    const total = await extractTotalStart(tableImg);
    document.getElementById('out').textContent =
      `総スタート：${total.toLocaleString()} 回`;
  } catch (err) {
    document.getElementById('out').textContent = err.message;
  }
}
