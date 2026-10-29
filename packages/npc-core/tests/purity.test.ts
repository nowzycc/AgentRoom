import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * npc-core must stay a pure domain package: M2-M5 will bundle it into workers
 * and the browser, so a renderer/DOM/node import here is an architectural
 * regression, not a style issue.
 */
describe('npc-core purity', () => {
  const files = sourceFiles(SRC);

  it('has no renderer, DOM or node builtin imports', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of [
        /from\s+['"]three['"]/,
        /from\s+['"]three\//,
        /from\s+['"](?:node:)?(?:fs|fs\/promises|net|http|https|worker_threads)['"]/,
        /\bdocument\s*\./,
        /\bwindow\s*\./,
        /\bnew\s+Worker\b/,
        /\bHTMLCanvasElement\b/,
      ]) {
        if (pattern.test(text)) offenders.push(`${file}: ${String(pattern)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('reads no wall clock inside the domain except the injectable store and planner-host boundary', () => {
    // The domain reducer receives all time through events. DomainStore owns the
    // injectable wall clock. WorkerPlanner is the explicit impure host boundary
    // (budget/termination) and takes `now` as an option; nothing else may read
    // a clock.
    const hostBoundary = new Set([join(SRC, 'planner', 'worker-planner.ts')]);
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith(join('domain', 'store.ts')) || hostBoundary.has(file)) continue;
      const text = readFileSync(file, 'utf8');
      if (/Date\.now\s*\(|performance\.now\s*\(|new Date\s*\(/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the contract dependency type-only (no ajv or schema loader in the runtime bundle)', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (/from\s+['"]@npc\/contracts['"]/.test(text) && !/import\s+type\s/.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
