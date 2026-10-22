# Paper Catalog

A small, offline browser tool for turning a folder of PDF papers into a searchable catalog. It finds byte-identical duplicates with SHA-256 and exports CSV or Markdown. No account, server, build step, third-party libraries, analytics, or uploads.

**Status:** initial 0.1 prototype. There are no adoption, download, or community metrics claimed for this project. The current UI is in Simplified Chinese.

## Use it

1. Download this repository as a ZIP and extract it.
2. Open `index.html` in a recent Edge, Chrome, or Firefox browser.
3. Select PDFs or a folder. Try **先看演示** to preview clearly labeled fictional data.
4. Search by filename/path/year, filter duplicate groups, and export the visible rows.

All processing runs locally. The application does not modify, rename, move, or delete source files. Each new import replaces the current catalog. Reloading or closing the page clears it. Exported reports contain filenames and relative paths, so review them before sharing.

## What it does — and what it does not do

- Recursively enumerates files selected with the browser's folder picker; only `.pdf` filenames are considered.
- Checks for a PDF header near the beginning of each file. This is **not** full PDF integrity validation.
- Uses filenames as display titles. Year values are **guesses from filenames**, not publication metadata.
- Calculates SHA-256 for files up to 100 MiB. Larger files and hash failures are retained but marked as not checked.
- Finds exact binary duplicates, including copies with different filenames. Revised or recompressed PDFs with the same text are not exact duplicates.
- Counts extra copies across the full imported library. Duplicate group labels keep their original meaning when results are filtered.
- Exports UTF-8 CSV with a BOM, quoted fields, and formula neutralization for spreadsheet use. Markdown escapes filename markup.
- Does not extract text, authors, DOI, citations, or abstracts. It cannot establish bibliographic accuracy.

The browser reads one PDF at a time for hashing. Very large collections may be slow because results are kept in memory and rendered without pagination. Directory-picker support varies by browser; use the multiple-file picker if needed.

## Development

The app consists of plain HTML, CSS and JavaScript. Open the HTML file directly; no `npm install` is needed.

Run the core tests with Node.js 18 or newer:

```sh
node --test
```

`catalog.js` contains the pure catalog and export logic. `app.js` handles local browser file reads and UI state. Tests cover Unicode paths, PDF header checks, content-based grouping, filter/sort behavior, CSV formula handling, and Markdown escaping.

Manual smoke check: open the app, load the demo, search for `2025`, filter duplicate groups, export both formats, then import real local PDFs including one renamed copy. Confirm that source files are unchanged and that clear/import replace the existing catalog.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Possible future work includes editable bibliographic metadata, pagination, English UI, and an optional PDF metadata parser. These features are not implemented yet.

## 中文快速说明

这是一个初始版本的本地论文文件整理工具。解压后双击 `index.html`，选择 PDF 或文件夹即可使用；没有安装步骤，也不需要注册。

- 支持中文文件名、搜索、年份和大小排序。
- SHA-256 用于识别内容完全一致的副本，**不会删除或修改文件**。
- 文件标题与年份来自文件名，不代表论文的真实标题或发表年份。
- CSV 可用于 Excel；Markdown 可用于笔记软件。导出只包含当前筛选结果。
- 演示模式采用虚构数据，不代表真实论文、用户或使用量。
- 首次发布尚无用户量、下载量或社区维护历史。

## License

[MIT](LICENSE).
