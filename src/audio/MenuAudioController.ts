import type { MusicTrack } from '../content/MusicCatalog';
import { MENU_TRACK_PREVIEW_SECONDS } from '../content/MenuMusic';
import { AudioManager } from './AudioManager';

type MenuAudioMode = 'stopped' | 'menu' | 'preview';

export class MenuAudioController {
  private menuTrack: MusicTrack | null = null;
  private mode: MenuAudioMode = 'stopped';
  private timer: number | null = null;
  private operationToken = 0;

  constructor(private readonly audio: AudioManager) {}

  setMenuTrack(track: MusicTrack | null): void {
    this.menuTrack = track;
  }

  start(): void {
    if (!this.menuTrack || this.mode === 'menu') return;
    const token = this.beginOperation('menu');
    void this.audio.play(this.menuTrack, { loop: true }).catch((error: unknown) => {
      if (token !== this.operationToken) return;
      this.mode = 'stopped';
      console.warn('No se pudo iniciar la musica del menu.', error);
    });
  }

  preview(track: MusicTrack, seconds = MENU_TRACK_PREVIEW_SECONDS): void {
    const token = this.beginOperation('preview');
    const safeSeconds = Math.max(0.5, seconds);

    void this.audio.play(track, {
      startOffset: 0,
      clipDuration: safeSeconds,
    }).then(() => {
      if (token !== this.operationToken) return;
      this.timer = window.setTimeout(() => {
        if (token !== this.operationToken) return;
        this.mode = 'stopped';
        this.start();
      }, safeSeconds * 1000);
    }).catch((error: unknown) => {
      if (token !== this.operationToken) return;
      console.warn('No se pudo reproducir el preview de la cancion.', error);
      this.mode = 'stopped';
      this.start();
    });
  }

  stop(): void {
    this.beginOperation('stopped');
    this.audio.stop();
  }

  destroy(): void {
    this.beginOperation('stopped');
  }

  private beginOperation(mode: MenuAudioMode): number {
    this.operationToken += 1;
    this.mode = mode;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    return this.operationToken;
  }
}
