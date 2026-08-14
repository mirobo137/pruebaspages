import type { Container } from 'pixi.js';
import type { VisualQualityProfile } from '../../customization/VisualQuality';

export interface Scene {
  readonly id: string;
  readonly root: Container;
  mount(): void;
  update(deltaSeconds: number): void;
  resize(width: number, height: number): void;
  setVisualQuality?(quality: VisualQualityProfile): void;
  unmount(): void;
}

