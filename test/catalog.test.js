'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../catalog.js');
const row = (path, hash = '', size = 100) => ({...C.metadata(path, size), hash, hashStatus: hash ? 'ok' : 'unavailable'});

test('Chinese paths, uppercase PDF extensions, and filename year guesses', () => {
  const entry = C.metadata('文献\\储能\\2024_多能系统.PDF', 123);
  assert.equal(entry.title, '2024 多能系统'); assert.equal(entry.year, '2024'); assert.equal(entry.name, '2024_多能系统.PDF');
  assert.equal(C.metadata('paper_120240_data.pdf').year, '');
  assert.equal(C.metadata('paper.pdf').year, '');
});
test('PDF header validation rejects renamed non-PDF files and supports a leading preamble', () => {
  const bytes = str => new TextEncoder().encode(str);
  assert.equal(C.isPdf(bytes('%PDF-1.7\n')), true);
  assert.equal(C.isPdf(bytes('prefix\n%PDF-1.4')), true);
  assert.equal(C.isPdf(bytes('<html>not a PDF</html>')), false);
  assert.equal(C.isPdf(bytes('%PDF')), false);
  assert.equal(C.isPdf(bytes(' '.repeat(1024) + '%PDF-1.7')), false);
});
test('duplicate groups depend on content hashes, never filenames, sizes or missing hashes', () => {
  const input = [row('one.pdf','abc'),row('copy.pdf','abc'),row('one.pdf','def'),row('nohash.pdf'),row('unknown.pdf')];
  const out = C.annotateDuplicates(input);
  assert.equal(out[0].duplicateGroup, out[1].duplicateGroup); assert.equal(out[0].duplicateCount, 2);
  assert.equal(out[2].duplicateGroup, 0); assert.equal(out[3].duplicateGroup, 0); assert.equal(out[4].duplicateGroup, 0);
  assert.equal(input[0].duplicateGroup, undefined);
});
test('combined search and duplicate filters preserve full-library group sizes', () => {
  const data = C.annotateDuplicates([row('储能/2025_Review.pdf','x'),row('备份/copy.pdf','x'),row('储能/2024_review.pdf','y')]);
  const selected = C.select(data, '储能 REVIEW 2025', true);
  assert.equal(selected.length, 1); assert.equal(selected[0].duplicateCount, 2);
  assert.equal(C.select(data, 'nothing').length, 0);
});
test('sort is non-mutating and places missing years last', () => {
  const data = [row('unknown.pdf','',9),row('2022_a.pdf','',30),row('2025_b.pdf','',20)];
  assert.deepEqual(C.select(data,'',false,'year').map(r=>r.year), ['2025','2022','']);
  assert.deepEqual(C.select(data,'',false,'size').map(r=>r.size), [30,20,9]);
  assert.equal(data[0].name,'unknown.pdf');
});
test('CSV protects formula-like filenames and preserves quotes, commas, Chinese and newlines', () => {
  const csv = C.toCsv([row('=HYPERLINK("bad")，文献.pdf'),row('  @SUM(1,2).pdf'),row('line\nbreak.pdf')]);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"\'=HYPERLINK(""bad"")，文献"'));
  assert.ok(csv.includes('"\'@SUM(1,2)"')); assert.ok(csv.includes('"\'  @SUM(1,2).pdf"'));
  assert.ok(csv.includes('"line\nbreak.pdf"'));
});
test('Markdown does not turn filenames into HTML, links or extra table columns', () => {
  const md = C.toMarkdown([row('<img src=x>|[click](bad)\n.pdf')]);
  assert.ok(md.includes('&lt;img src=x&gt;')); assert.ok(md.includes('\\|')); assert.ok(md.includes('\\[click\\]'));
  assert.ok(!md.includes('<img')); assert.ok(C.toMarkdown([],true).includes('DEMO DATA'));
});
test('sizes use binary units and handle empty files', () => {
  assert.equal(C.formatSize(0),'0 B'); assert.equal(C.formatSize(1024),'1.0 KiB');
  assert.equal(C.formatSize(1048576),'1.0 MiB'); assert.equal(C.formatSize(-1),'—');
});
