import type { MusicTrack } from './MusicCatalog';

export interface MusicVisualProfile {
  schemaVersion: 1;
  trackId: string;
  generatorVersion: string;
  analysisHash: string;
  duration: number;
  frameStep: number;
  frames: Array<{ time: number; intensity: number }>;
}

let profileIndexPromise: Promise<Set<string>> | null = null;

export async function loadMusicVisualProfile(
  track: MusicTrack,
): Promise<MusicVisualProfile | null> {
  const availableTracks = await loadMusicVisualProfileIndex();
  if (!availableTracks.has(track.id)) return null;
  const response = await fetch(new URL(
    `./assets/music-visuals/${track.id}.json`,
    document.baseURI,
  ));
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    return null;
  }
  try {
    const profile = await response.json() as MusicVisualProfile;
    return profile.schemaVersion === 1 && profile.trackId === track.id ? profile : null;
  } catch {
    return null;
  }
}

async function loadMusicVisualProfileIndex(): Promise<Set<string>> {
  if (profileIndexPromise) return profileIndexPromise;
  profileIndexPromise = fetch(new URL('./assets/music-visuals/index.json', document.baseURI))
    .then(async (response) => {
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        return new Set<string>();
      }
      const index = await response.json() as { schemaVersion?: number; tracks?: unknown };
      return index.schemaVersion === 1 && Array.isArray(index.tracks)
        ? new Set(index.tracks.filter((track): track is string => typeof track === 'string'))
        : new Set<string>();
    })
    .catch(() => new Set<string>());
  return profileIndexPromise;
}

export function sampleMusicVisualIntensity(
  profile: MusicVisualProfile | null,
  time: number,
  phaseIndex: number,
): number {
  if (!profile || profile.frames.length === 0) {
    return [.36, .64, .88][phaseIndex] ?? .36;
  }
  const position = Math.max(0, time) / profile.frameStep;
  const leftIndex = Math.min(profile.frames.length - 1, Math.floor(position));
  const rightIndex = Math.min(profile.frames.length - 1, leftIndex + 1);
  const progress = Math.max(0, Math.min(1, position - leftIndex));
  const intensity = profile.frames[leftIndex].intensity
    + (profile.frames[rightIndex].intensity - profile.frames[leftIndex].intensity) * progress;
  return Math.max(.2, Math.min(1, intensity));
}
