import { Application, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { GameScene } from '../scenes/GameScene';
import { SceneManager } from '../core/scene/SceneManager';

export class GameApplication {
  private readonly app = new Application();
  private readonly sceneHost = new Container();
  private readonly sceneManager = new SceneManager(this.sceneHost);
  private readonly tick = (ticker: Ticker): void => {
    this.sceneManager.update(ticker.deltaTime / 60);
  };
  private readonly handleResize = (): void => {
    this.sceneManager.resize(this.app.screen.width, this.app.screen.height);
  };

  constructor(private readonly mountElement: HTMLElement) {}

  async start(): Promise<void> {
    await this.app.init({
      antialias: true,
      autoDensity: true,
      backgroundColor: 0x0b1022,
      resolution: Math.min(window.devicePixelRatio, 2),
      resizeTo: window,
    });

    this.mountElement.appendChild(this.app.canvas);
    this.app.stage.addChild(this.sceneHost);
    this.sceneManager.switchTo(
      new GameScene(this.app.screen.width, this.app.screen.height),
    );

    this.app.ticker.add(this.tick);
    window.addEventListener('resize', this.handleResize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.app.ticker.remove(this.tick);
    this.sceneManager.destroy();
    this.app.destroy(true);
  }
}

