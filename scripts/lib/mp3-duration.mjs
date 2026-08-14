import { readFile } from 'node:fs/promises';

const MPEG1_LAYER3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const MPEG2_LAYER3_BITRATES = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];
const SAMPLE_RATES = [44_100, 48_000, 32_000];

function id3v2Size(data) {
  if (data.length < 10 || data.toString('ascii', 0, 3) !== 'ID3') return 0;
  return 10
    + ((data[6] & 0x7f) << 21)
    + ((data[7] & 0x7f) << 14)
    + ((data[8] & 0x7f) << 7)
    + (data[9] & 0x7f);
}

function parseFrameHeader(data, offset) {
  if (offset + 4 > data.length || data[offset] !== 0xff || (data[offset + 1] & 0xe0) !== 0xe0) {
    return null;
  }
  const versionBits = (data[offset + 1] >> 3) & 0x03;
  const layerBits = (data[offset + 1] >> 1) & 0x03;
  const bitrateIndex = (data[offset + 2] >> 4) & 0x0f;
  const sampleRateIndex = (data[offset + 2] >> 2) & 0x03;
  const padding = (data[offset + 2] >> 1) & 0x01;
  if (
    versionBits === 1
    || layerBits !== 1
    || bitrateIndex === 0
    || bitrateIndex === 15
    || sampleRateIndex === 3
  ) return null;

  const mpeg1 = versionBits === 3;
  const divisor = versionBits === 0 ? 4 : versionBits === 2 ? 2 : 1;
  const sampleRate = SAMPLE_RATES[sampleRateIndex] / divisor;
  const bitrate = (mpeg1 ? MPEG1_LAYER3_BITRATES : MPEG2_LAYER3_BITRATES)[bitrateIndex];
  const samples = mpeg1 ? 1_152 : 576;
  const frameLength = Math.floor((mpeg1 ? 144 : 72) * bitrate * 1_000 / sampleRate + padding);
  if (frameLength < 24) return null;
  return { frameLength, sampleRate, samples };
}

export async function readMp3Duration(filePath) {
  const data = await readFile(filePath);
  let offset = id3v2Size(data);
  let frames = 0;
  let duration = 0;
  let consecutiveMisses = 0;
  while (offset + 4 <= data.length) {
    const header = parseFrameHeader(data, offset);
    if (!header) {
      offset += 1;
      consecutiveMisses += 1;
      if (frames > 0 && consecutiveMisses > 4_096) break;
      continue;
    }
    consecutiveMisses = 0;
    frames += 1;
    duration += header.samples / header.sampleRate;
    offset += header.frameLength;
  }
  if (frames === 0 || duration <= 0) throw new Error(`No se encontraron tramas MP3 en ${filePath}.`);
  return { duration, frames };
}
