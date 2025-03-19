import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { copy } from 'fs-extra';

// Copy JSON files to dist
await copy('film_details_cache.json', 'dist/film_details_cache.json');
await copy('film_list_cache.json', 'dist/film_list_cache.json');
await copy('film_sections_map.json', 'dist/film_sections_map.json');
await copy('sections_cache.json', 'dist/sections_cache.json');

await esbuild.build({
  entryPoints: ['src/data/index.ts', 'src/main.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  sourcemap: true,
});