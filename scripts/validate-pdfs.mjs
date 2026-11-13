import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, resolveProfile } from './profile-resolver.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const reportsDir = resolve(root, 'dist-books/sample/reports');
const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(config.profiles);

function approx(actual, expected) {
  return Math.abs(actual - expected) < 1.5;
}

function check(name, status, detail) {
  return { name, status, detail };
}

function inspect(name) {
  const profile = resolveProfile(name);
  const file = resolve(root, profile.output);
  if (!existsSync(file)) {
    return {
      profile: name,
      label: profile.label,
      pdf: profile.output,
      checks: [check('PDF file', 'FAIL', 'PDF was not generated')],
      overall: 'FAIL'
    };
  }
  const bytes = readFileSync(file);
  const text = bytes.toString('latin1');
  const pages = (text.match(/\/Type\s*\/Page\b/g) ?? []).length;
  const box = (name) => {
    const match = text.match(new RegExp(`/${name}\\s*\\[\\s*([-\\d.]+)\\s+([-\\d.]+)\\s+([-\\d.]+)\\s+([-\\d.]+)`));
    return match ? {
      x: Number(match[1]),
      y: Number(match[2]),
      width: Number(match[3]),
      height: Number(match[4])
    } : null;
  };
  const media = box('MediaBox');
  const trim = box('TrimBox');
  const bleed = box('BleedBox');
  const crop = box('CropBox');
  const expectedTrim = profile.expectedTrimPt;
  const trimMatches = trim && expectedTrim
    ? approx(trim.width, expectedTrim[0]) && approx(trim.height, expectedTrim[1])
    : false;
  const coordinatesPresent = [media, trim, bleed].every((item) => item
    && Number.isFinite(item.x) && Number.isFinite(item.y));
  const bleedExtendsTrim = bleed && trim
    ? bleed.width >= trim.width && bleed.height >= trim.height
    : false;
  const requestedBleed = Number.isFinite(profile.bleedMm)
    ? profile.bleedMm
    : Number.isFinite(profile.requirements?.bleedMm)
      ? profile.requirements.bleedMm
      : 0;
  const bleedIsDistinct = bleed && trim
    ? bleed.width > trim.width + 1 || bleed.height > trim.height + 1
    : false;
  const profileStatus = profile.unknownRequirements?.length
    ? 'WARN'
    : 'PASS';
  const checks = [
    check('PDF file', 'PASS', `${bytes.length} bytes`),
    check('Page count', pages > 0 ? 'PASS' : 'FAIL', `${pages} pages`),
    check('MediaBox', media ? 'PASS' : 'WARN', media ? `${media.width} x ${media.height} pt` : 'not found'),
    check('TrimBox', trimMatches ? 'PASS' : 'WARN', trim ? `${trim.width} x ${trim.height} pt` : 'not found'),
    check('BleedBox', bleed ? 'PASS' : 'WARN', bleed ? `${bleed.width} x ${bleed.height} pt` : 'not found'),
    check('CropBox', crop ? 'PASS' : 'NOT VERIFIED', crop ? `${crop.width} x ${crop.height} pt` : 'not present in generated PDF'),
    check('Page box coordinates', coordinatesPresent ? 'PASS' : 'WARN', coordinatesPresent ? 'x/y coordinates present' : 'missing page box coordinates'),
    check('Bleed edge relation', bleedExtendsTrim ? 'PASS' : 'WARN', bleedExtendsTrim ? 'BleedBox contains TrimBox' : 'BleedBox relation not verified'),
    check('Requested bleed geometry', requestedBleed === 0 || bleedIsDistinct ? 'PASS' : 'WARN',
      requestedBleed === 0 ? 'no bleed requested' : (bleedIsDistinct ? `${requestedBleed}mm bleed is represented` : `${requestedBleed}mm requested but boxes are equal`)),
    check('Font embedding marker', text.includes('/FontFile') ? 'PASS' : 'WARN', text.includes('/FontFile') ? 'present' : 'not found'),
    check('PDF bookmarks', text.includes('/Outlines') ? 'PASS' : 'WARN', text.includes('/Outlines') ? 'present' : 'not found'),
    check('Internal link annotations', text.includes('/Annots') ? 'PASS' : 'WARN', text.includes('/Annots') ? 'present' : 'not found'),
    check('Title metadata', text.includes('/Title') ? 'PASS' : 'WARN', text.includes('/Title') ? 'present' : 'not found'),
    check('Profile requirements', profileStatus, profile.unknownRequirements?.length
      ? `${profile.unknownRequirements.length} requirement(s) are unknown`
      : 'known requirements only'),
    check('Color inspection', profile.colorMode === 'grayscale-requested' && text.includes('/DeviceRGB')
      ? 'WARN' : 'PASS', profile.colorMode === 'grayscale-requested'
      ? (text.includes('/DeviceRGB') ? 'DeviceRGB remains; CSS monochrome is not a color-space conversion' : 'no DeviceRGB marker')
      : 'source color mode retained'),
    check('PDF/X conformance', 'NOT VERIFIED', 'Independent PDF/X preflight is required')
  ];
  const overall = checks.some((item) => item.status === 'FAIL') ? 'FAIL' : 'PASS_WITH_WARNINGS';
  return {
    profile: name,
    label: profile.label,
    pdf: profile.output,
    bytes: bytes.length,
    pages,
    mediaBox: media,
    trimBox: trim,
    bleedBox: bleed,
    cropBox: crop,
    generatedAt: new Date().toISOString(),
    checks,
    overall,
    submissionDecision: name.startsWith('print') || profile.printerId
      ? (profile.submissionReady ? '技術的検証後に印刷会社へ確認' : '未確認条件があるため印刷会社への確認が必要')
      : '技術的な検証結果。閲覧用途の確認を要する'
  };
}

mkdirSync(reportsDir, { recursive: true });
for (const name of names) {
  const report = inspect(name);
  const base = resolve(reportsDir, `${name}-report`);
  writeFileSync(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`);
  const rows = report.checks.map((item) => `| ${item.status} | ${item.name} | ${item.detail.replaceAll('|', '\\|')} |`).join('\n');
  writeFileSync(`${base}.md`, `# ${report.label}\n\n- PDF: \`${basename(report.pdf)}\`\n- 生成日時: ${report.generatedAt ?? '-'}\n- 判定: **${report.overall}**\n- 入稿判断: **${report.submissionDecision ?? '未生成'}**\n\n| Status | Check | Detail |\n|---|---|---|\n${rows}\n\n> PDF生成成功は、印刷会社の入稿適合性を意味しません。\n`);
  console.log(`[book] ${name}: ${report.overall}`);
  if (report.checks.some((item) => item.status === 'FAIL')) process.exitCode = 1;
}
