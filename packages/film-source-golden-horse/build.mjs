import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/data/index.ts', 'src/main.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  sourcemap: true,
});