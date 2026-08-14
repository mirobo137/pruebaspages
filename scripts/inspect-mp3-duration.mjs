import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMp3Duration } from './lib/mp3-duration.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedPath = process.argv[2];
if (!requestedPath) throw new Error('Uso: npm run music:duration -- <ruta.mp3>');
const filePath = path.resolve(projectRoot, requestedPath);
const result = await readMp3Duration(filePath);
console.log(`${requestedPath}: ${result.duration.toFixed(6)} s (${result.frames} frames)`);
