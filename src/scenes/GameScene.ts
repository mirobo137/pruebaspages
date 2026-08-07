import { Container, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import type { AudioManager } from '../audio/AudioManager';
import type { Beatmap } from '../content/Beatmap';
import type { MusicTrack } from '../content/MusicCatalog';
import type { Scene } from '../core/scene/Scene';
import { randomBetween } from '../core/utils/random';
import { BeatmapPlayer } from '../game/beatmap/BeatmapPlayer';
import { GAME_CONFIG } from '../game/config';
import type { NoteKind } from '../game/notes/NoteKind';
import { ScoreModel } from '../game/score/ScoreModel';
import { TargetNode } from '../game/targets/TargetNode';
import { GameHud } from '../ui/GameHud';

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
}

export interface GameSceneOptions {
  audioManager: AudioManager;
  track: MusicTrack | null;
  beatmap: Beatmap | null;
}

export class GameScene implements Scene {
  readonly id = 'game';
  readonly root = new Container();

  private readonly playfield = new Container();
  private readonly targets = new Container();
  private readonly hud = new GameHud();
  private readonly score = new ScoreModel();
  private readonly audioManager: AudioManager;
  private readonly track: MusicTrack | null;
  private readonly beatmapPlayer: BeatmapPlayer | null;
  private readonly pendingEvents: Array<{ kind: NoteKind }> = [];
  private activeTarget: TargetNode | null = null;
  private dragState: DragState | null = null;
  private width: number;
  private height: number;
  private musicStarted = false;

  constructor(width: number, height: number, options: GameSceneOptions) {
    this.width = width;
    this.height = height;
    this.audioManager = options.audioManager;
    this.track = options.track;
    this.beatmapPlayer = options.beatmap ? new BeatmapPlayer(options.beatmap) : null;
    this.playfield.addChild(this.targets);
    this.root.addChild(this.playfield, this.hud);
  }

  mount(): void {
    this.playfield.eventMode = 'static';
    this.playfield.on('pointerdown', this.handlePointerDown);
    this.playfield.on('pointermove', this.handlePointerMove);
    this.playfield.on('pointerup', this.handlePointerUp);
    this.playfield.on('pointerupoutside', this.handlePointerUp);
    this.resize(this.width, this.height);
    this.spawnTarget('tap');
  }

  update(deltaSeconds: number): void {
    this.activeTarget?.animate(deltaSeconds);

    if (!this.musicStarted || !this.beatmapPlayer || !this.audioManager.isPlaying) return;

    this.pendingEvents.push(...this.beatmapPlayer.collectDueEvents(this.audioManager.currentTime));
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
    if (!target || !target.isHitAt(event.global.x, event.global.y)) return;

    if (target.kind === 'drag') {
      this.dragState = {
        pointerId: event.pointerId,
        startX: event.global.x,
        startY: event.global.y,
      };
      return;
    }

    this.resolveTarget(target.kind !== 'danger');
  };

  private readonly handlePointerMove = (event: FederatedPointerEvent): void => {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;

    const distance = Math.hypot(
      event.global.x - this.dragState.startX,
      event.global.y - this.dragState.startY,
    );
    const progress = Math.min(1, distance / GAME_CONFIG.dragDistance);
    this.activeTarget?.setDragProgress(progress);

    if (progress >= 1) {
      this.dragState = null;
      this.resolveTarget(true);
    }
  };

  private readonly handlePointerUp = (event: FederatedPointerEvent): void => {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;

    this.dragState = null;
    this.resolveTarget(false);
  };

  private startMusic(): void {
    if (this.musicStarted) return;

    this.musicStarted = true;
    this.audioManager.unlock();
    if (this.track) {
      void this.audioManager.play(this.track).catch((error: unknown) => {
        this.musicStarted = false;
        console.warn('No se pudo reproducir la cancion.', error);
      });
    }
  }

  private resolveTarget(success: boolean): void {
    if (!this.activeTarget) return;

    if (success) {
      this.score.hit(GAME_CONFIG.scorePerHit, GAME_CONFIG.comboBonus);
    } else {
      this.score.miss();
    }

    this.hud.update(this.score.snapshot());
    this.activeTarget.destroy();
    this.activeTarget = null;

    if (this.pendingEvents.length > 0) this.spawnNextPendingTarget();
    else if (!this.beatmapPlayer) this.spawnTarget('tap');
  }

  private spawnNextPendingTarget(): void {
    const nextEvent = this.pendingEvents.shift();
    this.spawnTarget(nextEvent?.kind ?? 'tap');
  }

  private spawnTarget(kind: NoteKind): void {
    this.activeTarget?.destroy();

    const target = new TargetNode(kind);
    const horizontalMargin = GAME_CONFIG.targetSideMargin;
    const verticalMargin = GAME_CONFIG.targetSideMargin;
    const minimumY = GAME_CONFIG.targetSpawnTop;
    const maximumX = Math.max(horizontalMargin, this.width - horizontalMargin);
    const maximumY = Math.max(minimumY + verticalMargin, this.height - verticalMargin);

    target.position.set(
      randomBetween(horizontalMargin, maximumX),
      randomBetween(minimumY, maximumY),
    );

    this.activeTarget = target;
    this.targets.addChild(target);
  }
}
