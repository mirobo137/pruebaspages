import { Container, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import type { AudioManager } from '../audio/AudioManager';
import type { BeatEvent, Beatmap } from '../content/Beatmap';
import type { MusicTrack } from '../content/MusicCatalog';
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
import { TouchTuning } from '../input/TouchTuning';
import type { PointerTuning } from '../input/TouchTuning';
import { HapticsService } from '../platform/HapticsService';
import { GameHud } from '../ui/GameHud';
import { GameCountdown } from '../ui/GameCountdown';
import { PauseButton } from '../ui/PauseButton';
import { PauseOverlay } from '../ui/PauseOverlay';

interface DragState {
  pointerId: number;
  target: ActiveTarget;
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

const TARGET_SPAWN_LATE_TOLERANCE = 0.075;

export interface GameSceneOptions {
  difficulty: Difficulty;
  audioManager: AudioManager;
  track: MusicTrack;
  beatmap: Beatmap;
  audioReady: Promise<void>;
  onRestart: () => void;
  onExit: () => void;
  onFinished: (
    snapshot: ScoreSnapshot,
    flow: FlowSnapshot,
    phaseReached: number,
  ) => void;
}

export class GameScene implements Scene {
  readonly id = 'game';
  readonly root = new Container();

  private readonly background = new RhythmBackground();
  private readonly playfield = new Container();
  private readonly targets = new Container();
  private readonly effects = new JuiceSystem();
  private readonly hud = new GameHud();
  private readonly countdown = new GameCountdown();
  private readonly pauseButton: PauseButton;
  private readonly pauseOverlay: PauseOverlay;
  private readonly score: ScoreModel;
  private readonly flow = new FlowModel();
  private readonly haptics = new HapticsService();
  private readonly touchTuning = new TouchTuning();
  private readonly audioManager: AudioManager;
  private readonly track: MusicTrack;
  private readonly difficulty: Difficulty;
  private readonly difficultyProfile: DifficultyProfile;
  private readonly beatmap: Beatmap;
  private readonly beatmapPlayer: BeatmapPlayer;
  private readonly phaseTransition = new PhaseTransitionGuard();
  private readonly audioReady: Promise<void>;
  private readonly pendingEvents: BeatEvent[] = [];
  private readonly onRestart: () => void;
  private readonly onExit: () => void;
  private readonly onFinished: GameSceneOptions['onFinished'];
  private readonly activeTargets: ActiveTarget[] = [];
  private dragState: DragState | null = null;
  private readonly bufferedTargets = new Set<ActiveTarget>();
  private width: number;
  private height: number;
  private musicStarted = false;
  private musicStartRequested = false;
  private gameEnded = false;
  private paused = false;
  private pauseReady: Promise<void> = Promise.resolve();
  private mounted = false;
  private phaseIndex = -1;

  constructor(width: number, height: number, options: GameSceneOptions) {
    this.width = width;
    this.height = height;
    this.audioManager = options.audioManager;
    this.track = options.track;
    this.difficulty = options.difficulty;
    this.difficultyProfile = DIFFICULTY_PROFILES[options.difficulty];
    this.score = new ScoreModel(this.difficultyProfile.maxLives);
    this.beatmap = options.beatmap;
    this.beatmapPlayer = new BeatmapPlayer(options.beatmap);
    this.audioReady = options.audioReady;
    this.onRestart = options.onRestart;
    this.onExit = options.onExit;
    this.onFinished = options.onFinished;
    this.pauseButton = new PauseButton(this.handlePause);
    this.pauseOverlay = new PauseOverlay({
      onContinue: this.handleContinue,
      onRestart: this.handleRestart,
      onExit: this.handleExit,
    });
    this.playfield.addChild(this.targets);
    this.root.addChild(
      this.background,
      this.playfield,
      this.effects,
      this.hud,
      this.pauseButton,
      this.countdown,
      this.pauseOverlay,
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
    this.hud.setDifficulty(this.difficulty);
    this.hud.update(this.score.snapshot());
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
    const flowChange = this.flow.update(phaseTransitionActive ? 0 : deltaSeconds);
    this.applyFlowChange(flowChange);

    if (currentTime >= this.beatmap.duration) {
      this.finishGame();
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
      if (currentTime - target.event.time > this.difficultyProfile.goodWindow) {
        this.resolveTarget(target, 'miss');
      } else if (
        this.dragState?.target === target
        && this.dragState.completed
        && currentTime - target.event.time >= -this.difficultyProfile.goodWindow
      ) {
        this.resolveTarget(target, this.getTimingGrade(target.event) ?? 'miss');
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
    this.touchTuning.resize(width, height);
  }

  unmount(): void {
    this.mounted = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.playfield.off('pointerdown', this.handlePointerDown);
    this.playfield.off('pointermove', this.handlePointerMove);
    this.playfield.off('pointerup', this.handlePointerUp);
    this.playfield.off('pointerupoutside', this.handlePointerUp);
    this.playfield.off('pointercancel', this.handlePointerUp);
    for (const target of this.activeTargets) target.node.destroy();
    this.activeTargets.length = 0;
    this.dragState = null;
    this.bufferedTargets.clear();
    this.targets.position.set(0, 0);
    this.audioManager.stop();
  }

  private readonly handlePointerDown = (event: FederatedPointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!this.isGameplayInteractive()) return;

    capturePointer(event);
    this.effects.emitTouch(event.global.x, event.global.y);

    if (this.dragState) return;

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
      this.haptics.dragStart();
      this.dragState = {
        pointerId: event.pointerId,
        target: activeTarget,
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

    if (dragResult.completed) {
      this.dragState.completed = true;
      const inputTime = this.getCompensatedInputTime(event, this.dragState.tuning);
      if (
        inputTime - activeTarget.event.time
          >= -this.difficultyProfile.goodWindow
      ) {
        this.resolveTarget(
          activeTarget,
          this.getTimingGrade(activeTarget.event, inputTime) ?? 'miss',
        );
      }
    }
  };

  private readonly handlePointerUp = (event: FederatedPointerEvent): void => {
    releasePointer(event);
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
      && this.isWithinReleaseBuffer(
        activeTarget.event,
        this.dragState.tuning,
        this.getCompensatedInputTime(event, this.dragState.tuning),
      )
    ) {
      this.dragState.released = true;
      return;
    }

    activeTarget.node.setPressed(false);
    this.dragState = null;
    this.resolveTarget(activeTarget, 'miss');
  };

  private startMusic(): void {
    if (this.musicStartRequested || this.gameEnded) return;

    this.musicStartRequested = true;
    void this.audioManager.play(this.track, {
      loop: true,
      loopDuration: this.beatmap.loopDuration,
      playbackDuration: this.beatmap.duration,
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
    const flowChange = this.flow.register(grade);
    const flowTransitionHandled = this.applyFlowChange(flowChange);
    this.score.register(grade, flowChange.snapshot.multiplier);
    this.hud.update(this.score.snapshot());
    this.hud.showTiming(grade);
    this.effects.emitImpact(feedbackPoint.x, feedbackPoint.y, grade);
    this.background.pulse(grade === 'perfect' ? 1 : grade === 'good' ? 0.65 : 0.8);
    if (!flowTransitionHandled) {
      this.haptics.feedback(grade);
    }
    activeTarget.node.destroy();
    this.activeTargets.splice(targetIndex, 1);
    if (this.dragState?.target === activeTarget) this.dragState = null;
    this.bufferedTargets.delete(activeTarget);

    if (this.score.isGameOver()) {
      this.finishGame();
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
    const dragEnd = end
      ? { x: end.x - start.x, y: end.y - start.y }
      : null;

    const target = new TargetNode(event.kind, dragEnd, {
      hitRadius: this.difficultyProfile.targetHitRadius,
      dragPathTolerance: this.difficultyProfile.dragPathTolerance,
    });
    target.position.set(start.x, start.y);
    const flowSnapshot = this.flow.snapshot();
    target.setFlowState(flowSnapshot.active, flowSnapshot.superActive);
    this.activeTargets.push({ node: target, event });
    this.targets.addChild(target);
    this.background.pulse(0.22);
  }

  private findTargetAt(
    x: number,
    y: number,
    radiusBonus: number,
    inputTime: number,
  ): ActiveTarget | null {
    const candidates = this.activeTargets.filter(
      (target) => target.node.isHitAt(x, y, radiusBonus),
    );
    candidates.sort((left, right) => {
      const leftDistance = Math.abs(left.event.time - inputTime);
      const rightDistance = Math.abs(right.event.time - inputTime);
      return leftDistance - rightDistance || left.event.time - right.event.time;
    });
    return candidates[0] ?? null;
  }

  private randomStartPoint(): TargetPoint {
    return {
      x: randomBetween(GAME_CONFIG.targetSideMargin, this.width - GAME_CONFIG.targetSideMargin),
      y: randomBetween(
        GAME_CONFIG.targetSpawnTop,
        Math.max(
          GAME_CONFIG.targetSpawnTop + GAME_CONFIG.targetSideMargin,
          this.height - GAME_CONFIG.targetSideMargin,
        ),
      ),
    };
  }

  private createRandomDragEnd(start: TargetPoint): TargetPoint {
    const angle = randomBetween(0, Math.PI * 2);
    const distance = GAME_CONFIG.dragDistance + 30;
    return {
      x: Math.max(
        GAME_CONFIG.targetSideMargin,
        Math.min(this.width - GAME_CONFIG.targetSideMargin, start.x + Math.cos(angle) * distance),
      ),
      y: Math.max(
        GAME_CONFIG.targetSpawnTop,
        Math.min(this.height - GAME_CONFIG.targetSideMargin, start.y + Math.sin(angle) * distance),
      ),
    };
  }

  private fromNormalizedPoint(point: { x: number; y: number }): TargetPoint {
    return {
      x: GAME_CONFIG.targetSideMargin
        + Math.max(0, Math.min(1, point.x))
        * Math.max(0, this.width - GAME_CONFIG.targetSideMargin * 2),
      y: GAME_CONFIG.targetSpawnTop
        + Math.max(0, Math.min(1, point.y))
        * Math.max(
          0,
          this.height - GAME_CONFIG.targetSpawnTop - GAME_CONFIG.targetSideMargin,
        ),
    };
  }

  private finishGame(): void {
    if (this.gameEnded) return;

    this.gameEnded = true;
    this.audioManager.stop();
    this.onFinished(
      this.score.snapshot(),
      this.flow.snapshot(),
      Math.max(1, this.phaseIndex + 1),
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
      && currentTime < this.beatmap.duration
      && expectedPhaseIndex === this.phaseIndex
      && !this.phaseTransition.isActive(currentTime);
  }

  private readonly handlePause = (): void => {
    this.pauseGame();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.pauseGame();
  };

  private pauseGame(): void {
    if (this.paused || this.gameEnded) return;

    this.paused = true;
    for (const target of this.activeTargets) target.node.resetInteraction();
    this.dragState = null;
    this.bufferedTargets.clear();
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
    this.audioManager.stop();
    this.onRestart();
  };

  private readonly handleExit = (): void => {
    this.audioManager.stop();
    this.onExit();
  };

  private syncFlowState(snapshot: FlowSnapshot): void {
    this.hud.updateFlow(snapshot);
    this.effects.setFlowState(snapshot.active, snapshot.superActive);
    this.background.setFlowState(snapshot.active, snapshot.superActive);
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

  private isWithinReleaseBuffer(
    event: BeatEvent,
    tuning: PointerTuning,
    currentTime = this.audioManager.currentTime,
  ): boolean {
    const timeUntilHit = event.time - currentTime;
    return timeUntilHit >= -this.difficultyProfile.goodWindow
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
