import { Application, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { LocalTelemetrySink } from '../analytics/LocalTelemetrySink';
import { summarizeInputProfiles } from '../analytics/InputProfileComparison';
import { TelemetryService } from '../analytics/TelemetryService';
import { AudioManager } from '../audio/AudioManager';
import { MenuAudioController } from '../audio/MenuAudioController';
import { loadBeatmap } from '../content/Beatmap';
import type { TrackSelection } from '../content/TrackSelection';
import { loadMusicCatalog } from '../content/MusicCatalog';
import { loadMusicVisualProfile } from '../content/MusicVisualProfile';
import { MENU_MUSIC_TRACK_ID } from '../content/MenuMusic';
import { SceneManager } from '../core/scene/SceneManager';
import { ThemeSelection } from '../customization/ThemeCatalog';
import { listThemeCollection } from '../customization/ThemeCollection';
import {
  detectVisualQuality,
  FULL_VISUAL_QUALITY,
  MINIMAL_VISUAL_QUALITY,
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
import { DailyRouletteScene } from '../scenes/DailyRouletteScene';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import type { FlowSnapshot } from '../game/flow/FlowModel';
import type { GameplayTechnicalResult } from '../input/GameplayInputTelemetry';
import { calculateWeightedAccuracy } from '../progression/StarRating';
import { loadWeeklyEventCatalog } from '../events/EventCatalog';
import type { WeeklyEventCampaign } from '../events/EventTypes';
import { getVisualTheme } from '../customization/ThemeCatalog';
import { listAvailableThemeComponents } from '../customization/ThemeComponents';
import {
  createRewardedAdsService,
  readDevelopmentAdOutcome,
} from '../monetization/RewardedAdsFactory';
import type { RewardedAdsService } from '../monetization/RewardedAdsService';
import { RunCoinDoubler } from '../monetization/RunCoinDoubler';
import { DailyCosmeticUnlocker } from '../monetization/DailyCosmeticUnlocker';
import { createPlatformIntegration } from '../platform/PlatformIntegration';
import {
  NoopGamePlatformService,
  type GamePlatformService,
} from '../platform/GamePlatformService';
import { resolveReleaseConfig, type ReleaseConfig } from '../platform/ReleaseConfig';
import { AdaptivePerformanceController } from '../rendering/AdaptivePerformanceController';
import type { AdaptivePerformanceAdjustment } from '../rendering/AdaptivePerformanceController';
import {
  isSoftwareRendererLabel,
  readWebGlRendererLabel,
} from '../rendering/GraphicsCapability';
import {
  MIN_RENDER_RESOLUTION,
  resolveRenderResolution,
} from '../rendering/RenderResolutionPolicy';

export class GameApplication {
  private readonly app = new Application();
  private readonly sceneHost = new Container();
  private readonly sceneManager = new SceneManager(this.sceneHost);
  private readonly audioManager = new AudioManager();
  private readonly menuAudio = new MenuAudioController(this.audioManager);
  private readonly progression = new ProgressionStore();
  private rewardedAds: RewardedAdsService = createRewardedAdsService({ development: false });
  private gamePlatform: GamePlatformService = new NoopGamePlatformService();
  private releaseConfig: ReleaseConfig = resolveReleaseConfig('disabled', '');
  private telemetry: TelemetryService | null = null;
  private localTelemetry: LocalTelemetrySink | null = null;
  private readonly themeSelection = new ThemeSelection(this.progression.equippedThemeId);
  private visualQuality: VisualQualityProfile = FULL_VISUAL_QUALITY;
  private automaticVisualQuality = true;
  private adaptiveVisualQualityLocked = false;
  private readonly adaptivePerformance = new AdaptivePerformanceController();
  private adaptiveResolutionScale = 1;
  private performanceNotice: HTMLDivElement | null = null;
  private performanceNoticeTimeout: number | null = null;
  private tracks: TrackSelection[] = [];
  private weeklyEvents: WeeklyEventCampaign[] = [];
  private gameSessionSequence = 0;
  private readonly tick = (ticker: Ticker): void => {
    if (this.app.canvas.dataset.scene === 'game' && document.visibilityState === 'visible') {
      const adjustment = this.adaptivePerformance.recordFrame(
        ticker.deltaMS,
        this.visualQuality.id,
        this.adaptiveResolutionScale,
      );
      if (adjustment) this.applyAdaptivePerformance(adjustment);
    } else {
      this.adaptivePerformance.resetSamples();
    }
    this.sceneManager.update(ticker.deltaTime / 60);
  };
  private readonly handleResize = (): void => {
    this.applyRenderResolution();
    this.updateAutomaticVisualQuality();
    this.sceneManager.resize(this.app.screen.width, this.app.screen.height);
  };

  constructor(private readonly mountElement: HTMLElement) {}

  async start(): Promise<void> {
    const initialRenderResolution = resolveRenderResolution(
      window.innerWidth,
      window.innerHeight,
      window.devicePixelRatio,
    );
    await this.app.init({
      antialias: true,
      autoDensity: true,
      backgroundColor: 0x0b1022,
      resolution: initialRenderResolution.resolution,
      resizeTo: window,
    });
    const graphicsRendererLabel = readWebGlRendererLabel(this.app.canvas);
    const softwareRenderer = isSoftwareRendererLabel(graphicsRendererLabel);

    const platform = await createPlatformIntegration({
      development: import.meta.env.DEV,
      hostname: window.location.hostname,
      search: window.location.search,
      simulationOutcome: readDevelopmentAdOutcome(window.location.search),
      onMuteChanged: (muted) => this.audioManager.setPlatformMuted(muted),
    });
    this.rewardedAds.destroy();
    this.rewardedAds = platform.rewardedAds;
    this.gamePlatform = platform.game;
    this.releaseConfig = resolveReleaseConfig(
      this.gamePlatform.environment,
      window.location.search,
    );
    this.localTelemetry = new LocalTelemetrySink(window.localStorage);
    this.telemetry = new TelemetryService([
      this.localTelemetry,
      platform.telemetry,
    ], window.localStorage);
    this.telemetry.startSession();
    this.publishInputProfileComparison();
    this.gamePlatform.loadingStart();

    const query = new URLSearchParams(window.location.search);
    const requestedTheme = query.get('theme');
    if (requestedTheme) this.themeSelection.select(requestedTheme);
    const requestedQuality = query.get('quality');
    this.automaticVisualQuality = requestedQuality !== 'reduced'
      && requestedQuality !== 'full'
      && requestedQuality !== 'minimal';
    this.visualQuality = requestedQuality === 'reduced'
      ? REDUCED_VISUAL_QUALITY
      : requestedQuality === 'full'
        ? FULL_VISUAL_QUALITY
        : requestedQuality === 'minimal'
          ? MINIMAL_VISUAL_QUALITY
        : detectVisualQuality(this.app.screen.width, this.app.screen.height);
    if (softwareRenderer) {
      this.visualQuality = MINIMAL_VISUAL_QUALITY;
      this.adaptiveVisualQualityLocked = true;
      this.adaptiveResolutionScale = 0.5;
    }

    this.mountElement.appendChild(this.app.canvas);
    this.app.canvas.dataset.rewardedAds = this.rewardedAds.available
      && this.releaseConfig.rewardedAds
      ? this.gamePlatform.environment
      : 'unavailable';
    this.app.canvas.dataset.platform = this.gamePlatform.environment;
    this.app.canvas.dataset.releaseChannel = this.releaseConfig.channel;
    this.app.canvas.dataset.musicVisuals = import.meta.env.DEV
      && new URLSearchParams(window.location.search).get('musicVisuals') === 'off'
      ? 'off'
      : 'm5-hybrid';
    this.app.canvas.dataset.musicVisualCalibration = 'high-v2';
    this.app.canvas.dataset.graphicsRenderer = graphicsRendererLabel ?? 'unavailable';
    if (softwareRenderer) {
      this.applyRenderResolution();
      this.app.canvas.dataset.adaptivePerformance = 'software-renderer';
      this.app.canvas.dataset.graphicsAcceleration = 'software';
      this.showPerformanceNotice(true);
    } else {
      this.updateRenderDataset(initialRenderResolution);
      this.app.canvas.dataset.graphicsAcceleration = graphicsRendererLabel
        ? 'hardware'
        : 'unknown';
    }
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
    this.gamePlatform.loadingStop();

    this.app.ticker.add(this.tick);
    window.addEventListener('resize', this.handleResize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.app.ticker.remove(this.tick);
    this.sceneManager.destroy();
    this.gamePlatform.destroy();
    this.rewardedAds.destroy();
    this.menuAudio.destroy();
    this.audioManager.destroy();
    if (this.performanceNoticeTimeout !== null) {
      window.clearTimeout(this.performanceNoticeTimeout);
    }
    this.performanceNotice?.remove();
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
    this.gamePlatform.gameplayStop();
    const eventSnapshot = this.progression.getWeeklyEvent(this.weeklyEvents);
    const dailyRoulette = this.progression.getDailyRoulette();
    const activeEventId = eventSnapshot.activeEvent?.id;
    if (activeEventId) {
      this.telemetry?.trackOnce(`weekly-event-visible:${activeEventId}`, {
        type: 'weekly_event_visible',
        eventId: activeEventId,
      });
    }
    if (dailyRoulette.canClaim) {
      this.telemetry?.trackOnce(`daily-roulette-visible:${dailyRoulette.dayKey}`, {
        type: 'daily_roulette_visible',
        dayKey: dailyRoulette.dayKey,
      });
    }
    this.updateCanvasState('menu');
    this.sceneManager.switchTo(
      new MenuScene(this.app.screen.width, this.app.screen.height, {
        tracks: this.tracks,
        progression: this.progression,
        visualTheme: this.themeSelection.current,
        onOpenCollection: this.showCollection,
        onOpenEvent: this.showEvent,
        onOpenDailyRoulette: this.showDailyRoulette,
        eventRewardPending: eventSnapshot.claimableRewardIds.length > 0,
        dailyRewardPending: dailyRoulette.canClaim,
        onPreview: (selection) => this.menuAudio.preview(selection.track),
        onStopPreview: this.menuAudio.start.bind(this.menuAudio),
        onStart: this.startGame,
      }),
    );
    this.menuAudio.start();
  };

  private showDailyRoulette = (): void => {
    const offer = this.progression.getDailyRoulette();
    this.telemetry?.track({
      type: 'daily_roulette_opened',
      dayKey: offer.dayKey,
    });
    this.updateCanvasState('daily-roulette');
    this.sceneManager.switchTo(
      new DailyRouletteScene(this.app.screen.width, this.app.screen.height, {
        offer,
        coins: this.progression.coins,
        visualTheme: this.themeSelection.current,
        onClaim: () => {
          const result = this.progression.claimDailyRoulette();
          if (result.claimed) {
            this.telemetry?.track({
              type: 'daily_roulette_claimed',
              dayKey: result.offer.dayKey,
              rewardKind: result.reward.kind,
              rewardId: result.reward.id,
              duplicate: result.duplicate,
            });
          }
          return result;
        },
        onBack: this.showMenu,
      }),
    );
    this.menuAudio.start();
  };

  private showCollection = (): void => {
    const offerDate = new Date();
    const dailyOffer = this.progression.getDailyRewardedTheme(offerDate);
    const dailyUnlocker = new DailyCosmeticUnlocker(
      this.rewardedAds,
      (themeId, opportunityId) => this.progression.tryGrantDailyRewardedTheme(
        themeId,
        opportunityId,
        offerDate,
      ),
      {
        onStarted: () => this.menuAudio.stop(),
        onFinished: () => this.menuAudio.start(),
      },
    );
    const dailyRewardAvailable = this.releaseConfig.rewardedAds
      && this.releaseConfig.rewardedDailyCosmetic
      && dailyUnlocker.available;
    if (dailyRewardAvailable && !dailyOffer.owned && !dailyOffer.claimedToday) {
      this.telemetry?.trackOnce(`reward-visible:${dailyOffer.opportunityId}`, {
        type: 'rewarded_offer_visible',
        placement: 'daily-cosmetic',
      });
    }
    this.updateCanvasState('collection');
    this.sceneManager.switchTo(
      new CollectionScene(this.app.screen.width, this.app.screen.height, {
        items: listThemeCollection(
          this.progression.totalRuns,
          this.progression.unlockedThemeIds,
          this.progression.unlockedCosmeticIds,
          this.progression.customThemeSelection,
          dailyOffer.theme.id,
        ),
        equippedThemeId: this.progression.equippedThemeId,
        visualQuality: this.visualQuality,
        dailyOffer,
        rewardedAdsAvailable: () => dailyRewardAvailable,
        onEquip: (themeId) => {
          if (!this.progression.equipTheme(themeId)) return false;
          this.themeSelection.selectResolved(this.progression.equippedVisualTheme);
          this.updateCanvasState('collection');
          return true;
        },
        onUnlockDailyWithAd: async () => {
          this.telemetry?.track({
            type: 'rewarded_offer_interacted',
            placement: 'daily-cosmetic',
          });
          const outcome = await dailyUnlocker.unlock({
            themeId: dailyOffer.theme.id,
            opportunityId: dailyOffer.opportunityId,
          });
          this.telemetry?.track({
            type: 'rewarded_offer_outcome',
            placement: 'daily-cosmetic',
            outcome,
          });
          return outcome;
        },
        onBuyDaily: () => this.progression.tryBuyDailyRewardedTheme(
          dailyOffer.theme.id,
          offerDate,
        ),
        onDailyUnlocked: (themeId) => {
          this.progression.equipTheme(themeId);
          this.themeSelection.selectResolved(this.progression.equippedVisualTheme);
          this.showCollection();
        },
        onCustomize: this.showCustomTheme,
        onBack: this.showMenu,
      }),
    );
    this.menuAudio.start();
  };

  private showEvent = (): void => {
    const eventId = this.progression.getWeeklyEvent(this.weeklyEvents).activeEvent?.id;
    if (eventId) this.telemetry?.track({ type: 'weekly_event_opened', eventId });
    this.updateCanvasState('event');
    this.sceneManager.switchTo(
      new EventScene(this.app.screen.width, this.app.screen.height, {
        getSnapshot: () => this.progression.getWeeklyEvent(this.weeklyEvents),
        onClaim: (rewardId) => {
          const before = this.progression.getWeeklyEvent(this.weeklyEvents);
          const result = this.progression.claimWeeklyEventReward(
            this.weeklyEvents,
            rewardId,
          );
          const campaign = before.activeEvent?.campaign;
          if (result.claimed && campaign && before.activeEvent) {
            this.telemetry?.track({
              type: 'weekly_reward_claimed',
              eventId: before.activeEvent.id,
              rewardId,
              completed: result.progress.claimedRewardIds.length >= campaign.rewards.length,
            });
          }
          return result;
        },
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
    const gameOpportunityId = `game:${++this.gameSessionSequence}:${Date.now().toString(36)}`;
    this.menuAudio.stop();
    this.gamePlatform.gameplayStop();
    this.telemetry?.track({
      type: 'song_started',
      trackId: selection.track.id,
      difficulty,
    });
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
        musicVisualProfile: selection.musicVisualProfile,
        audioReady,
        onRestart: () => this.startGame(difficulty, selection),
        onExit: this.showMenu,
        secondChanceAvailable: this.releaseConfig.rewardedAds
          && this.releaseConfig.rewardedRevive
          && this.rewardedAds.available,
        onSecondChanceOffered: (phaseIndex) => {
          this.telemetry?.trackOnce(`${gameOpportunityId}:revive:${phaseIndex}:visible`, {
            type: 'rewarded_offer_visible',
            placement: 'second-chance',
          });
        },
        onRequestSecondChance: async (phaseIndex) => {
          this.telemetry?.track({
            type: 'rewarded_offer_interacted',
            placement: 'second-chance',
          });
          const result = await this.rewardedAds.showRewarded({
            placement: 'second-chance',
            opportunityId: `${gameOpportunityId}:phase:${phaseIndex}`,
          });
          this.telemetry?.track({
            type: 'rewarded_offer_outcome',
            placement: 'second-chance',
            outcome: result.status,
          });
          return result.status;
        },
        onGameplayStart: () => this.gamePlatform.gameplayStart(),
        onGameplayStop: () => this.gamePlatform.gameplayStop(),
        onFinished: (
          snapshot,
          flow,
          phaseReached,
          completed,
          usedSecondChance,
          rewardedProviderUnavailable,
          technicalResult,
          destination,
        ) => this.showResult(
          selection,
          difficulty,
          snapshot,
          flow,
          phaseReached,
          completed,
          usedSecondChance,
          rewardedProviderUnavailable,
          technicalResult,
          destination,
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
    usedSecondChance: boolean,
    rewardedProviderUnavailable: boolean,
    technicalResult: GameplayTechnicalResult,
    destination: 'result' | 'restart' | 'menu' = 'result',
  ): void => {
    this.gamePlatform.gameplayStop();
    this.updateCanvasState('result');
    const run = this.progression.recordRun(
      selection.track.id,
      difficulty,
      snapshot,
      flow,
      completed,
    );
    this.telemetry?.track({
      type: 'song_finished',
      trackId: selection.track.id,
      difficulty,
      completed,
      stars: run.earnedStars,
      score: snapshot.score,
      inputProfileId: technicalResult.inputProfileId,
      spatialModelVersion: technicalResult.spatialModelVersion,
      accuracy: calculateWeightedAccuracy(snapshot),
      bestCombo: snapshot.bestCombo,
      misses: snapshot.misses,
      missReasons: technicalResult.missReasons,
      flowActivations: flow.activations,
      superFlowActivations: flow.superActivations,
      pointerDistance: technicalResult.pointerDistance,
      emptyPresses: technicalResult.emptyPresses,
      averageTravelDistance: technicalResult.travel.averageDistance,
      maximumRequiredSpeed: technicalResult.travel.maximumRequiredSpeed,
      averageDragLength: technicalResult.drags.averageLength,
    });
    this.publishInputProfileComparison();
    const weeklySnapshot = this.progression.recordWeeklyEventRun(this.weeklyEvents, {
      completed,
      perfects: snapshot.perfects,
      bestCombo: snapshot.bestCombo,
      flowActivations: flow.activations,
      superFlowActivations: flow.superActivations,
    });
    if (weeklySnapshot.activeEvent) {
      this.telemetry?.track({
        type: 'weekly_event_progressed',
        eventId: weeklySnapshot.activeEvent.id,
        points: weeklySnapshot.progress.points,
      });
    }
    if (destination === 'restart') {
      this.startGame(difficulty, selection);
      return;
    }
    if (destination === 'menu') {
      this.showMenu();
      return;
    }
    let resumeAudioAfterAd = false;
    const coinDoubler = new RunCoinDoubler(
      this.rewardedAds,
      (opportunityId, amount) => this.progression.tryGrantRunCoinBonus(
        opportunityId,
        amount,
      ),
      {
        onStarted: async () => {
          resumeAudioAfterAd = this.audioManager.isPlaying;
          if (resumeAudioAfterAd) await this.audioManager.pause();
        },
        onFinished: async () => {
          if (resumeAudioAfterAd) await this.audioManager.resume();
        },
      },
    );
    const coinDoubleAvailable = coinDoubler.available
      && this.releaseConfig.rewardedAds
      && this.releaseConfig.rewardedCoinDouble
      && !usedSecondChance
      && !rewardedProviderUnavailable;
    if (coinDoubleAvailable) {
      this.telemetry?.trackOnce(`reward-visible:${run.opportunityId}:double-coins`, {
        type: 'rewarded_offer_visible',
        placement: 'double-run-coins',
      });
    }
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
        rewardedAdsAvailable: coinDoubleAvailable,
        onDoubleCoins: async () => {
          this.telemetry?.track({
            type: 'rewarded_offer_interacted',
            placement: 'double-run-coins',
          });
          const outcome = await coinDoubler.double({
            opportunityId: run.opportunityId,
            rewardCoins: run.rewardCoins,
          });
          this.telemetry?.track({
            type: 'rewarded_offer_outcome',
            placement: 'double-run-coins',
            outcome,
          });
          return outcome;
        },
        onBackToMenu: this.showMenu,
      }),
    );
  };

  private publishInputProfileComparison(): void {
    if (!import.meta.env.DEV || !this.localTelemetry) return;
    const target = globalThis as typeof globalThis & {
      __superflowInputComparison?: ReturnType<typeof summarizeInputProfiles>;
    };
    target.__superflowInputComparison = summarizeInputProfiles(
      this.localTelemetry.snapshot(),
    );
  }

  private async loadMusic(): Promise<TrackSelection[]> {
    try {
      const catalog = await loadMusicCatalog();
      const loadedTracks = await Promise.all(
        catalog.map(async (track) => {
          try {
            const loadedBeatmaps = await Promise.all(
              DIFFICULTIES.map((difficulty) => loadBeatmap(track, difficulty)),
            );
            if (loadedBeatmaps.some((beatmap) => beatmap === null)) return null;
            const musicVisualProfile = await loadMusicVisualProfile(track);

            return {
              track,
              musicVisualProfile,
              beatmaps: {
                easy: loadedBeatmaps[0]!,
                medium: loadedBeatmaps[1]!,
                hard: loadedBeatmaps[2]!,
              },
            };
          } catch (error) {
            console.warn(`Beatmaps no disponibles para ${track.id}.`, error);
            return null;
          }
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

  private applyRenderResolution(): void {
    const baseDecision = resolveRenderResolution(
      window.innerWidth,
      window.innerHeight,
      window.devicePixelRatio,
    );
    const resolution = Math.max(
      MIN_RENDER_RESOLUTION,
      baseDecision.resolution * this.adaptiveResolutionScale,
    );
    const renderedPixels = Math.round(
      window.innerWidth * window.innerHeight * resolution ** 2,
    );
    const decision = {
      ...baseDecision,
      resolution,
      renderedPixels,
      constrained: resolution < baseDecision.requestedResolution,
      budgetExceeded: renderedPixels > baseDecision.pixelBudget,
    };
    this.app.renderer.resize(
      window.innerWidth,
      window.innerHeight,
      decision.resolution,
    );
    this.updateRenderDataset(decision);
  }

  private updateRenderDataset(decision: ReturnType<typeof resolveRenderResolution>): void {
    this.app.canvas.dataset.renderResolution = decision.resolution.toString();
    this.app.canvas.dataset.renderPixels = decision.renderedPixels.toString();
    this.app.canvas.dataset.renderConstrained = decision.constrained ? 'true' : 'false';
    this.app.canvas.dataset.renderBudgetExceeded = decision.budgetExceeded ? 'true' : 'false';
    this.app.canvas.dataset.adaptiveResolutionScale = this.adaptiveResolutionScale.toString();
  }

  private updateAutomaticVisualQuality(): void {
    if (!this.automaticVisualQuality || this.adaptiveVisualQualityLocked) return;
    const nextQuality = detectVisualQuality(
      this.app.screen.width,
      this.app.screen.height,
    );
    if (nextQuality.id === this.visualQuality.id) return;
    this.visualQuality = nextQuality;
    this.app.canvas.dataset.visualQuality = nextQuality.id;
    this.sceneManager.setVisualQuality(nextQuality);
  }

  private applyAdaptivePerformance(
    adjustment: AdaptivePerformanceAdjustment,
  ): void {
    if (adjustment.qualityId) {
      this.visualQuality = adjustment.qualityId === 'minimal'
        ? MINIMAL_VISUAL_QUALITY
        : adjustment.qualityId === 'reduced'
          ? REDUCED_VISUAL_QUALITY
          : FULL_VISUAL_QUALITY;
      this.adaptiveVisualQualityLocked = true;
      this.app.canvas.dataset.visualQuality = this.visualQuality.id;
      this.sceneManager.setVisualQuality(this.visualQuality);
    }
    if (adjustment.resolutionScale !== this.adaptiveResolutionScale) {
      this.adaptiveResolutionScale = adjustment.resolutionScale;
      this.applyRenderResolution();
    }
    this.app.canvas.dataset.adaptivePerformance = adjustment.reason;
    this.app.canvas.dataset.adaptiveP95Ms = adjustment.p95Ms.toString();
    this.showPerformanceNotice(this.adaptiveResolutionScale < 1);
  }

  private showPerformanceNotice(compatibilityMode: boolean): void {
    if (!this.performanceNotice) {
      const notice = document.createElement('div');
      notice.setAttribute('role', 'status');
      Object.assign(notice.style, {
        position: 'fixed',
        zIndex: '20',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 14px',
        border: '1px solid rgba(126, 249, 255, 0.65)',
        borderRadius: '999px',
        background: 'rgba(5, 8, 23, 0.9)',
        color: '#e9fdff',
        font: '700 12px system-ui, sans-serif',
        letterSpacing: '0.08em',
        pointerEvents: 'none',
      });
      this.mountElement.appendChild(notice);
      this.performanceNotice = notice;
    }
    this.performanceNotice.textContent = compatibilityMode
      ? 'MODO COMPATIBILIDAD · ACTIVA LA ACELERACION GRAFICA PARA MAYOR NITIDEZ'
      : 'MODO RENDIMIENTO ACTIVADO';
    this.performanceNotice.hidden = false;
    if (this.performanceNoticeTimeout !== null) {
      window.clearTimeout(this.performanceNoticeTimeout);
    }
    this.performanceNoticeTimeout = window.setTimeout(() => {
      if (this.performanceNotice) this.performanceNotice.hidden = true;
    }, 8_000);
  }
}
