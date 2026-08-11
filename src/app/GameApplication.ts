import { Application, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { AudioManager } from '../audio/AudioManager';
import { MenuAudioController } from '../audio/MenuAudioController';
import { loadBeatmap } from '../content/Beatmap';
import type { TrackSelection } from '../content/TrackSelection';
import { loadMusicCatalog } from '../content/MusicCatalog';
import { MENU_MUSIC_TRACK_ID } from '../content/MenuMusic';
import { SceneManager } from '../core/scene/SceneManager';
import { DIFFICULTIES } from '../game/difficulty/Difficulty';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { ProgressionStore } from '../progression/ProgressionStore';
import { GameScene } from '../scenes/GameScene';
import { MenuScene } from '../scenes/MenuScene';
import { ResultScene } from '../scenes/ResultScene';
import { TitleScene } from '../scenes/TitleScene';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import type { FlowSnapshot } from '../game/flow/FlowModel';

export class GameApplication {
  private readonly app = new Application();
  private readonly sceneHost = new Container();
  private readonly sceneManager = new SceneManager(this.sceneHost);
  private readonly audioManager = new AudioManager();
  private readonly menuAudio = new MenuAudioController(this.audioManager);
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
    const menuSelection = this.tracks.find(
      (selection) => selection.track.id === MENU_MUSIC_TRACK_ID,
    ) ?? this.tracks[0] ?? null;
    this.menuAudio.setMenuTrack(menuSelection?.track ?? null);
    void this.audioManager.preload(this.tracks.map((selection) => selection.track));
    this.showTitle();

    this.app.ticker.add(this.tick);
    window.addEventListener('resize', this.handleResize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.app.ticker.remove(this.tick);
    this.sceneManager.destroy();
    this.menuAudio.destroy();
    this.audioManager.destroy();
    this.app.destroy(true);
  }

  private showTitle(): void {
    this.sceneManager.switchTo(
      new TitleScene(this.app.screen.width, this.app.screen.height, {
        onInteraction: this.menuAudio.start.bind(this.menuAudio),
        onEnter: this.showMenu,
      }),
    );
  }

  private showMenu = (): void => {
    this.sceneManager.switchTo(
      new MenuScene(this.app.screen.width, this.app.screen.height, {
        tracks: this.tracks,
        progression: this.progression,
        onPreview: (selection) => this.menuAudio.preview(selection.track),
        onStopPreview: this.menuAudio.start.bind(this.menuAudio),
        onStart: this.startGame,
      }),
    );
    this.menuAudio.start();
  };

  private readonly startGame = (
    difficulty: Difficulty,
    selection: TrackSelection,
  ): void => {
    this.menuAudio.stop();
    const audioReady = this.audioManager.prepare(selection.track);
    this.sceneManager.switchTo(
      new GameScene(this.app.screen.width, this.app.screen.height, {
        difficulty,
        audioManager: this.audioManager,
        track: selection.track,
        beatmap: selection.beatmaps[difficulty],
        audioReady,
        onRestart: () => this.startGame(difficulty, selection),
        onExit: this.showMenu,
        onFinished: (snapshot, flow, phaseReached, completed) => this.showResult(
          selection,
          difficulty,
          snapshot,
          flow,
          phaseReached,
          completed,
        ),
      }),
    );
  };

  private readonly showResult = (
    selection: TrackSelection,
    difficulty: Difficulty,
    snapshot: ScoreSnapshot,
    flow: FlowSnapshot,
    phaseReached: number,
    completed: boolean,
  ): void => {
    const run = this.progression.recordRun(
      selection.track.id,
      difficulty,
      snapshot,
      flow,
      completed,
    );
    this.sceneManager.switchTo(
      new ResultScene(this.app.screen.width, this.app.screen.height, {
        trackTitle: selection.track.title,
        difficulty,
        snapshot,
        flowActivations: flow.activations,
        superFlowActivations: flow.superActivations,
        phaseReached,
        completed,
        rewardCoins: run.rewardCoins,
        earnedStars: run.earnedStars,
        previousStars: run.previousStars,
        isNewHighScore: run.isNewHighScore,
        onBackToMenu: this.showMenu,
      }),
    );
  };

  private async loadMusic(): Promise<TrackSelection[]> {
    try {
      const catalog = await loadMusicCatalog();
      const loadedTracks = await Promise.all(
        catalog.map(async (track) => {
          const loadedBeatmaps = await Promise.all(
            DIFFICULTIES.map((difficulty) => loadBeatmap(track, difficulty)),
          );
          if (loadedBeatmaps.some((beatmap) => beatmap === null)) return null;

          return {
            track,
            beatmaps: {
              easy: loadedBeatmaps[0]!,
              medium: loadedBeatmaps[1]!,
              hard: loadedBeatmaps[2]!,
            },
          };
        }),
      );
      return loadedTracks.filter((selection): selection is TrackSelection => selection !== null);
    } catch (error) {
      console.warn('La musica no esta disponible todavia.', error);
      return [];
    }
  }
}
