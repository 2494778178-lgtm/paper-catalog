'use strict';
const Catalog = globalThis.PaperCatalog;
const byId = id => document.getElementById(id);
let records = [], isDemo = false, busy = false;
const MAX_HASH_BYTES = 100 * 1024 * 1024;

function currentRows() {
  return Catalog.select(records, byId('search').value, byId('only-duplicates').checked, byId('sort').value);
}
function render() {
  const visible = currentRows();
  const hashes = new Set();
  let duplicateCopies = 0;
  for (const row of records) {
    if (row.hash && hashes.has(row.hash)) duplicateCopies++;
    if (row.hash) hashes.add(row.hash);
  }
  byId('total').textContent = records.length;
  byId('duplicates').textContent = duplicateCopies;
  byId('total-size').textContent = Catalog.formatSize(records.reduce((n, row) => n + row.size, 0));
  byId('visible-count').textContent = visible.length;
  byId('demo-badge').hidden = !isDemo;
  byId('rows').replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const row of visible) {
    const tr = document.createElement('tr');
    const titleCell = document.createElement('td');
    const title = document.createElement('span'); title.className = 'file-title'; title.textContent = row.title;
    const path = document.createElement('span'); path.className = 'file-path'; path.textContent = row.path;
    titleCell.append(title, path); tr.append(titleCell);
    for (const value of [row.year || '—', Catalog.formatSize(row.size)]) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    }
    const td = document.createElement('td'), badge = document.createElement('span');
    badge.className = 'badge' + (row.duplicateGroup ? ' duplicate' : !row.hash ? ' skipped' : '');
    badge.textContent = row.duplicateGroup ? `第 ${row.duplicateGroup} 组 · ${row.duplicateCount} 份` : row.hash ? '未发现副本' : '未检测';
    td.append(badge); tr.append(td); fragment.append(tr);
  }
  byId('rows').append(fragment);
  byId('empty').hidden = visible.length > 0;
  byId('empty').textContent = records.length ? '没有符合当前筛选条件的文件。' : '选择一个装着论文的文件夹，开始整理。';
  for (const id of ['export-csv', 'export-md']) byId(id).disabled = busy || visible.length === 0;
  byId('clear').disabled = busy || records.length === 0;
}
function setBusy(value) {
  busy = value;
  for (const id of ['pdf-files', 'pdf-folder', 'demo']) byId(id).disabled = value;
  render();
}
function resetFilters() {
  byId('search').value = ''; byId('only-duplicates').checked = false; byId('sort').value = 'title';
}
function showIssues(messages) {
  byId('issues-box').hidden = !messages.length;
  byId('issues-summary').textContent = `导入提示（${messages.length}）`;
  byId('issues').replaceChildren();
  for (const message of messages) { const li = document.createElement('li'); li.textContent = message; byId('issues').append(li); }
}
async function importFiles(files) {
  if (busy || !files.length) return;
  const candidates = Array.from(files).filter(file => /\.pdf$/i.test(file.name));
  const imported = [], issues = [];
  records = []; isDemo = false; resetFilters(); showIssues([]); setBusy(true);
  try {
    for (let i = 0; i < candidates.length; i++) {
      const file = candidates[i], path = file.webkitRelativePath || file.name;
      byId('status').textContent = `正在处理 ${i + 1} / ${candidates.length}：${path}`;
      try {
        const header = new Uint8Array(await file.slice(0, 1028).arrayBuffer());
        if (!Catalog.isPdf(header)) { issues.push(`${path}：未识别到 PDF 文件头，已跳过。`); continue; }
        const row = Catalog.metadata(path, file.size, file.lastModified);
        row.hashStatus = 'unavailable';
        if (file.size > MAX_HASH_BYTES) {
          row.hashStatus = 'too-large'; issues.push(`${path}：大于 100 MiB，未进行重复检测。`);
        } else if (!globalThis.crypto?.subtle) {
          issues.push(`${path}：当前浏览器不支持本地 SHA-256，请用新版 Edge、Chrome 或 Firefox。`);
        } else {
          try {
            const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
            row.hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
            row.hashStatus = 'ok';
          } catch { row.hashStatus = 'error'; issues.push(`${path}：读取完整内容或计算摘要失败，保留目录记录。`); }
        }
        imported.push(row);
      } catch { issues.push(`${path}：无法读取文件，已跳过。`); }
    }
    records = Catalog.annotateDuplicates(imported);
    const ignored = files.length - candidates.length;
    byId('status').textContent = `已导入 ${records.length} 个 PDF；忽略 ${ignored} 个非 PDF 文件。${issues.length ? '部分文件有导入提示，请查看下方列表。' : ''}`;
    showIssues(issues);
  } finally {
    byId('pdf-files').value = ''; byId('pdf-folder').value = ''; setBusy(false);
  }
}
function download(content, extension, mime) {
  const url = URL.createObjectURL(new Blob([content], {type: mime}));
  const a = document.createElement('a'); a.href = url;
  a.download = `${isDemo ? 'demo-' : ''}paper-catalog.${extension}`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
byId('pdf-files').addEventListener('change', event => importFiles(event.target.files));
byId('pdf-folder').addEventListener('change', event => importFiles(event.target.files));
for (const id of ['search', 'sort', 'only-duplicates']) byId(id).addEventListener('input', render);
byId('export-csv').addEventListener('click', () => download(Catalog.toCsv(currentRows()), 'csv', 'text/csv;charset=utf-8'));
byId('export-md').addEventListener('click', () => download(Catalog.toMarkdown(currentRows(), isDemo), 'md', 'text/markdown;charset=utf-8'));
byId('clear').addEventListener('click', () => {
  records = []; isDemo = false; resetFilters(); showIssues([]);
  byId('status').textContent = '目录已清空，原始文件未修改。'; render();
});
byId('demo').addEventListener('click', () => {
  const examples = [
    ['示例文献/2025_Energy_storage_review.pdf', 740352, 'demo-a'],
    ['示例文献/备份/储能综述_副本.pdf', 740352, 'demo-a'],
    ['示例文献/2024_Heat_pump_optimization.pdf', 1351680, 'demo-b'],
    ['示例文献/多能系统研究笔记.pdf', 456704, 'demo-c']
  ];
  records = Catalog.annotateDuplicates(examples.map(([path, size, hash]) => ({...Catalog.metadata(path, size), hash, hashStatus: 'demo'})));
  isDemo = true; resetFilters(); showIssues([]);
  byId('status').textContent = '当前展示虚构演示数据，未读取任何本地文件。选择文件后会替换演示数据。'; render();
});
render();
