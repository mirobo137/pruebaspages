import type { Container } from 'pixi.js';

export interface Scene {
  readonly id: string;
  readonly root: Container;
  mount(): void;
  update(deltaSeconds: number): void;
  resize(width: number, height: number): void;
  unmount(): void;
}

