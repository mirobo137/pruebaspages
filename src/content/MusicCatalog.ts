export interface MusicTrack {
  id: string;
  title: string;
  audioPath: string;
  beatmapPath: string;
  bpm?: number;
}

export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  prototype: {
    id: 'prototype',
    title: 'Prototype Track',
    audioPath: './assets/audio/prototype.mp3',
    beatmapPath: './assets/beatmaps/prototype.json',
  },
};

