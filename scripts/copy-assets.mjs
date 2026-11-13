import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'public/assets');

for (const edition of ['print', 'print-body', 'ebook']) {
  const destination = resolve(root, 'dist-book', edition, 'assets');
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
}
