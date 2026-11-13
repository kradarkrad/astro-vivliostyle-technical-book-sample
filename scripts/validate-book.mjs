import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const htmlPath = resolve(root, 'dist-book/print/index.html');
const html = await readFile(htmlPath, 'utf8');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length > 0) {
  throw new Error(`重複した見出しまたはアンカーIDがあります: ${[...new Set(duplicateIds)].join(', ')}`);
}

const anchors = new Set(ids);
const missingAnchors = [...html.matchAll(/\shref="#([^"]+)"/g)]
  .map((match) => match[1])
  .filter((id) => !anchors.has(id));
if (missingAnchors.length > 0) {
  throw new Error(`参照先が存在しない内部リンクがあります: ${[...new Set(missingAnchors)].join(', ')}`);
}

const imageSources = [...html.matchAll(/\ssrc="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((source) => !source.startsWith('data:') && !source.startsWith('http'));
for (const source of imageSources) {
  await access(resolve(root, 'dist-book/print', source));
}

const requiredMarkers = [
  ['A5ページ設定', '--page-size'],
  ['自動目次', 'class="toc"'],
  ['章扉', 'class="chapter-title"']
];
for (const [label, marker] of requiredMarkers) {
  if (!html.includes(marker)) {
    throw new Error(`${label}の生成結果を確認できません: ${marker}`);
  }
}

console.log(`Book validation passed: ${ids.length} unique IDs, ${imageSources.length} local images, ${requiredMarkers.length} required markers.`);
