import { readFile, stat, writeFile } from 'node:fs/promises';

const approved = await readJson('content/music/approved-beatmaps.json');
const approvedIds = new Set(approved.tracks.map((track) => track.trackId));
const rows = [];
let totalAudioBytes = 0;
for (const approvedTrack of approved.tracks) {
  const id = approvedTrack.trackId;
  const analysis = await readJson(`content/music/analysis/${id}.json`);
  const metadata = await readJson(`content/music/metadata/${id}.json`);
  const documents = await Promise.all(['easy', 'medium', 'hard'].map(
    (difficulty) => readJson(`public/assets/beatmaps/${id}/${difficulty}.json`),
  ));
  const audioBytes = (await stat(metadata.webAudioPath.replace(/^\.\//, 'public/'))).size;
  totalAudioBytes += audioBytes;
  rows.push([
    metadata.title,
    analysis.bpm.toFixed(1),
    formatDuration(analysis.duration),
    documents.map((document) => document.events.length).join('/'),
    documents[2].events.filter((event) => event.kind === 'drag').length,
    approvedIds.has(id) ? 'Bloqueada' : 'Preview pendiente',
  ]);
}

const markdown = `# M6 - estado de curacion y salida

Generado por \`npm run music:release-report\`. No sustituye la prueba fisica.

## Matriz de canciones

| Cancion | BPM analizado | Duracion | Notas E/M/H | Drags Hard | Estado |
|---|---:|---:|---:|---:|---|
${rows.map((row) => `| ${row.join(' | ')} |`).join('\n')}

## Presupuesto actual del lote M6

- Audio del lote oficial M6: ${(totalAudioBytes / 1024 / 1024).toFixed(2)} MiB.
- Mapas disponibles: ${rows.length * 3} oficiales y sus previews de diagnostico.
- Mapas aprobados y protegidos: ${approved.tracks.length * 3}.
- Cobertura de tempo: ${Math.min(...rows.map((row) => Number(row[1]))).toFixed(1)}-${Math.max(...rows.map((row) => Number(row[1]))).toFixed(1)} BPM.

## Estado de compuertas

- PC, touch, dificultades, audio, FLOW, derrota, fullscreen y rendimiento: aprobados por el usuario el 2026-08-17.
- Las seis pistas fueron promovidas, jugadas y bloqueadas; regenerar no las altera.
- Peso, primer inicio y cambio de cancion: aprobados localmente y en GitHub Pages.
- Editor visual: no se justifica por ahora; el pipeline automatico cubre el alta normal.
- Pendiente externo: CrazyGames Preview Tool y Poki Inspector.
`;
await writeFile('docs/music-intelligence/M6_CURATION_STATUS.md', markdown, 'utf8');
console.log(`M6 report: ${rows.length} canciones, ${(totalAudioBytes / 1024 / 1024).toFixed(2)} MiB de audio.`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(relativePath, 'utf8'));
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}
