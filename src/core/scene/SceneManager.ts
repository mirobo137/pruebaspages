import type { Container } from 'pixi.js';
import type { Scene } from './Scene';
import type { VisualQualityProfile } from '../../customization/VisualQuality';

export class SceneManager {
  private activeScene: Scene | null = null;

  constructor(private readonly host: Container) {}

  switchTo(nextScene: Scene): void {
    const previousScene = this.activeScene;
    previousScene?.unmount();

    if (previousScene?.root.parent === this.host) {
      this.host.removeChild(previousScene.root);
    }
    previousScene?.root.destroy({ children: true });

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

  setVisualQuality(quality: VisualQualityProfile): void {
    this.activeScene?.setVisualQuality?.(quality);
  }

  destroy(): void {
    this.activeScene?.unmount();
    this.activeScene?.root.destroy({ children: true });
    this.activeScene = null;
  }
}
