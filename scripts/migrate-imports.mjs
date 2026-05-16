#!/usr/bin/env node
// One-shot migration: rewrite relative imports under src/ to use the
// `@/` alias. Idempotent — running twice is a no-op. Same-directory
// imports (`./Foo`) are left alone since they're already short.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(fileURLToPath(import.meta.url), '../../src');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const IMPORT_RE = /(from\s+['"]|import\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"])/g;

let totalEdits = 0;
let touchedFiles = 0;

for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');
  let edits = 0;
  const after = before.replace(IMPORT_RE, (_, head, spec, tail) => {
    // Keep same-directory imports as-is.
    if (spec.startsWith('./')) return `${head}${spec}${tail}`;
    const abs = resolve(dirname(file), spec);
    const rel = relative(SRC, abs).replace(/\\/g, '/');
    if (rel.startsWith('..')) {
      // Import escapes src/ — leave untouched.
      return `${head}${spec}${tail}`;
    }
    edits += 1;
    return `${head}@/${rel}${tail}`;
  });
  if (edits > 0) {
    writeFileSync(file, after);
    totalEdits += edits;
    touchedFiles += 1;
  }
}

console.log(`Rewrote ${totalEdits} imports across ${touchedFiles} files.`);
