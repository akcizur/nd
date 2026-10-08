import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['public/assets-source', 'public/assets'];
const executable = process.platform === 'win32'
  ? join('node_modules', '.bin', 'gltf-transform.cmd')
  : join('node_modules', '.bin', 'gltf-transform');

function walk(dir) {
  if (!existsSync(dir)) return [];

  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }

  return files;
}

const files = roots
  .flatMap(walk)
  .filter(file => ['.glb', '.gltf'].includes(extname(file).toLowerCase()));

if (!files.length) {
  console.log('No glTF assets found.');
  process.exit(0);
}

for (const file of files) {
  const sizeMb = statSync(file).size / 1024 / 1024;
  console.log(`\\n=== ${file} (${sizeMb.toFixed(2)} MB) ===`);

  const result = spawnSync(
    executable,
    ['inspect', file],
    { stdio: 'inherit', shell: false }
  );

  if (result.status !== 0) process.exitCode = 1;
}
