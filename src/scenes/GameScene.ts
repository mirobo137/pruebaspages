import { Container, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import type { AudioManager } from '../audio/AudioManager';
import type { BeatEvent, Beatmap } from '../content/Beatmap';
import type { MusicTrack } from '../content/MusicCatalog';
import type { VisualTheme } from '../customization/ThemeTypes';
import type { VisualQualityProfile } from '../customization/VisualQuality';
import type { Scene } from '../core/scene/Scene';
import { randomBetween } from '../core/utils/random';
import { BeatmapPlayer } from '../game/beatmap/BeatmapPlayer';
import { PhaseTransitionGuard } from '../game/beatmap/PhaseTransitionGuard';
import { GAME_CONFIG } from '../game/config';
import type { Difficulty, DifficultyProfile } from '../game/difficulty/Difficulty';
import { DIFFICULTY_PROFILES } from '../game/difficulty/Difficulty';
import { JuiceSystem } from '../game/effects/JuiceSystem';
import { RhythmBackground } from '../game/effects/RhythmBackground';
import { FlowModel } from '../game/flow/FlowModel';
import type { FlowChange, FlowSnapshot } from '../game/flow/FlowModel';
import { ScoreModel } from '../game/score/ScoreModel';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { TargetNode } from '../game/targets/TargetNode';
import type { TargetPoint } from '../game/targets/TargetNode';
import type { TimingGrade } from '../game/timing/TimingGrade';
import { capturePointer, releasePointer } from '../input/PointerCapture';
import {
  detectInitialPointerMode,
  InputGameplayProfile,
  resolveDesktopReachVariant,
} from '../input/InputGameplayProfile';
import { GameplayInputTelemetry } from '../input/GameplayInputTelemetry';
import { TouchTuning } from '../input/TouchTuning';
import type { PointerTuning } from '../input/TouchTuning';
import { HapticsService } from '../platform/HapticsService';
import { GameHud } from '../ui/GameHud';
import { GameCountdown } from '../ui/GameCountdown';
import { PauseButton } from '../ui/PauseButton';
import { PauseOverlay } from '../ui/PauseOverlay';
import { SecondChanceOverlay } from '../ui/SecondChanceOverlay';
import { GameplayPointer } from '../ui/GameplayPointer';
import { ComboFocusPresenter, isComboMilestone } from '../ui/ComboFocusPresenter';
import { DangerIndicator } from '../ui/DangerIndicator';
import type { RewardedAdStatus } from '../monetization/RewardTypes';
import { RewardedGameplayPolicy } from '../game/checkpoint/RewardedGameplayPolicy';

interface DragState {
  pointerId: number;
  target: ActiveTarget;
  grade: Exclude<TimingGrade, 'miss'>;
  deadline: number;
  completed: boolean;
  released: boolean;
  lastSparkX: number;
  lastSparkY: number;
  tuning: PointerTuning;
}

interface ActiveTarget {
  node: TargetNode;
  event: BeatEvent;
}

interface GameplayCheckpoint {
  phaseIndex: number;
  phaseStartTime: number;
  score: ScoreSnapshot;
  flow: FlowSnapshot;
}

const TARGET_SPAWN_LATE_TOLERANCE = 0.075;
// Los beatmaps pueden colocar su ultima nota hasta 0.75 s antes del final.
// Llegar vivo a esa zona cuenta como completar aunque el ultimo fallo agote la vida.
const SONG_COMPLETION_GRACE = 0.8;

export interface GameSceneOptions {
  difficulty: Difficulty;
  audioManager: AudioManager;
  track: MusicTrack;
  beatmap: Beatmap;
  visualTheme: VisualTheme;
  visualQuality: VisualQualityProfile;
  audioReady: Promise<void>;
  onRestart: () => void;
  onExit: () => void;
  secondChanceAvailable: boolean;
  onRequestSecondChance: (phaseIndex: number) => Promise<RewardedAdStatus>;
  onGameplayStart: () => void;
  onGameplayStop: () => void;
  onFinished: (
    snapshot: ScoreSnapshot,
    flow: FlowSnapshot,
    phaseReached: number,
    completed: boolean,
    usedSecondChance: boolean,
    rewardedProviderUnavailable: boolean,
  ) => void;
}

export class GameScene implements Scene {
  readonly id = 'game';
  readonly root = new Container();

  private readonly background: RhythmBackground;
  private readonly playfield = new Container();
  private readonly targets = new Container();
  private readonly effects: JuiceSystem;
  private readonly hud = new GameHud();
  private readonly countdown = new GameCountdown();
  private readonly pauseButton: PauseButton;
  private readonly pauseOverlay: PauseOverlay;
  private readonly secondChanceOverlay: SecondChanceOverlay;
  private readonly score: ScoreModel;
  private readonly flow = new FlowModel();
  private readonly haptics = new HapticsService();
  private readonly touchTuning = new TouchTuning();
  private readonly inputProfile: InputGameplayProfile;
  private readonly inputTelemetry: GameplayInputTelemetry;
  private readonly gameplayPointer: GameplayPointer;
  private readonly comboFocus: ComboFocusPresenter;
  private readonly dangerIndicator: DangerIndicator;
  private readonly audioManager: AudioManager;
  private readonly track: MusicTrack;
  private readonly difficulty: Difficulty;
  private readonly difficultyProfile: DifficultyProfile;
  private readonly beatmap: Beatmap;
  private readonly visualTheme: VisualTheme;
  private readonly beatmapPlayer: BeatmapPlayer;
  private readonly phaseTransition = new PhaseTransitionGuard();
  private readonly audioReady: Promise<void>;
  private readonly pendingEvents: BeatEvent[] = [];
  private readonly onRestart: () => void;
  private readonly onExit: () => void;
  private readonly secondChanceAvailable: boolean;
  private readonly onRequestSecondChance: GameSceneOptions['onRequestSecondChance'];
  private readonly onFinished: GameSceneOptions['onFinished'];
  private readonly onGameplayStart: GameSceneOptions['onGameplayStart'];
  private readonly onGameplayStop: GameSceneOptions['onGameplayStop'];
  private readonly activeTargets: ActiveTarget[] = [];
  private dragState: DragState | null = null;
  private readonly bufferedTargets = new Set<ActiveTarget>();
  private readonly capturedPointers = new Map<number, Element>();
  private width: number;
  private height: number;
  private musicStarted = false;
  private musicStartRequested = false;
  private gameEnded = false;
  private paused = false;
  private pauseReady: Promise<void> = Promise.resolve();
  private mounted = false;
  private phaseIndex = -1;
  private checkpoint: GameplayCheckpoint;
  private musicTimelineStart = 0;
  private awaitingSecondChance = false;
  private readonly rewardedGameplay = new RewardedGameplayPolicy();

  constructor(width: number, height: number, options: GameSceneOptions) {
    this.width = width;
    this.height = height;
    this.audioManager = options.audioManager;
    this.track = options.track;
    this.difficulty = options.difficulty;
    this.visualTheme = options.visualTheme;
    const initialPointerMode = detectInitialPointerMode({
      maxTouchPoints: navigator.maxTouchPoints,
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      finePointer: window.matchMedia('(pointer: fine)').matches,
    });
    this.inputProfile = new InputGameplayProfile(
      width,
      height,
      initialPointerMode,
      resolveDesktopReachVariant(window.location.search),
    );
    this.inputTelemetry = new GameplayInputTelemetry(initialPointerMode, width, height);
    this.gameplayPointer = new GameplayPointer(
      this.visualTheme.effects.touch,
      this.visualTheme.target.highlight,
    );
    this.comboFocus = new ComboFocusPresenter(this.visualTheme.effects);
    this.dangerIndicator = new DangerIndicator(this.visualTheme.effects);
    this.background = new RhythmBackground(
      this.visualTheme.background,
      options.visualQuality,
    );
    this.effects = new JuiceSystem(this.visualTheme.effects, options.visualQuality);
    this.difficultyProfile = DIFFICULTY_PROFILES[options.difficulty];
    this.score = new ScoreModel(this.difficultyProfile.maxLives);
    this.beatmap = options.beatmap;
    this.beatmapPlayer = new BeatmapPlayer(options.beatmap);
    this.audioReady = options.audioReady;
    this.onRestart = options.onRestart;
    this.onExit = options.onExit;
    this.secondChanceAvailable = options.secondChanceAvailable;
    this.onRequestSecondChance = options.onRequestSecondChance;
    this.onFinished = options.onFinished;
    this.onGameplayStart = options.onGameplayStart;
    this.onGameplayStop = options.onGameplayStop;
    this.checkpoint = {
      phaseIndex: 0,
      phaseStartTime: 0,
      score: this.score.snapshot(),
      flow: this.flow.snapshot(),
    };
    this.pauseButton = new PauseButton(this.handlePause);
    this.pauseOverlay = new PauseOverlay({
      onContinue: this.handleContinue,
      onRestart: this.handleRestart,
      onExit: this.handleExit,
    });
    this.secondChanceOverlay = new SecondChanceOverlay({
      onRevive: this.handleSecondChance,
      onFinish: this.handleFinishAfterFailure,
    });
    this.playfield.addChild(this.targets);
    this.root.addChild(
      this.background,
      this.playfield,
      this.effects,
      this.gameplayPointer,
      this.comboFocus,
      this.dangerIndicator,
      this.hud,
      this.pauseButton,
      this.countdown,
      this.pauseOverlay,
      this.secondChanceOverlay,
    );
  }

  mount(): void {
    this.mounted = true;
    this.playfield.eventMode = 'static';
    this.playfield.on('pointerdown', this.handlePointerDown);
    this.playfield.on('pointermove', this.handlePointerMove);
    this.playfield.on('pointerup', this.handlePointerUp);
    this.playfield.on('pointerupoutside', this.handlePointerUp);
    this.playfield.on('pointercancel', this.handlePointerUp);
    this.playfield.on('pointerover', this.handlePointerOver);
    this.playfield.on('pointerout', this.handlePointerOut);
    this.hud.setDifficulty(this.difficulty);
    this.hud.update(this.score.snapshot());
    this.dangerIndicator.setScore(this.score.snapshot());
    this.hud.updateRunProgress(
      0,
      this.beatmap.duration,
      0,
      this.beatmap.phases[0]?.name ?? 'LECTURA',
    );
    this.syncFlowState(this.flow.snapshot());
    this.pauseButton.visible = false;
    this.countdown.showLoading();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.resize(this.width, this.height);
    void this.audioReady.then(() => {
      if (this.mounted && !this.gameEnded) this.countdown.start();
    }).catch((error: unknown) => {
      if (!this.mounted) return;
      this.paused = true;
      this.countdown.showError();
      this.pauseOverlay.setMessage('El audio no inició. Puedes reintentar o volver al menú.');
      this.pauseOverlay.show();
      console.warn('No se pudo preparar la canción.', error);
    });
  }

  update(deltaSeconds: number): void {
    if (this.gameEnded || this.paused) return;

    this.hud.animate(deltaSeconds);
    this.background.updateBackground(deltaSeconds);
    this.effects.updateEffects(deltaSeconds);
    this.gameplayPointer.animate(deltaSeconds);
    this.comboFocus.animate(deltaSeconds);
    this.dangerIndicator.animate(deltaSeconds);
    for (const target of this.activeTargets) target.node.animate(deltaSeconds);
    const shake = this.effects.getShakeOffset();
    this.targets.position.set(shake.x, shake.y);
    this.background.position.set(shake.x * 0.35, shake.y * 0.35);

    if (!this.musicStarted) {
      if (this.countdown.updateCountdown(deltaSeconds)) this.startMusic();
      return;
    }

    if (!this.audioManager.isPlaying) return;

    const currentTime = this.audioManager.currentTime;
    this.updatePhase(currentTime);
    const phaseTransitionActive = this.phaseTransition.isActive(currentTime);

    if (currentTime >= this.beatmap.duration) {
      this.finishGame(true);
      return;
    }

    const upcomingEvents = this.beatmapPlayer.collectUpcomingEvents(
      currentTime,
      this.difficultyProfile.targetLeadTime,
    );
    this.pendingEvents.push(
      ...upcomingEvents.filter(
        (event) => this.phaseTransition.accepts(event, this.phaseIndex),
      ),
    );

    if (phaseTransitionActive) return;

    this.spawnPendingTargets(currentTime);

    for (const target of this.activeTargets) {
      target.node.updateTiming(
        target.event.time - currentTime,
        this.difficultyProfile.targetLeadTime,
        this.difficultyProfile.perfectWindow,
        this.difficultyProfile.goodWindow,
      );
    }

    for (const bufferedTarget of [...this.bufferedTargets]) {
      if (!this.activeTargets.includes(bufferedTarget)) {
        this.bufferedTargets.delete(bufferedTarget);
      } else if (
        currentTime >= bufferedTarget.event.time - this.difficultyProfile.goodWindow
      ) {
        this.bufferedTargets.delete(bufferedTarget);
        this.resolveTarget(
          bufferedTarget,
          this.getTimingGrade(bufferedTarget.event) ?? 'good',
        );
        if (this.gameEnded) return;
      }
    }

    for (const target of [...this.activeTargets]) {
      if (!this.activeTargets.includes(target)) continue;
      if (this.dragState?.target === target) {
        if (currentTime > this.dragState.deadline) {
          this.resolveTarget(target, 'miss');
        } else if (
          this.dragState.completed
          && currentTime >= target.event.time - this.difficultyProfile.goodWindow
        ) {
          this.resolveTarget(target, this.dragState.grade);
        }
      } else if (currentTime - target.event.time > this.difficultyProfile.goodWindow) {
        this.resolveTarget(target, 'miss');
      }
      if (this.gameEnded) return;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.playfield.hitArea = new Rectangle(0, 0, width, height);
    this.background.resize(width, height);
    this.effects.resize(width, height);
    this.hud.resize(width, height);
    this.countdown.resize(width, height);
    this.pauseButton.position.set(width - 58, 78);
    this.pauseOverlay.resize(width, height);
    this.secondChanceOverlay.resize(width, height);
    this.touchTuning.resize(width, height);
    this.inputProfile.resize(width, height);
    this.inputTelemetry.setProfile(this.inputProfile.mode, width, height);
    this.comboFocus.resize(width, height);
    this.dangerIndicator.resize(width, height);
    this.syncInputPresentation();
  }

  unmount(): void {
    this.onGameplayStop();
    this.mounted = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.playfield.off('pointerdown', this.handlePointerDown);
    this.playfield.off('pointermove', this.handlePointerMove);
    this.playfield.off('pointerup', this.handlePointerUp);
    this.playfield.off('pointerupoutside', this.handlePointerUp);
    this.playfield.off('pointercancel', this.handlePointerUp);
    this.playfield.off('pointerover', this.handlePointerOver);
    this.playfield.off('pointerout', this.handlePointerOut);
    this.inputTelemetry.report();
    this.clearLiveGameplayState();
    this.targets.position.set(0, 0);
    this.audioManager.stop();
  }

  private readonly handlePointerDown = (event: FederatedPointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.registerActivePointer(event);
    this.gameplayPointer.moveTo(event.global.x, event.global.y);
    this.gameplayPointer.press();
    if (!this.isGameplayInteractive()) return;

    capturePointer(event);
    const nativeTarget = event.nativeEvent.target;
    if (nativeTarget instanceof Element) {
      this.capturedPointers.set(event.pointerId, nativeTarget);
    }
    this.effects.emitTouch(event.global.x, event.global.y);

    if (this.dragState?.pointerId === event.pointerId) return;

    const tuning = this.touchTuning.forPointer(event.pointerType);
    const inputTime = this.getCompensatedInputTime(event, tuning);
    const activeTarget = this.findTargetAt(
      event.global.x,
      event.global.y,
      tuning.hitRadiusBonus,
      inputTime,
    );
    if (!activeTarget) return;

    const target = activeTarget.node;
    const beatEvent = activeTarget.event;
    const grade = this.getTimingGrade(beatEvent, inputTime);
    const canBufferEarly = !grade
      && this.isWithinEarlyInputBuffer(beatEvent, tuning, inputTime);
    if (!grade && !canBufferEarly) {
      target.nudgeEarly();
      return;
    }

    if (target.kind === 'drag') {
      if (grade === 'miss') {
        this.resolveTarget(activeTarget, 'miss');
        return;
      }

      target.setPressed(true);
      target.beginDrag(event.global.x, event.global.y);
      this.haptics.dragStart();
      this.dragState = {
        pointerId: event.pointerId,
        target: activeTarget,
        grade: grade === 'perfect' ? 'perfect' : 'good',
        deadline: Math.max(inputTime, beatEvent.time)
          + this.difficultyProfile.dragCompletionTime,
        completed: false,
        released: false,
        lastSparkX: event.global.x,
        lastSparkY: event.global.y,
        tuning,
      };
      return;
    }

    if (grade) {
      this.resolveTarget(activeTarget, grade);
    } else {
      this.bufferedTargets.add(activeTarget);
      target.setPressed(true);
    }
  };

  private readonly handlePointerMove = (event: FederatedPointerEvent): void => {
    this.registerActivePointer(event);
    this.gameplayPointer.moveTo(event.global.x, event.global.y);
    this.inputTelemetry.recordPointer(event.global.x, event.global.y);
    if (!this.isGameplayInteractive()) return;
    if (
      !this.dragState
      || this.dragState.pointerId !== event.pointerId
      || this.dragState.released
    ) return;
    event.preventDefault();

    const activeTarget = this.dragState.target;
    if (!this.activeTargets.includes(activeTarget)) return;
    const target = activeTarget.node;

    const dragResult = target.updateDragFromPointer(
      event.global.x,
      event.global.y,
      this.dragState.tuning.dragToleranceBonus,
      this.dragState.tuning.dragCompletionThreshold,
    );
    target.setPressed(dragResult.valid);
    const sparkDistance = Math.hypot(
      event.global.x - this.dragState.lastSparkX,
      event.global.y - this.dragState.lastSparkY,
    );
    if (dragResult.valid && sparkDistance >= this.dragState.tuning.sparkDistance) {
      this.effects.emitDragSpark(event.global.x, event.global.y);
      this.dragState.lastSparkX = event.global.x;
      this.dragState.lastSparkY = event.global.y;
    }
    if (dragResult.checkpointsPassed > 0) {
      this.effects.emitDragSpark(event.global.x, event.global.y);
      this.haptics.dragCheckpoint();
    }

    if (dragResult.completed) {
      this.dragState.completed = true;
      const inputTime = this.getCompensatedInputTime(event, this.dragState.tuning);
      if (
        inputTime - activeTarget.event.time
          >= -this.difficultyProfile.goodWindow
      ) {
        this.resolveTarget(
          activeTarget,
          this.dragState.grade,
        );
      }
    }
  };

  private readonly handlePointerUp = (event: FederatedPointerEvent): void => {
    releasePointer(event);
    this.capturedPointers.delete(event.pointerId);
    if (!this.isGameplayInteractive()) {
      if (this.dragState?.pointerId === event.pointerId) {
        this.dragState.target.node.setPressed(false);
        this.dragState = null;
      }
      return;
    }
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;

    const activeTarget = this.dragState.target;
    if (!this.activeTargets.includes(activeTarget)) {
      this.dragState = null;
      return;
    }

    if (
      event.type !== 'pointercancel'
      && this.dragState.completed
    ) {
      const inputTime = this.getCompensatedInputTime(event, this.dragState.tuning);
      if (inputTime < activeTarget.event.time - this.difficultyProfile.goodWindow) {
        this.dragState.released = true;
      } else {
        this.resolveTarget(activeTarget, this.dragState.grade);
      }
      return;
    }

    activeTarget.node.setPressed(false);
    this.dragState = null;
    this.resolveTarget(activeTarget, 'miss');
  };

  private readonly handlePointerOver = (event: FederatedPointerEvent): void => {
    this.registerActivePointer(event);
    this.gameplayPointer.setInside(true);
    this.gameplayPointer.moveTo(event.global.x, event.global.y);
  };

  private readonly handlePointerOut = (): void => {
    this.gameplayPointer.setInside(false);
  };

  private startMusic(): void {
    if (this.musicStartRequested || this.gameEnded) return;

    this.musicStartRequested = true;
    void this.audioManager.play(this.track, {
      loop: true,
      loopDuration: this.beatmap.loopDuration,
      playbackDuration: this.beatmap.duration - this.musicTimelineStart,
      startOffset: this.musicTimelineStart % this.beatmap.loopDuration,
      timelineOffset: this.musicTimelineStart,
    }).then(() => {
      if (!this.mounted || this.gameEnded) return;
      this.musicStarted = true;
      if (this.paused) {
        this.pauseReady = this.audioManager.pause().catch((error: unknown) => {
          console.warn('No se pudo suspender el audio.', error);
        });
        return;
      }
      this.countdown.hide();
      this.pauseButton.visible = true;
      this.onGameplayStart();
    }).catch(
      (error: unknown) => {
        this.musicStartRequested = false;
        this.paused = true;
        this.countdown.showError();
        this.pauseButton.visible = false;
        this.pauseOverlay.setMessage('El audio no inició. Puedes reintentar o volver al menú.');
        this.pauseOverlay.show();
        console.warn('No se pudo reproducir la cancion.', error);
      },
    );
  }

  private getTimingGrade(
    event: BeatEvent,
    currentTime = this.audioManager.currentTime,
  ): TimingGrade | null {
    const delta = currentTime - event.time;
    const absoluteDelta = Math.abs(delta);

    if (absoluteDelta <= this.difficultyProfile.perfectWindow) return 'perfect';
    if (absoluteDelta <= this.difficultyProfile.goodWindow) return 'good';
    if (delta > this.difficultyProfile.goodWindow) return 'miss';
    return null;
  }

  private resolveTarget(activeTarget: ActiveTarget, grade: TimingGrade): void {
    const targetIndex = this.activeTargets.indexOf(activeTarget);
    if (targetIndex < 0) return;

    const feedbackPoint = activeTarget.node.getFeedbackPoint();
    const scoreBeforeJudgement = this.score.snapshot();
    this.inputTelemetry.recordResult(grade);
    const flowChange = this.flow.register(grade);
    const flowTransitionHandled = this.applyFlowChange(flowChange);
    this.score.register(grade, flowChange.snapshot.multiplier);
    const scoreSnapshot = this.score.snapshot();
    this.audioManager.emitGameplayJudgement(
      grade,
      grade === 'miss' && scoreBeforeJudgement.combo > 0,
      grade === 'miss' && scoreBeforeJudgement.lives <= 1,
    );
    this.hud.update(scoreSnapshot);
    this.dangerIndicator.setScore(scoreSnapshot);
    this.hud.showTiming(grade);
    this.effects.emitImpact(feedbackPoint.x, feedbackPoint.y, grade);
    const upcomingPoints = this.activeTargets
      .filter((target) => target !== activeTarget)
      .sort((left, right) => left.event.time - right.event.time)
      .slice(0, 3)
      .map((target) => target.node.getFeedbackPoint());
    this.comboFocus.showResult(
      feedbackPoint,
      grade,
      scoreSnapshot,
      flowChange.snapshot,
      upcomingPoints,
    );
    if (grade !== 'miss' && isComboMilestone(scoreSnapshot.combo)) {
      this.effects.emitComboMilestone(feedbackPoint.x, feedbackPoint.y, scoreSnapshot.combo);
    }
    this.background.pulse(grade === 'perfect' ? 1 : grade === 'good' ? 0.65 : 0.8);
    if (!flowTransitionHandled) {
      this.haptics.feedback(grade);
    }
    activeTarget.node.destroy();
    this.activeTargets.splice(targetIndex, 1);
    if (this.dragState?.target === activeTarget) this.dragState = null;
    this.bufferedTargets.delete(activeTarget);

    if (this.score.isGameOver()) {
      const completed = this.audioManager.currentTime
        >= this.beatmap.duration - SONG_COMPLETION_GRACE;
      if (completed) this.finishGame(true);
      else this.handleRunFailure();
    }
  }

  private spawnPendingTargets(currentTime: number): void {
    const pending = this.pendingEvents.splice(0);
    for (const event of pending) {
      if (event.phaseIndex !== this.phaseIndex) continue;
      const remaining = event.time - currentTime;
      if (
        remaining
        < this.difficultyProfile.targetLeadTime - TARGET_SPAWN_LATE_TOLERANCE
      ) continue;
      this.spawnTarget(event);
    }
  }

  private spawnTarget(event: BeatEvent): void {
    const start = event.start
      ? this.fromNormalizedPoint(event.start)
      : this.randomStartPoint();
    const end = event.kind === 'drag'
      ? event.end
        ? this.fromNormalizedPoint(event.end)
        : this.createRandomDragEnd(start)
      : null;
    const dragAnchors = end
      ? this.createDragAnchors(start, end, event)
      : null;

    const target = new TargetNode(event.kind, dragAnchors, {
      hitRadius: event.kind === 'drag'
        ? this.difficultyProfile.dragStartHitRadius
        : this.difficultyProfile.targetHitRadius,
      dragPathTolerance: this.difficultyProfile.dragPathTolerance,
    }, this.visualTheme.target, this.visualTheme.drag);
    target.position.set(start.x, start.y);
    const flowSnapshot = this.flow.snapshot();
    target.setFlowState(flowSnapshot.active, flowSnapshot.superActive);
    this.activeTargets.push({ node: target, event });
    this.targets.addChild(target);
    this.background.pulse(0.22);
  }

  private createDragAnchors(
    start: TargetPoint,
    end: TargetPoint,
    event: BeatEvent,
  ): TargetPoint[] {
    const explicitControls = event.controls?.map((control) => this.fromNormalizedPoint(control));
    const controls = explicitControls?.length
      ? explicitControls
      : this.createAutomaticControlPoints(start, end, event.time);
    return [
      ...controls.map((control) => ({
        x: control.x - start.x,
        y: control.y - start.y,
      })),
      { x: end.x - start.x, y: end.y - start.y },
    ];
  }

  private createAutomaticControlPoints(
    start: TargetPoint,
    end: TargetPoint,
    eventTime: number,
  ): TargetPoint[] {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    const variant = Math.abs(Math.round(
      start.x * 3 + start.y * 5 + end.x * 7 + end.y * 11 + eventTime * 10,
    )) % 3;
    const direction = variant === 1 ? -1 : 1;
    const curveDepth = Math.min(105, Math.max(44, distance * 0.3));
    const bounds = this.inputProfile.bounds;
    const createControl = (progress: number, depth: number): TargetPoint => ({
      x: Math.max(
        bounds.left,
        Math.min(
          bounds.right,
          start.x + deltaX * progress - deltaY / distance * depth,
        ),
      ),
      y: Math.max(
        bounds.top,
        Math.min(
          bounds.bottom,
          start.y + deltaY * progress + deltaX / distance * depth,
        ),
      ),
    });

    if (variant === 2) {
      return [
        createControl(0.3, curveDepth * 0.78),
        createControl(0.7, -curveDepth * 0.78),
      ];
    }
    return [createControl(0.5, curveDepth * direction)];
  }

  private findTargetAt(
    x: number,
    y: number,
    radiusBonus: number,
    inputTime: number,
  ): ActiveTarget | null {
    const candidates = this.activeTargets.filter(
      (target) => target !== this.dragState?.target
        && target.node.isHitAt(x, y, radiusBonus),
    );
    candidates.sort((left, right) => {
      const leftDistance = Math.abs(left.event.time - inputTime);
      const rightDistance = Math.abs(right.event.time - inputTime);
      return leftDistance - rightDistance || left.event.time - right.event.time;
    });
    return candidates[0] ?? null;
  }

  private randomStartPoint(): TargetPoint {
    const bounds = this.inputProfile.bounds;
    return {
      x: randomBetween(bounds.left, bounds.right),
      y: randomBetween(bounds.top, bounds.bottom),
    };
  }

  private createRandomDragEnd(start: TargetPoint): TargetPoint {
    const angle = randomBetween(0, Math.PI * 2);
    const distance = GAME_CONFIG.dragDistance + 30;
    const bounds = this.inputProfile.bounds;
    return {
      x: Math.max(
        bounds.left,
        Math.min(bounds.right, start.x + Math.cos(angle) * distance),
      ),
      y: Math.max(
        bounds.top,
        Math.min(bounds.bottom, start.y + Math.sin(angle) * distance),
      ),
    };
  }

  private fromNormalizedPoint(point: { x: number; y: number }): TargetPoint {
    return this.inputProfile.map(point);
  }

  private registerActivePointer(event: FederatedPointerEvent): void {
    if (!this.inputProfile.registerPointer(event.pointerType)) return;
    this.inputTelemetry.setProfile(this.inputProfile.mode, this.width, this.height);
    this.syncInputPresentation();
  }

  private syncInputPresentation(): void {
    const usesCursor = this.inputProfile.usesGameplayCursor;
    this.playfield.cursor = usesCursor ? 'none' : 'default';
    this.gameplayPointer.setEnabled(usesCursor);
  }

  private handleRunFailure(): void {
    if (
      this.awaitingSecondChance
      || this.gameEnded
      || !this.rewardedGameplay.canOffer(this.secondChanceAvailable)
    ) {
      this.finishGame(false);
      return;
    }
    this.awaitingSecondChance = true;
    this.paused = true;
    this.onGameplayStop();
    this.audioManager.stop();
    this.musicStarted = false;
    this.musicStartRequested = false;
    this.pauseButton.visible = false;
    this.clearLiveGameplayState();
    const phase = this.beatmap.phases[this.checkpoint.phaseIndex];
    this.secondChanceOverlay.show(
      phase?.name ?? `FASE ${this.checkpoint.phaseIndex + 1}`,
      this.getRestoredLives(),
    );
  }

  private readonly handleSecondChance = async (): Promise<void> => {
    if (
      !this.awaitingSecondChance
      || !this.rewardedGameplay.beginRequest()
    ) return;
    this.secondChanceOverlay.setPending(true);
    const result = await this.onRequestSecondChance(this.checkpoint.phaseIndex);
    const revived = this.rewardedGameplay.resolve(result);
    if (!this.mounted || this.gameEnded) return;
    if (!revived) {
      this.finishGame(false);
      return;
    }
    this.restoreCheckpoint();
  };

  private readonly handleFinishAfterFailure = (): void => {
    if (!this.rewardedGameplay.pending) this.finishGame(false);
  };

  private restoreCheckpoint(): void {
    this.awaitingSecondChance = false;
    this.paused = false;
    this.clearLiveGameplayState();
    this.score.restoreAfterRevive(this.checkpoint.score, this.getRestoredLives());
    this.flow.restoreAfterRevive(this.checkpoint.flow);
    this.hud.update(this.score.snapshot());
    this.dangerIndicator.setScore(this.score.snapshot());
    this.syncFlowState(this.flow.snapshot());
    this.phaseTransition.reset();
    this.beatmapPlayer.seek(this.checkpoint.phaseStartTime);
    this.phaseIndex = this.checkpoint.phaseIndex;
    this.musicTimelineStart = this.checkpoint.phaseStartTime;
    this.musicStarted = false;
    this.musicStartRequested = false;
    const phase = this.beatmap.phases[this.phaseIndex];
    this.background.setPhase(this.phaseIndex, false);
    this.hud.updateRunProgress(
      this.musicTimelineStart,
      this.beatmap.duration,
      this.phaseIndex,
      phase?.name ?? `FASE ${this.phaseIndex + 1}`,
    );
    this.secondChanceOverlay.hide();
    this.pauseButton.visible = false;
    this.countdown.start(`REINICIANDO ${phase?.name?.toUpperCase() ?? 'FASE'}`);
  }

  private getRestoredLives(): number {
    return Math.max(2, Math.ceil(this.difficultyProfile.maxLives * 0.5));
  }

  private clearLiveGameplayState(): void {
    for (const [pointerId, element] of this.capturedPointers) {
      try {
        if (
          'hasPointerCapture' in element
          && 'releasePointerCapture' in element
          && element.hasPointerCapture(pointerId)
        ) element.releasePointerCapture(pointerId);
      } catch {
        // El navegador puede liberar el puntero al abrir el anuncio.
      }
    }
    this.capturedPointers.clear();
    for (const target of this.activeTargets) target.node.destroy();
    this.activeTargets.length = 0;
    this.pendingEvents.length = 0;
    this.dragState = null;
    this.bufferedTargets.clear();
    this.targets.position.set(0, 0);
    this.comboFocus.hide();
  }

  private finishGame(completed: boolean): void {
    if (this.gameEnded) return;

    this.gameEnded = true;
    this.onGameplayStop();
    this.audioManager.stop();
    this.onFinished(
      this.score.snapshot(),
      this.flow.snapshot(),
      Math.max(1, this.phaseIndex + 1),
      completed,
      this.rewardedGameplay.consumed,
      this.rewardedGameplay.unavailable,
    );
  }

  private updatePhase(currentTime: number): void {
    const nextPhaseIndex = Math.min(
      this.beatmap.phases.length - 1,
      Math.max(0, Math.floor(currentTime / this.beatmap.loopDuration)),
    );
    const phase = this.beatmap.phases[nextPhaseIndex];
    if (!phase) return;

    this.hud.updateRunProgress(
      currentTime,
      this.beatmap.duration,
      nextPhaseIndex,
      phase.name,
    );
    if (nextPhaseIndex === this.phaseIndex) return;

    const isInitialPhase = this.phaseIndex < 0;
    this.phaseIndex = nextPhaseIndex;
    this.checkpoint = {
      phaseIndex: nextPhaseIndex,
      phaseStartTime: phase.startTime,
      score: this.score.snapshot(),
      flow: this.flow.snapshot(),
    };
    this.background.setPhase(nextPhaseIndex, !isInitialPhase);
    if (isInitialPhase) return;

    this.beginPhaseTransition(nextPhaseIndex, phase.startTime, currentTime);
    this.effects.emitPhaseTransition(nextPhaseIndex + 1, phase.name);
  }

  private beginPhaseTransition(
    nextPhaseIndex: number,
    phaseStartTime: number,
    currentTime: number,
  ): void {
    this.phaseTransition.begin(
      phaseStartTime,
      currentTime,
      this.difficultyProfile.targetLeadTime,
    );

    for (let index = this.activeTargets.length - 1; index >= 0; index -= 1) {
      const target = this.activeTargets[index];
      if (target.event.phaseIndex !== nextPhaseIndex) {
        target.node.destroy();
        this.activeTargets.splice(index, 1);
      }
    }
    this.dragState = null;
    this.bufferedTargets.clear();
    this.comboFocus.hide();

    for (let index = this.pendingEvents.length - 1; index >= 0; index -= 1) {
      const event = this.pendingEvents[index];
      if (
        event.phaseIndex < nextPhaseIndex
        || !this.phaseTransition.accepts(event, nextPhaseIndex)
      ) {
        this.pendingEvents.splice(index, 1);
      }
    }
  }

  private isGameplayInteractive(): boolean {
    const currentTime = this.audioManager.currentTime;
    const expectedPhaseIndex = Math.min(
      this.beatmap.phases.length - 1,
      Math.max(0, Math.floor(currentTime / this.beatmap.loopDuration)),
    );
    return this.musicStarted
      && this.audioManager.isPlaying
      && !this.paused
      && !this.awaitingSecondChance
      && currentTime < this.beatmap.duration
      && expectedPhaseIndex === this.phaseIndex
      && !this.phaseTransition.isActive(currentTime);
  }

  private readonly handlePause = (): void => {
    this.pauseGame();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.pauseGame(false);
  };

  private pauseGame(reportPlatform = true): void {
    if (this.paused || this.gameEnded || this.awaitingSecondChance) return;

    this.paused = true;
    if (reportPlatform) this.onGameplayStop();
    for (const target of this.activeTargets) target.node.resetInteraction();
    this.dragState = null;
    this.bufferedTargets.clear();
    this.comboFocus.hide();
    this.pauseButton.visible = false;
    this.pauseOverlay.setMessage('La música y el tiempo están detenidos');
    this.pauseReady = this.audioManager.pause().catch((error: unknown) => {
      console.warn('No se pudo suspender el audio.', error);
    });
    void this.pauseReady.then(() => {
      if (this.mounted && this.paused && !this.gameEnded) this.pauseOverlay.show();
    });
  }

  private readonly handleContinue = (): void => {
    const ready = this.pauseReady.then(() => this.musicStarted
      ? this.audioManager.resume()
      : this.audioManager.prepare(this.track));
    void ready.then(() => {
      if (!this.mounted || this.gameEnded) return;
      this.paused = false;
      if (this.musicStarted) this.onGameplayStart();
      this.pauseOverlay.hide();
      if (!this.musicStarted && !this.musicStartRequested) {
        this.countdown.start();
      }
      this.pauseButton.visible = this.musicStarted;
    }).catch((error: unknown) => {
      this.pauseOverlay.setMessage('No se pudo continuar. Intenta de nuevo o vuelve al menú.');
      console.warn('No se pudo continuar la partida.', error);
    });
  };

  private readonly handleRestart = (): void => {
    this.onGameplayStop();
    this.audioManager.stop();
    this.onRestart();
  };

  private readonly handleExit = (): void => {
    this.onGameplayStop();
    this.audioManager.stop();
    this.onExit();
  };

  private syncFlowState(snapshot: FlowSnapshot): void {
    this.hud.updateFlow(snapshot);
    this.effects.setFlowState(snapshot.active, snapshot.superActive);
    this.background.setFlowState(snapshot.active, snapshot.superActive);
    this.dangerIndicator.setFlowState(snapshot.superActive);
    for (const target of this.activeTargets) {
      target.node.setFlowState(snapshot.active, snapshot.superActive);
    }
  }

  private applyFlowChange(change: FlowChange): boolean {
    this.syncFlowState(change.snapshot);

    if (change.superActivated) {
      this.effects.emitSuperFlowActivation();
      this.hud.showSuperFlowActivation();
      this.haptics.superFlowActivation();
      return true;
    }

    if (change.superDemoted) {
      this.effects.emitSuperFlowDemotion();
      this.hud.showSuperFlowDemotion();
      this.haptics.superFlowDemotion();
      return true;
    }

    if (change.activated) {
      this.effects.emitFlowActivation();
      this.hud.showFlowActivation();
      this.haptics.flowActivation();
      return true;
    }

    if (change.ended) {
      this.effects.emitFlowBreak();
      this.hud.showFlowBreak();
      this.haptics.flowBreak();
      return true;
    }

    return false;
  }

  private isWithinEarlyInputBuffer(
    event: BeatEvent,
    tuning: PointerTuning,
    currentTime = this.audioManager.currentTime,
  ): boolean {
    const timeUntilHit = event.time - currentTime;
    return timeUntilHit > this.difficultyProfile.goodWindow
      && timeUntilHit <= this.difficultyProfile.goodWindow + tuning.earlyInputBuffer;
  }

  private getCompensatedInputTime(
    event: FederatedPointerEvent,
    tuning: PointerTuning,
  ): number {
    return this.touchTuning.compensateAudioTime(
      this.audioManager.currentTime,
      event.timeStamp,
      tuning,
    );
  }
}
