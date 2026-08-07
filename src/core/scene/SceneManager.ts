import type { Container } from 'pixi.js';
import type { Scene } from './Scene';

export class SceneManager {
  private activeScene: Scene | null = null;

  constructor(private readonly host: Container) {}

  switchTo(nextScene: Scene): void {
    this.activeScene?.unmount();

    if (this.activeScene?.root.parent === this.host) {
      this.host.removeChild(this.activeScene.root);
    }

    this.activeScene = nextScene;
    this.host.addChild(nextScene.root);
    nextScene.mount();
  }

  update(deltaSeconds: number): void {
    this.activeScene?.update(deltaSeconds);
  }

  resize(width: number, height: number): void {
    this.activeScene?.resize(width, height);
  }

  destroy(): void {
    this.activeScene?.unmount();
    this.activeScene?.root.destroy({ children: true });
    this.activeScene = null;
  }
}

