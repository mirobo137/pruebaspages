import { Container, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import type { AudioManager } from '../audio/AudioManager';
import type { BeatEvent, Beatmap } from '../content/Beatmap';
import type { MusicTrack } from '../content/MusicCatalog';
import type { Scene } from '../core/scene/Scene';
import { randomBetween } from '../core/utils/random';
import { BeatmapPlayer } from '../game/beatmap/BeatmapPlayer';
import { GAME_CONFIG } from '../game/config';
import type { GameMode } from '../game/modes/GameMode';
import { ScoreModel } from '../game/score/ScoreModel';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { TargetNode } from '../game/targets/TargetNode';
import type { TargetPoint } from '../game/targets/TargetNode';
import type { TimingGrade } from '../game/timing/TimingGrade';
import { GameHud } from '../ui/GameHud';

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  completed: boolean;
}

export interface GameSceneOptions {
  mode: GameMode;
  audioManager: AudioManager;
  track: MusicTrack;
  beatmap: Beatmap;
  onFinished: (snapshot: ScoreSnapshot) => void;
}

export class GameScene implements Scene {
  readonly id = 'game';
  readonly root = new Container();

  private readonly playfield = new Container();
  private readonly targets = new Container();
  private readonly hud = new GameHud();
  private readonly score = new ScoreModel(GAME_CONFIG.maxLives);
  private readonly audioManager: AudioManager;
  private readonly track: MusicTrack;
  private readonly mode: GameMode;
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

  constructor(width: number, height: number, options: GameSceneOptions) {
    this.width = width;
    this.height = height;
    this.audioManager = options.audioManager;
    this.track = options.track;
    this.mode = options.mode;
    this.beatmap = options.beatmap;
    this.beatmapPlayer = new BeatmapPlayer(options.beatmap, options.mode === 'survival');
    this.onFinished = options.onFinished;
    this.playfield.addChild(this.targets);
    this.root.addChild(this.playfield, this.hud);
  }

  mount(): void {
    this.playfield.eventMode = 'static';
    this.playfield.on('pointerdown', this.handlePointerDown);
    this.playfield.on('pointermove', this.handlePointerMove);
    this.playfield.on('pointerup', this.handlePointerUp);
    this.playfield.on('pointerupoutside', this.handlePointerUp);
    this.hud.setMode(this.mode);
    this.hud.update(this.score.snapshot());
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    this.hud.animate(deltaSeconds);
    this.activeTarget?.animate(deltaSeconds);

    if (this.gameEnded || !this.musicStarted || !this.audioManager.isPlaying) return;

    const currentTime = this.audioManager.currentTime;
    if (this.mode === 'song' && currentTime >= this.beatmap.duration) {
      this.finishGame();
      return;
    }

    this.pendingEvents.push(
      ...this.beatmapPlayer.collectUpcomingEvents(
        currentTime,
        GAME_CONFIG.targetLeadTime,
      ),
    );

    if (this.activeEvent && currentTime - this.activeEvent.time > GAME_CONFIG.goodWindow) {
      this.resolveTarget('miss');
      return;
    }

    if (
      this.dragState?.completed
      && this.activeEvent
      && currentTime - this.activeEvent.time >= -GAME_CONFIG.goodWindow
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
    this.hud.resize(width);
  }

  unmount(): void {
    this.playfield.off('pointerdown', this.handlePointerDown);
    this.playfield.off('pointermove', this.handlePointerMove);
    this.playfield.off('pointerup', this.handlePointerUp);
    this.playfield.off('pointerupoutside', this.handlePointerUp);
    this.activeTarget?.destroy();
    this.activeTarget = null;
    this.dragState = null;
  }

  private readonly handlePointerDown = (event: FederatedPointerEvent): void => {
    this.startMusic();

    const target = this.activeTarget;
    const beatEvent = this.activeEvent;
    if (!target || !beatEvent || !target.isHitAt(event.global.x, event.global.y)) return;

    const grade = this.getTimingGrade(beatEvent);
    if (!grade) return;

    if (target.kind === 'drag') {
      if (grade === 'miss') {
        this.resolveTarget('miss');
        return;
      }

      this.dragState = {
        pointerId: event.pointerId,
        startX: event.global.x,
        startY: event.global.y,
        completed: false,
      };
      return;
    }

    this.resolveTarget(grade);
  };

  private readonly handlePointerMove = (event: FederatedPointerEvent): void => {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;

    const target = this.activeTarget;
    if (!target) return;

    const distance = Math.hypot(
      event.global.x - this.dragState.startX,
      event.global.y - this.dragState.startY,
    );
    const progress = Math.min(1, distance / target.requiredDragDistance);
    target.setDragProgress(progress);

    if (progress >= 1) {
      this.dragState.completed = true;
      if (
        this.activeEvent
        && this.audioManager.currentTime - this.activeEvent.time >= -GAME_CONFIG.goodWindow
      ) {
        this.resolveTarget(this.getTimingGrade(this.activeEvent) ?? 'miss');
      }
    }
  };

  private readonly handlePointerUp = (event: FederatedPointerEvent): void => {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;

    this.dragState = null;
    this.resolveTarget('miss');
  };

  private startMusic(): void {
    if (this.musicStarted) return;

    this.musicStarted = true;
    void this.audioManager.play(this.track, { loop: this.mode === 'survival' }).catch(
      (error: unknown) => {
        this.musicStarted = false;
        console.warn('No se pudo reproducir la cancion.', error);
      },
    );
  }

  private getTimingGrade(event: BeatEvent): TimingGrade | null {
    const delta = this.audioManager.currentTime - event.time;
    const absoluteDelta = Math.abs(delta);

    if (absoluteDelta <= GAME_CONFIG.perfectWindow) return 'perfect';
    if (absoluteDelta <= GAME_CONFIG.goodWindow) return 'good';
    if (delta > GAME_CONFIG.goodWindow) return 'miss';
    return null;
  }

  private resolveTarget(grade: TimingGrade): void {
    if (!this.activeTarget) return;

    this.score.register(grade);
    this.hud.update(this.score.snapshot());
    this.hud.showTiming(grade);
    this.activeTarget.destroy();
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

    const target = new TargetNode(event.kind, dragEnd);
    target.position.set(start.x, start.y);
    this.activeTarget = target;
    this.activeEvent = event;
    this.targets.addChild(target);
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
    this.onFinished(this.score.snapshot());
  }
}
