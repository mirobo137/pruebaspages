import { readdir, readFile, stat, writeFile } from 'node:fs/promises';

const analysisFiles = (await readdir('content/music/analysis'))
  .filter((file) => file.endsWith('.json'))
  .sort();
const approved = await readJson('content/music/approved-beatmaps.json');
const approvedIds = new Set(approved.tracks.map((track) => track.trackId));
const rows = [];
let totalAudioBytes = 0;
for (const fileName of analysisFiles) {
  const id = fileName.replace(/\.json$/, '');
  const analysis = await readJson(`content/music/analysis/${fileName}`);
  const metadata = await readJson(`content/music/metadata/${id}.json`);
  const summary = await readJson(`public/assets/beatmap-previews/m4/${id}/summary.json`);
  const audioBytes = (await stat(metadata.webAudioPath.replace(/^\.\//, 'public/'))).size;
  totalAudioBytes += audioBytes;
  rows.push([
    metadata.title,
    analysis.bpm.toFixed(1),
    formatDuration(analysis.duration),
    `${summary.counts.easy.candidate}/${summary.counts.medium.candidate}/${summary.counts.hard.candidate}`,
    summary.counts.hard.drags,
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

- Audio de las seis candidatas: ${(totalAudioBytes / 1024 / 1024).toFixed(2)} MiB.
- Mapas disponibles: ${rows.length * 3} previews; tres dificultades por cancion.
- Mapas aprobados y protegidos: ${approved.tracks.length * 3}.
- Cobertura de tempo: ${Math.min(...rows.map((row) => Number(row[1]))).toFixed(1)}-${Math.max(...rows.map((row) => Number(row[1]))).toFixed(1)} BPM.

## Compuertas humanas pendientes

- Jugar cada dificultad completa en mouse y touch; registrar precision, combo, fallos de drag y FLOW.
- Confirmar secciones y metadata antes de promover cada candidata.
- Medir memoria, primer inicio y cambio de cancion en movil real.
- Repetir en GitHub Pages y en el portal objetivo.
- Decidir sobre editor solo despues de contabilizar correcciones manuales recurrentes.
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
