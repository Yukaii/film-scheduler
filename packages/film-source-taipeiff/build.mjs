import * as esbuild from 'esbuild';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function cleanDist() {
  const distDir = path.join(__dirname, 'dist');
  try {
    await fs.rm(distDir, { recursive: true, force: true });
    console.log('Cleaned dist directory.');
  } catch (error) {
    console.error('Error cleaning dist directory:', error);
  }
}

async function copyDataDirectory() {
  const srcDataDir = path.join(__dirname, 'src/data');
  const distDataDir = path.join(__dirname, 'dist/data');

  try {
    // Create dist/data if it doesn't exist
    await fs.mkdir(distDataDir, { recursive: true });

    // Copy data directory contents recursively
    async function copyDir(src, dest) {
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          await copyDir(srcPath, destPath);
        } else {
          // Only copy non-TypeScript files; .ts files are handled by compilation
          if (!entry.name.endsWith('.ts')) {
            await fs.copyFile(srcPath, destPath);
          }
        }
      }
    }

    await copyDir(srcDataDir, distDataDir);
  } catch (error) {
    console.error('Error copying data directory:', error);
  }
}

// Clean dist directory
await cleanDist();

// Compile TypeScript first to generate declarations
console.log('Compiling TypeScript...');
await execAsync('tsc');

// Then bundle with esbuild
console.log('Bundling with esbuild...');
await esbuild.build({
  entryPoints: ['src/data/index.ts', 'src/main.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  sourcemap: true,
  loader: {
    '.json': 'json'
  },
  external: [
    'path',
    'fs/promises',
    'url',
    'util',
    'child_process',
    'jsdom',
    'node-fetch',
    'inquirer'
  ]
});

await copyDataDirectory();
console.log('Build complete!');
