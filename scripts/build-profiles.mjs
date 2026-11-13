import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, resolveProfile } from './profile-resolver.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const book = JSON.parse(readFileSync(resolve(root, 'book.json'), 'utf8'));
const requested = process.argv.slice(2);
const selected = requested[0] === '--profile' ? requested.slice(1) : requested;
const names = selected.length > 0 ? selected : Object.keys(config.profiles);
const cli = resolve(root, 'node_modules/.bin/vivliostyle.cmd');
const run = (command, args) => {
  if (process.platform === 'win32') {
    const quote = (value) => `"${String(value).replaceAll('"', '\\"')}"`;
    const arg = (value) => /^[\w.,/:\\-]+$/.test(String(value)) ? String(value) : quote(value);
    const executable = command.includes(' ') ? quote(command) : command;
    execFileSync(process.env.ComSpec, ['/d', '/s', '/c', [executable, ...args.map(arg)].join(' ')], {
      cwd: root,
      stdio: 'inherit'
    });
    return;
  }
  execFileSync(command, args, { cwd: root, stdio: 'inherit' });
};

run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:book:html']);

for (const name of names) {
  const profile = resolveProfile(name);

  const output = resolve(root, profile.output);
  const reportBase = resolve(root, profile.report);
  mkdirSync(resolve(output, '..'), { recursive: true });
  mkdirSync(resolve(reportBase, '..'), { recursive: true });
  const resolvedPath = `${reportBase}-resolved.json`;
  const resolvedForReport = {
    profile: name,
    ...profile,
    generatedAt: new Date().toISOString()
  };
  writeFileSync(resolvedPath, `${JSON.stringify(resolvedForReport, null, 2)}\n`);
  const args = [
    'build',
    resolve(root, profile.source),
    '--output', output,
    '--size', profile.size,
    '--title', book.title,
    '--language', 'ja'
  ];
  if (profile.cropMarks) args.push('--crop-marks', '--bleed', `${profile.bleedMm}mm`);
  if (profile.preflight) args.push('--preflight', profile.preflight);
  if (profile.cmyk) args.push('--cmyk');

  console.log(`[book] building ${name}: ${args.join(' ')}`);
  run(cli, args);
}

run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'validate:book:pdf']);
