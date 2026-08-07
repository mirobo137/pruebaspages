import { Application, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { AudioManager } from '../audio/AudioManager';
import { loadBeatmap } from '../content/Beatmap';
import type { TrackSelection } from '../content/TrackSelection';
import { loadMusicCatalog } from '../content/MusicCatalog';
import { SceneManager } from '../core/scene/SceneManager';
import type { GameMode } from '../game/modes/GameMode';
import { ProgressionStore } from '../progression/ProgressionStore';
import { GameScene } from '../scenes/GameScene';
import { MenuScene } from '../scenes/MenuScene';
import { ResultScene } from '../scenes/ResultScene';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import type { FlowSnapshot } from '../game/flow/FlowModel';

export class GameApplication {
  private readonly app = new Application();
  private readonly sceneHost = new Container();
  private readonly sceneManager = new SceneManager(this.sceneHost);
  private readonly audioManager = new AudioManager();
  private readonly progression = new ProgressionStore();
  private tracks: TrackSelection[] = [];
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
    this.tracks = await this.loadMusic();
    this.showMenu();

    this.app.ticker.add(this.tick);
    window.addEventListener('resize', this.handleResize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.app.ticker.remove(this.tick);
    this.sceneManager.destroy();
    this.audioManager.destroy();
    this.app.destroy(true);
  }

  private showMenu = (): void => {
    this.sceneManager.switchTo(
      new MenuScene(this.app.screen.width, this.app.screen.height, {
        tracks: this.tracks,
        progression: this.progression,
        onStart: this.startGame,
      }),
    );
  };

  private readonly startGame = (mode: GameMode, selection: TrackSelection): void => {
    this.sceneManager.switchTo(
      new GameScene(this.app.screen.width, this.app.screen.height, {
        mode,
        audioManager: this.audioManager,
        track: selection.track,
        beatmap: selection.beatmap,
        onFinished: (snapshot, flow) => this.showResult(mode, snapshot, flow),
      }),
    );
  };

  private readonly showResult = (
    mode: GameMode,
    snapshot: ScoreSnapshot,
    flow: FlowSnapshot,
  ): void => {
    const rewardCoins = this.progression.awardForRun(snapshot.score, mode);
    this.sceneManager.switchTo(
      new ResultScene(this.app.screen.width, this.app.screen.height, {
        mode,
        snapshot,
        flowActivations: flow.activations,
        rewardCoins,
        onBackToMenu: this.showMenu,
      }),
    );
  };

  private async loadMusic(): Promise<TrackSelection[]> {
    try {
      const catalog = await loadMusicCatalog();
      const loadedTracks = await Promise.all(
        catalog.map(async (track) => {
          const beatmap = await loadBeatmap(track);
          return beatmap ? { track, beatmap } : null;
        }),
      );
      return loadedTracks.filter((selection): selection is TrackSelection => selection !== null);
    } catch (error) {
      console.warn('La musica no esta disponible todavia.', error);
      return [];
    }
  }
}
