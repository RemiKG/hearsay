// Bundle the Node/Hono server to a single ESM file for production (`node dist-server/index.js`).
// Keeps the runtime image small and dependency-light. The client is built separately by Vite.
import { build } from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('dist-server', { recursive: true, force: true });

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist-server/index.js',
  // Hono + node-server bundle cleanly; keep nothing external so the image is self-contained.
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});

console.log('server bundled -> dist-server/index.js');
