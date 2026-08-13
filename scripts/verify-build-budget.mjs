import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const MAX_CHUNK_BYTES = 500_000;
const assetsDirectory = path.resolve('dist/assets');
const files = await readdir(assetsDirectory);
const javascriptChunks = await Promise.all(
  files
    .filter((file) => file.endsWith('.js'))
    .map(async (file) => ({
      file,
      bytes: (await stat(path.join(assetsDirectory, file))).size,
    })),
);
const oversized = javascriptChunks.filter((chunk) => chunk.bytes > MAX_CHUNK_BYTES);
if (oversized.length > 0) {
  for (const chunk of oversized) {
    console.error(`${chunk.file}: ${(chunk.bytes / 1000).toFixed(2)} kB`);
  }
  throw new Error(`Uno o mas chunks superan ${MAX_CHUNK_BYTES / 1000} kB.`);
}

const largest = javascriptChunks.sort((left, right) => right.bytes - left.bytes)[0];
console.log(
  `Bundle budget: OK (${largest.file}, ${(largest.bytes / 1000).toFixed(2)} kB maximo)`,
);
