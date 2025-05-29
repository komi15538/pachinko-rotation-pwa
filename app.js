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
