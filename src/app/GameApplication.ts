import { Application, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { AudioManager } from '../audio/AudioManager';
import { MenuAudioController } from '../audio/MenuAudioController';
import { loadBeatmap } from '../content/Beatmap';
import type { TrackSelection } from '../content/TrackSelection';
import { loadMusicCatalog } from '../content/MusicCatalog';
import { MENU_MUSIC_TRACK_ID } from '../content/MenuMusic';
import { SceneManager } from '../core/scene/SceneManager';
import { ThemeSelection } from '../customization/ThemeCatalog';
import { listThemeCollection } from '../customization/ThemeCollection';
import {
  detectVisualQuality,
  FULL_VISUAL_QUALITY,
  REDUCED_VISUAL_QUALITY,
  type VisualQualityProfile,
} from '../customization/VisualQuality';
import { DIFFICULTIES } from '../game/difficulty/Difficulty';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { ProgressionStore } from '../progression/ProgressionStore';
import { GameScene } from '../scenes/GameScene';
import { CollectionScene } from '../scenes/CollectionScene';
import { MenuScene } from '../scenes/MenuScene';
import { ResultScene } from '../scenes/ResultScene';
import { EventScene } from '../scenes/EventScene';
import { EventThemePreviewScene } from '../scenes/EventThemePreviewScene';
import { CustomThemeScene } from '../scenes/CustomThemeScene';
import { TitleScene } from '../scenes/TitleScene';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import type { FlowSnapshot } from '../game/flow/FlowModel';
import { loadWeeklyEventCatalog } from '../events/EventCatalog';
import type { WeeklyEventCampaign } from '../events/EventTypes';
import { getVisualTheme } from '../customization/ThemeCatalog';
import { listAvailableThemeComponents } from '../customization/ThemeComponents';

export class GameApplication {
  private readonly app = new Application();
  private readonly sceneHost = new Container();
  private readonly sceneManager = new SceneManager(this.sceneHost);
  private readonly audioManager = new AudioManager();
  private readonly menuAudio = new MenuAudioController(this.audioManager);
  private readonly progression = new ProgressionStore();
  private readonly themeSelection = new ThemeSelection(this.progression.equippedThemeId);
  private visualQuality: VisualQualityProfile = FULL_VISUAL_QUALITY;
  private tracks: TrackSelection[] = [];
  private weeklyEvents: WeeklyEventCampaign[] = [];
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

    const query = new URLSearchParams(window.location.search);
    const requestedTheme = query.get('theme');
    if (requestedTheme) this.themeSelection.select(requestedTheme);
    const requestedQuality = query.get('quality');
    this.visualQuality = requestedQuality === 'reduced'
      ? REDUCED_VISUAL_QUALITY
      : requestedQuality === 'full'
        ? FULL_VISUAL_QUALITY
        : detectVisualQuality(this.app.screen.width, this.app.screen.height);

    this.mountElement.appendChild(this.app.canvas);
    this.app.stage.addChild(this.sceneHost);
    [this.tracks, this.weeklyEvents] = await Promise.all([
      this.loadMusic(),
      loadWeeklyEventCatalog(),
    ]);
    if (!requestedTheme) {
      this.themeSelection.selectResolved(this.progression.equippedVisualTheme);
    }
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
    this.updateCanvasState('title');
    this.sceneManager.switchTo(
      new TitleScene(this.app.screen.width, this.app.screen.height, {
        onInteraction: this.menuAudio.start.bind(this.menuAudio),
        onEnter: this.showMenu,
      }),
    );
  }

  private showMenu = (): void => {
    const eventSnapshot = this.progression.getWeeklyEvent(this.weeklyEvents);
    this.updateCanvasState('menu');
    this.sceneManager.switchTo(
      new MenuScene(this.app.screen.width, this.app.screen.height, {
        tracks: this.tracks,
        progression: this.progression,
        visualTheme: this.themeSelection.current,
        onOpenCollection: this.showCollection,
        onOpenEvent: this.showEvent,
        eventRewardPending: eventSnapshot.claimableRewardIds.length > 0,
        onPreview: (selection) => this.menuAudio.preview(selection.track),
        onStopPreview: this.menuAudio.start.bind(this.menuAudio),
        onStart: this.startGame,
      }),
    );
    this.menuAudio.start();
  };

  private showCollection = (): void => {
    this.updateCanvasState('collection');
    this.sceneManager.switchTo(
      new CollectionScene(this.app.screen.width, this.app.screen.height, {
        items: listThemeCollection(
          this.progression.totalRuns,
          this.progression.unlockedThemeIds,
          this.progression.unlockedCosmeticIds,
          this.progression.customThemeSelection,
        ),
        equippedThemeId: this.progression.equippedThemeId,
        visualQuality: this.visualQuality,
        onEquip: (themeId) => {
          if (!this.progression.equipTheme(themeId)) return false;
          this.themeSelection.selectResolved(this.progression.equippedVisualTheme);
          this.updateCanvasState('collection');
          return true;
        },
        onCustomize: this.showCustomTheme,
        onBack: this.showMenu,
      }),
    );
    this.menuAudio.start();
  };

  private showEvent = (): void => {
    this.updateCanvasState('event');
    this.sceneManager.switchTo(
      new EventScene(this.app.screen.width, this.app.screen.height, {
        getSnapshot: () => this.progression.getWeeklyEvent(this.weeklyEvents),
        onClaim: (rewardId) => this.progression.claimWeeklyEventReward(
          this.weeklyEvents,
          rewardId,
        ),
        onPreviewReward: this.showEventRewardPreview,
        onBack: this.showMenu,
      }),
    );
    this.menuAudio.start();
  };

  private showEventRewardPreview = (): void => {
    const snapshot = this.progression.getWeeklyEvent(this.weeklyEvents);
    const campaign = snapshot.activeEvent?.campaign;
    if (!campaign) return;
    this.updateCanvasState('event-preview');
    this.sceneManager.switchTo(
      new EventThemePreviewScene(this.app.screen.width, this.app.screen.height, {
        eventName: campaign.name,
        theme: getVisualTheme(campaign.themeId),
        rewards: campaign.rewards,
        claimedRewardIds: snapshot.progress.claimedRewardIds,
        visualQuality: this.visualQuality,
        onBack: this.showEvent,
      }),
    );
    this.menuAudio.start();
  };

  private showCustomTheme = (): void => {
    this.updateCanvasState('custom-theme');
    this.sceneManager.switchTo(
      new CustomThemeScene(this.app.screen.width, this.app.screen.height, {
        initialSelection: this.progression.customThemeSelection,
        available: listAvailableThemeComponents(
          this.progression.unlockedThemeIds,
          this.progression.unlockedCosmeticIds,
        ),
        visualQuality: this.visualQuality,
        onSave: (selection) => {
          const theme = this.progression.saveCustomTheme(selection, true);
          this.themeSelection.selectResolved(theme);
          this.showCollection();
        },
        onBack: this.showCollection,
      }),
    );
    this.menuAudio.start();
  };

  private readonly startGame = (
    difficulty: Difficulty,
    selection: TrackSelection,
  ): void => {
    this.menuAudio.stop();
    this.updateCanvasState('game');
    const audioReady = this.audioManager.prepare(selection.track);
    this.sceneManager.switchTo(
      new GameScene(this.app.screen.width, this.app.screen.height, {
        difficulty,
        audioManager: this.audioManager,
        track: selection.track,
        beatmap: selection.beatmaps[difficulty],
        visualTheme: this.themeSelection.current,
        visualQuality: this.visualQuality,
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
    this.updateCanvasState('result');
    const run = this.progression.recordRun(
      selection.track.id,
      difficulty,
      snapshot,
      flow,
      completed,
    );
    this.progression.recordWeeklyEventRun(this.weeklyEvents, {
      completed,
      perfects: snapshot.perfects,
      bestCombo: snapshot.bestCombo,
      flowActivations: flow.activations,
      superFlowActivations: flow.superActivations,
    });
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

  private updateCanvasState(scene: string): void {
    this.app.canvas.dataset.scene = scene;
    this.app.canvas.dataset.theme = this.themeSelection.current.id;
    this.app.canvas.dataset.visualQuality = this.visualQuality.id;
  }
}
