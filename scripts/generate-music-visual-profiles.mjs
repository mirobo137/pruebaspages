import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const analysisRoot = path.join('content', 'music', 'analysis');
const outputRoot = path.join('public', 'assets', 'music-visuals');
const files = (await readdir(analysisRoot)).filter((file) => file.endsWith('.json')).sort();
await mkdir(outputRoot, { recursive: true });
const trackIds = [];

for (const fileName of files) {
  const analysisText = await readFile(path.join(analysisRoot, fileName), 'utf8');
  const analysis = JSON.parse(analysisText);
  const frames = [];
  for (let start = 0; start < analysis.duration; start += 1) {
    const members = analysis.energyFrames.filter((frame) => frame.time >= start && frame.time < start + 1);
    const intensity = members.length === 0 ? 0 : members.reduce((sum, frame) => (
      sum + frame.volume * .3 + frame.low * .35 + frame.mid * .25 + frame.high * .1
    ), 0) / members.length;
    frames.push({ time: rounded(start), intensity: rounded(intensity) });
  }
  const profile = {
    schemaVersion: 1,
    trackId: analysis.trackId,
    generatorVersion: 'music-visual-profile-m5-v1',
    analysisHash: createHash('sha256').update(analysisText, 'utf8').digest('hex'),
    duration: analysis.duration,
    frameStep: 1,
    frames,
  };
  trackIds.push(analysis.trackId);
  await writeFile(
    path.join(outputRoot, `${analysis.trackId}.json`),
    `${JSON.stringify(profile, null, 2)}\n`,
    'utf8',
  );
}
await writeFile(path.join(outputRoot, 'index.json'), `${JSON.stringify({
  schemaVersion: 1,
  generatorVersion: 'music-visual-profile-m5-v1',
  tracks: trackIds,
}, null, 2)}\n`, 'utf8');
console.log(`M5 visual profiles: ${files.length} pista(s).`);

function rounded(value) {
  return Number(value.toFixed(6));
}
