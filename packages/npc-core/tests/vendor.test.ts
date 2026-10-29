/**
 * Provenance lock for the vendored planner: the shipped JS must stay
 * byte-identical to the M0-locked upstream tarballs (see vendor/VENDOR.md).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));

function sha256(relativePath: string): string {
  return createHash('sha256').update(readFileSync(root + relativePath)).digest('hex');
}

describe('vendored planner provenance', () => {
  it('keeps the upstream goap-minimal code byte-identical', () => {
    expect(sha256('vendor/goap-minimal/esm/index.js')).toBe(
      '1615964dafebd6c7a9ab2744f090b9b89130c99cee289103e23dfdd5cfd0ec19',
    );
  });

  it('keeps the upstream astar-minimal code byte-identical', () => {
    expect(sha256('vendor/astar-minimal/esm/index.js')).toBe(
      '58c53311db2732ada178c0944e43a6205b7f5816bf0e4f9aff72e36a578eb83e',
    );
  });

  it('ships the MIT licence texts', () => {
    expect(readFileSync(root + 'vendor/goap-minimal/LICENSE', 'utf8')).toContain('MIT License');
    expect(readFileSync(root + 'vendor/astar-minimal/LICENSE', 'utf8')).toContain('MIT License');
  });
});
