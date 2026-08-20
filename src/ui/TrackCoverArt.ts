import { Container, Graphics } from 'pixi.js';

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class TrackCoverArt extends Container {
  private readonly plate = new Graphics();
  private readonly disc = new Graphics();
  private readonly ring = new Graphics();
  private trackId = '';
  private accent = 0x62efff;
  private secondary = 0xff5bd8;
  private coverSize = 56;
  private previewProgress: number | null = null;
  private spin = 0;

  constructor() {
    super();
    this.eventMode = 'none';
    this.disc.blendMode = 'add';
    this.ring.blendMode = 'add';
    this.addChild(this.plate, this.disc, this.ring);
  }

  setTrack(trackId: string, accent: number, secondary: number): void {
    if (this.trackId === trackId && this.accent === accent && this.secondary === secondary) return;
    this.trackId = trackId;
    this.accent = accent;
    this.secondary = secondary;
    this.drawStatic();
  }

  setSize(size: number): void {
    if (this.coverSize === size) return;
    this.coverSize = size;
    this.drawStatic();
    this.drawRing();
  }

  setPreview(progress: number | null): void {
    this.previewProgress = progress;
    this.drawRing();
  }

  update(deltaSeconds: number): void {
    if (this.previewProgress === null) {
      this.disc.rotation *= 0.86;
      return;
    }
    this.spin += deltaSeconds * (1.2 + this.previewProgress * 1.6);
    this.disc.rotation = this.spin;
  }

  private drawStatic(): void {
    const size = this.coverSize;
    const hash = hashString(this.trackId || 'track');
    const center = size / 2;
    this.plate.clear()
      .roundRect(0, 0, size, size, size * 0.22)
      .fill({ color: 0x0a1426 })
      .stroke({ color: this.accent, alpha: 0.55, width: 1.2 });
    this.plate.circle(center + ((hash >> 3) % 11) - 5, center - size * 0.16, size * 0.4)
      .fill({ color: this.accent, alpha: 0.28 });
    this.plate.circle(center - size * 0.14, center + size * 0.18, size * 0.26)
      .fill({ color: this.secondary, alpha: 0.2 });
    this.plate.circle(center, center, size * 0.12)
      .fill({ color: 0x050816, alpha: 0.55 })
      .stroke({ color: this.accent, alpha: 0.9, width: 1.1 });
    this.disc.clear();
    this.disc.position.set(center, center);
    this.disc.circle(0, 0, size * 0.2).stroke({ color: 0xffffff, alpha: 0.16, width: 0.8 });
    this.disc.circle(0, 0, 2).fill({ color: this.secondary, alpha: 0.95 });
    this.drawRing();
  }

  private drawRing(): void {
    const size = this.coverSize;
    const center = size / 2;
    const radius = size / 2 - 2.4;
    this.ring.clear().circle(center, center, radius)
      .stroke({ color: 0xffffff, alpha: 0.08, width: 2 });
    if (this.previewProgress === null || this.previewProgress <= 0) return;
    const start = -Math.PI / 2;
    const sweep = this.previewProgress * Math.PI * 2;
    this.ring
      .beginPath()
      .moveTo(center + Math.cos(start) * radius, center + Math.sin(start) * radius)
      .arc(center, center, radius, start, start + sweep)
      .stroke({ color: 0xff66da, alpha: 0.95, width: 2.4, cap: 'round' });
  }
}
