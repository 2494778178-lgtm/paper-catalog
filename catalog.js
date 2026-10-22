(function (root) {
  'use strict';
  function metadata(path, size = 0, lastModified = 0) {
    const name = String(path).split(/[\\/]/).pop();
    const stem = name.replace(/\.pdf$/i, '');
    const yearMatch = stem.match(/(?:^|[^0-9])((?:19|20)[0-9]{2})(?=[^0-9]|$)/);
    return {path: String(path), name, title: stem.replace(/[_]+/g, ' ').trim() || name,
      year: yearMatch ? yearMatch[1] : '', size, lastModified, hash: '', hashStatus: 'pending'};
  }
  function isPdf(bytes) {
    const magic = [37, 80, 68, 70, 45];
    for (let i = 0; i <= Math.min(1023, bytes.length - magic.length); i++) {
      if (magic.every((value, j) => bytes[i + j] === value)) return true;
    }
    return false;
  }
  function annotateDuplicates(records) {
    const groups = new Map();
    for (const row of records) {
      if (row.hash && !groups.has(row.hash)) groups.set(row.hash, []);
      if (row.hash) groups.get(row.hash).push(row);
    }
    const ids = new Map();
    for (const [hash, rows] of groups) if (rows.length > 1) ids.set(hash, ids.size + 1);
    return records.map(row => ({...row, duplicateGroup: ids.get(row.hash) || 0,
      duplicateCount: row.hash ? groups.get(row.hash).length : 0}));
  }
  function select(records, query = '', onlyDuplicates = false, sort = 'title') {
    const terms = String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const selected = records.filter(row => (!onlyDuplicates || row.duplicateGroup > 0) &&
      terms.every(term => `${row.title} ${row.path} ${row.year}`.toLocaleLowerCase().includes(term)));
    selected.sort((a, b) => {
      if (sort === 'size' && a.size !== b.size) return b.size - a.size;
      if (sort === 'year' && a.year !== b.year) return Number(b.year || 0) - Number(a.year || 0);
      return a.title.localeCompare(b.title) || a.path.localeCompare(b.path);
    });
    return selected;
  }
  function formatSize(size) {
    if (!Number.isFinite(size) || size < 0) return '—';
    if (size < 1024) return `${size} B`;
    const units = ['KiB', 'MiB', 'GiB', 'TiB'];
    let n = size / 1024, i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(1)} ${units[i]}`;
  }
  function csvCell(value) {
    let text = String(value ?? '');
    // Neutralize spreadsheet formulas in user-controlled filenames and paths.
    if (/^[\s]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function toCsv(records) {
    const columns = ['filename_title', 'filename_year_guess', 'relative_path', 'size_bytes', 'sha256', 'hash_status', 'duplicate_group'];
    const rows = records.map(row => [row.title, row.year, row.path, row.size, row.hash, row.hashStatus, row.duplicateGroup || '']);
    return '\uFEFF' + [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  function markdownCell(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/([\\|`*_[\]])/g, '\\$1').replace(/[\r\n]+/g, ' ');
  }
  function toMarkdown(records, demo = false) {
    const heading = demo ? '# Paper Catalog — DEMO DATA' : '# Paper Catalog';
    const lines = [heading, '', 'Titles and year guesses come from filenames, not PDF metadata. Duplicate groups refer to the full imported library.', '',
      '| Filename title | Year guess | Relative path | Size | Duplicate check |', '| --- | --- | --- | --- | --- |'];
    for (const row of records) {
      const duplicate = row.duplicateGroup ? `Group ${row.duplicateGroup} (${row.duplicateCount} files)` : row.hash ? 'No exact duplicate' : 'Not checked';
      lines.push('| ' + [row.title, row.year || '—', row.path, formatSize(row.size), duplicate].map(markdownCell).join(' | ') + ' |');
    }
    return lines.join('\n') + '\n';
  }
  const api = {metadata, isPdf, annotateDuplicates, select, formatSize, toCsv, toMarkdown};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PaperCatalog = api;
})(globalThis);
