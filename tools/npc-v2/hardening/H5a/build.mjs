import { build } from '../../../../packages/npc-three/node_modules/esbuild/lib/main.js';
import { fileURLToPath } from 'node:url';
await build({ entryPoints: [fileURLToPath(new URL('./adapter.ts', import.meta.url))], outfile: fileURLToPath(new URL('./dist/adapter.js', import.meta.url)), bundle: true, format: 'esm', platform: 'browser', target: 'es2022' });
console.log('H5 isolated adapter built; no old page or bundle written');
