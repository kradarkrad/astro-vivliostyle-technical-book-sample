import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const config = JSON.parse(readFileSync(resolve(root, 'profiles.json'), 'utf8'));

function merge(left, right) {
  if (!right || typeof right !== 'object' || Array.isArray(right)) return right ?? left;
  const result = left && typeof left === 'object' && !Array.isArray(left)
    ? { ...left }
    : {};
  for (const [key, value] of Object.entries(right)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? merge(result[key], value)
      : value;
  }
  return result;
}

function resolveProfile(name, stack = []) {
  const raw = config.profiles?.[name];
  if (!raw) throw new Error(`Unknown book output profile: ${name}`);
  if (stack.includes(name)) throw new Error(`Circular profile inheritance: ${[...stack, name].join(' -> ')}`);

  const parent = raw.extends ? resolveProfile(raw.extends, [...stack, name]) : {};
  const merged = merge(merge(config.defaults, parent), raw);
  const printerId = merged.printerId;
  const printer = printerId
    ? JSON.parse(readFileSync(resolve(root, 'printers', `${printerId}.json`), 'utf8'))
    : null;
  const product = printer && merged.productId
    ? printer.products?.[merged.productId]
    : null;
  const requirements = merge(
    merge(printer?.products?.general?.requirements, printer?.requirements),
    product?.requirements
  );
  const resolved = merge(merged, {
    requirements,
    printer: printer ? {
      id: printer.id,
      company: printer.company,
      verifiedOn: printer.verifiedOn,
      sourceUrls: printer.sourceUrls,
      notes: printer.notes
    } : null,
    product: product ? {
      id: product.id,
      label: product.label,
      printMethod: product.printMethod,
      binding: product.binding,
      paper: product.paper
    } : null,
    inheritance: {
      defaults: 'profiles.json#defaults',
      parent: raw.extends ?? null,
      printer: printerId ? `printers/${printerId}.json` : null,
      product: product ? `${printerId}.${product.id}` : null,
      overrides: name
    }
  });
  const unknown = [];
  function collectUnknown(value, path) {
    if (value === 'unknown' || value === null) unknown.push(path);
    else if (Array.isArray(value)) value.forEach((item, index) => collectUnknown(item, `${path}[${index}]`));
    else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => collectUnknown(item, `${path}.${key}`));
    }
  }
  collectUnknown(resolved.requirements, 'requirements');
  resolved.unknownRequirements = unknown;
  resolved.submissionReady = unknown.length === 0;
  return resolved;
}

export { config, resolveProfile };
