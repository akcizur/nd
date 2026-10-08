import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceRoot = 'public/assets-source';
const outputRoot = 'public/assets';

const executable = process.platform === 'win32'
  ? join('node_modules', '.bin', 'gltf-transform.cmd')
  : join('node_modules', '.bin', 'gltf-transform');

function walk(dir) {
  if (!existsSync(dir)) return [];

  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else {
      files.push(path);
    }
  }

  return files;
}

const sources = walk(sourceRoot)
  .filter(file => ['.glb', '.gltf'].includes(extname(file).toLowerCase()));

if (!sources.length) {
  console.log(`No glTF assets found in ${sourceRoot}/`);
  console.log('Create the directory and place source .glb/.gltf files there.');
  process.exit(0);
}

mkdirSync(outputRoot, { recursive: true });

let failed = 0;

for (const input of sources) {
  const output = join(outputRoot, relative(sourceRoot, input));
  mkdirSync(dirname(output), { recursive: true });

  const result = spawnSync(
    executable,
    [
      'optimize',
      input,
      output,
      '--compress',
      'meshopt',
      '--texture-compress',
      'webp',
    ],
    { stdio: 'inherit', shell: false }
  );

  if (result.status !== 0) {
    failed += 1;
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`Optimized ${sources.length} asset(s).`);
}
