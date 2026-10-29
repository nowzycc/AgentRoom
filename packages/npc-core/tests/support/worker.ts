/**
 * Test-only adapters around a real Worker: the planner worker bundle is built
 * with esbuild from `src/planner/worker-entry.ts`, then executed through
 * `node:worker_threads`. Nothing here is imported by production code, so
 * `npc-core` stays platform-neutral (M4 supplies a browser Worker factory).
 */
import { Worker } from 'node:worker_threads';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlannerWorkerFactory, PlannerWorkerLike } from '../../src/planner/worker-planner.js';

const here = dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = resolve(here, '../..');
export const DEFAULT_WORKER_PATH = resolve(PACKAGE_ROOT, 'dist/planner-worker.mjs');

export interface BundleResult {
  path: string;
  bytes: number;
  text: string;
}

export async function buildPlannerWorker(
  outfile: string = DEFAULT_WORKER_PATH,
  platform: 'node' | 'browser' = 'node',
): Promise<BundleResult> {
  if (platform === 'node') mkdirSync(dirname(outfile), { recursive: true });
  const result = await build({
    entryPoints: [resolve(PACKAGE_ROOT, 'src/planner/worker-entry.ts')],
    outfile: platform === 'browser' ? undefined : outfile,
    write: platform === 'browser' ? false : true,
    bundle: true,
    format: 'esm',
    platform,
    target: platform === 'browser' ? 'es2020' : 'node20',
    sourcemap: false,
    logLevel: 'silent',
  });
  const text = platform === 'browser' ? (result.outputFiles?.[0]?.text ?? '') : '';
  if (platform === 'browser') return { path: '', bytes: text.length, text };
  const bytes = (await import('node:fs')).statSync(outfile).size;
  // The Worker itself runs a tiny Node adapter that imports the neutral bundle.
  return { path: resolve(PACKAGE_ROOT, 'tests/support/node-worker-entry.mjs'), bytes, text };
}

export function nodeWorkerFactory(path: string): PlannerWorkerFactory {
  return () => {
    const worker = new Worker(path);
    let onMessage: ((msg: unknown) => void) | null = null;
    let onError: ((err: unknown) => void) | null = null;
    worker.on('message', (msg) => onMessage?.(msg));
    worker.on('error', (err) => onError?.(err));
    const like: PlannerWorkerLike = {
      postMessage: (msg) => worker.postMessage(msg),
      terminate: () => worker.terminate(),
      onMessage: (cb) => {
        onMessage = cb;
      },
      onError: (cb) => {
        onError = cb;
      },
    };
    return like;
  };
}
