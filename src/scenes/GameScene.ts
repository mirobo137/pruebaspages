import { Container, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import type { AudioManager } from '../audio/AudioManager';
import type { BeatEvent, Beatmap } from '../content/Beatmap';
import type { MusicTrack } from '../content/MusicCatalog';
import type { Scene } from '../core/scene/Scene';
import { randomBetween } from '../core/utils/random';
import { BeatmapPlayer } from '../game/beatmap/BeatmapPlayer';
import { GAME_CONFIG } from '../game/config';
import type { Difficulty, DifficultyProfile } from '../game/difficulty/Difficulty';
import { DIFFICULTY_PROFILES } from '../game/difficulty/Difficulty';
import { JuiceSystem } from '../game/effects/JuiceSystem';
import { RhythmBackground } from '../game/effects/RhythmBackground';
import { FlowModel } from '../game/flow/FlowModel';
import type { FlowSnapshot } from '../game/flow/FlowModel';
import { ScoreModel } from '../game/score/ScoreModel';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { TargetNode } from '../game/targets/TargetNode';
import type { TargetPoint } from '../game/targets/TargetNode';
import type { TimingGrade } from '../game/timing/TimingGrade';
import { capturePointer, releasePointer } from '../input/PointerCapture';
import { HapticsService } from '../platform/HapticsService';
import { GameHud } from '../ui/GameHud';

interface DragState {
  pointerId: number;
  completed: boolean;
  lastSparkX: number;
  lastSparkY: number;
}

export interface GameSceneOptions {
  difficulty: Difficulty;
  audioManager: AudioManager;
  track: MusicTrack;
  beatmap: Beatmap;
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
  private readonly score: ScoreModel;
  private readonly flow = new FlowModel();
  private readonly haptics = new HapticsService();
  private readonly audioManager: AudioManager;
  private readonly track: MusicTrack;
  private readonly difficulty: Difficulty;
  private readonly difficultyProfile: DifficultyProfile;
  private readonly beatmap: Beatmap;
  private readonly beatmapPlayer: BeatmapPlayer;
  private readonly pendingEvents: BeatEvent[] = [];
  private readonly onFinished: GameSceneOptions['onFinished'];
  private activeTarget: TargetNode | null = null;
  private activeEvent: BeatEvent | null = null;
  private dragState: DragState | null = null;
  private width: number;
  private height: number;
  private musicStarted = false;
  private gameEnded = false;
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
    this.onFinished = options.onFinished;
    this.playfield.addChild(this.targets);
    this.root.addChild(this.background, this.playfield, this.effects, this.hud);
  }

  mount(): void {
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
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    const isRunning = this.musicStarted && this.audioManager.isPlaying;
    const currentTime = isRunning ? this.audioManager.currentTime : 0;
    const flowChange = this.flow.update(isRunning ? deltaSeconds : 0);
    this.syncFlowState(flowChange.snapshot);
    this.hud.animate(deltaSeconds);
    this.background.updateBackground(deltaSeconds);
    this.effects.updateEffects(deltaSeconds);
    this.activeTarget?.animate(deltaSeconds);
    const shake = this.effects.getShakeOffset();
    this.targets.position.set(shake.x, shake.y);
    this.background.position.set(shake.x * 0.35, shake.y * 0.35);

    if (this.activeTarget && this.activeEvent && isRunning) {
      this.activeTarget.updateTiming(
        this.activeEvent.time - currentTime,
        this.difficultyProfile.targetLeadTime,
        this.difficultyProfile.perfectWindow,
      );
    }

    if (this.gameEnded || !isRunning) return;

    this.updatePhase(currentTime);
    if (currentTime >= this.beatmap.duration) {
      this.finishGame();
      return;
    }

    this.pendingEvents.push(
      ...this.beatmapPlayer.collectUpcomingEvents(
        currentTime,
        this.difficultyProfile.targetLeadTime,
      ),
    );

    if (
      this.activeEvent
      && currentTime - this.activeEvent.time > this.difficultyProfile.goodWindow
    ) {
      this.resolveTarget('miss');
      return;
    }

    if (
      this.dragState?.completed
      && this.activeEvent
      && currentTime - this.activeEvent.time >= -this.difficultyProfile.goodWindow
    ) {
      this.resolveTarget(this.getTimingGrade(this.activeEvent) ?? 'miss');
      return;
    }

    if (!this.activeTarget && this.pendingEvents.length > 0) {
      this.spawnNextPendingTarget();
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.playfield.hitArea = new Rectangle(0, 0, width, height);
    this.background.resize(width, height);
    this.effects.resize(width, height);
    this.hud.resize(width, height);
  }

  unmount(): void {
    this.playfield.off('pointerdown', this.handlePointerDown);
    this.playfield.off('pointermove', this.handlePointerMove);
    this.playfield.off('pointerup', this.handlePointerUp);
    this.playfield.off('pointerupoutside', this.handlePointerUp);
    this.playfield.off('pointercancel', this.handlePointerUp);
    this.activeTarget?.destroy();
    this.activeTarget = null;
    this.dragState = null;
    this.targets.position.set(0, 0);
  }

  private readonly handlePointerDown = (event: FederatedPointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    capturePointer(event);
    this.effects.emitTouch(event.global.x, event.global.y);
    this.startMusic();

    if (this.dragState) return;

    const target = this.activeTarget;
    const beatEvent = this.activeEvent;
    if (!target || !beatEvent || !target.isHitAt(event.global.x, event.global.y)) return;

    const grade = this.getTimingGrade(beatEvent);
    if (!grade) {
      target.nudgeEarly();
      return;
    }

    if (target.kind === 'drag') {
      if (grade === 'miss') {
        this.resolveTarget('miss');
        return;
      }

      target.setPressed(true);
      this.dragState = {
        pointerId: event.pointerId,
        completed: false,
        lastSparkX: event.global.x,
        lastSparkY: event.global.y,
      };
      return;
    }

    this.resolveTarget(grade);
  };

  private readonly handlePointerMove = (event: FederatedPointerEvent): void => {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;
    event.preventDefault();

    const target = this.activeTarget;
    if (!target) return;

    const dragResult = target.updateDragFromPointer(event.global.x, event.global.y);
    target.setPressed(dragResult.valid);
    const sparkDistance = Math.hypot(
      event.global.x - this.dragState.lastSparkX,
      event.global.y - this.dragState.lastSparkY,
    );
    if (dragResult.valid && sparkDistance >= 12) {
      this.effects.emitDragSpark(event.global.x, event.global.y);
      this.dragState.lastSparkX = event.global.x;
      this.dragState.lastSparkY = event.global.y;
    }

    if (dragResult.completed) {
      this.dragState.completed = true;
      if (
        this.activeEvent
        && this.audioManager.currentTime - this.activeEvent.time
          >= -this.difficultyProfile.goodWindow
      ) {
        this.resolveTarget(this.getTimingGrade(this.activeEvent) ?? 'miss');
      }
    }
  };

  private readonly handlePointerUp = (event: FederatedPointerEvent): void => {
    releasePointer(event);
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;

    this.activeTarget?.setPressed(false);
    this.dragState = null;
    this.resolveTarget('miss');
  };

  private startMusic(): void {
    if (this.musicStarted) return;

    this.musicStarted = true;
    void this.audioManager.play(this.track, {
      loop: true,
      loopDuration: this.beatmap.loopDuration,
    }).catch(
      (error: unknown) => {
        this.musicStarted = false;
        console.warn('No se pudo reproducir la cancion.', error);
      },
    );
  }

  private getTimingGrade(event: BeatEvent): TimingGrade | null {
    const delta = this.audioManager.currentTime - event.time;
    const absoluteDelta = Math.abs(delta);

    if (absoluteDelta <= this.difficultyProfile.perfectWindow) return 'perfect';
    if (absoluteDelta <= this.difficultyProfile.goodWindow) return 'good';
    if (delta > this.difficultyProfile.goodWindow) return 'miss';
    return null;
  }

  private resolveTarget(grade: TimingGrade): void {
    const target = this.activeTarget;
    if (!target) return;

    const feedbackPoint = target.getFeedbackPoint();
    const flowChange = this.flow.register(grade);
    this.syncFlowState(flowChange.snapshot);
    this.score.register(grade, flowChange.snapshot.multiplier);
    this.hud.update(this.score.snapshot());
    this.hud.showTiming(grade);
    this.effects.emitImpact(feedbackPoint.x, feedbackPoint.y, grade);
    this.background.pulse(grade === 'perfect' ? 1 : grade === 'good' ? 0.65 : 0.8);
    if (flowChange.activated) {
      this.effects.emitFlowActivation();
      this.hud.showFlowActivation();
      this.haptics.flowActivation();
    } else if (flowChange.ended) {
      this.effects.emitFlowBreak();
      this.hud.showFlowBreak();
      this.haptics.flowBreak();
    } else {
      this.haptics.feedback(grade);
    }
    target.destroy();
    this.activeTarget = null;
    this.activeEvent = null;
    this.dragState = null;

    if (this.score.isGameOver()) {
      this.finishGame();
      return;
    }

    if (this.pendingEvents.length > 0) this.spawnNextPendingTarget();
  }

  private spawnNextPendingTarget(): void {
    const nextEvent = this.pendingEvents.shift();
    if (nextEvent) this.spawnTarget(nextEvent);
  }

  private spawnTarget(event: BeatEvent): void {
    this.activeTarget?.destroy();

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
    target.setFlowActive(this.flow.snapshot().active);
    this.activeTarget = target;
    this.activeEvent = event;
    this.targets.addChild(target);
    this.background.pulse(0.22);
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

    this.phaseIndex = nextPhaseIndex;
    this.background.setPhase(nextPhaseIndex);
    this.effects.emitPhaseTransition(nextPhaseIndex + 1, phase.name);
    this.haptics.phaseTransition();
  }

  private syncFlowState(snapshot: FlowSnapshot): void {
    this.hud.updateFlow(snapshot);
    this.effects.setFlowActive(snapshot.active);
    this.background.setFlowActive(snapshot.active);
    this.activeTarget?.setFlowActive(snapshot.active);
  }
}
