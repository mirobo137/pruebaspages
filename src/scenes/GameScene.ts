import { Container, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import type { Scene } from '../core/scene/Scene';
import { randomBetween } from '../core/utils/random';
import { GAME_CONFIG } from '../game/config';
import { ScoreModel } from '../game/score/ScoreModel';
import { TargetNode } from '../game/targets/TargetNode';
import { GameHud } from '../ui/GameHud';

export class GameScene implements Scene {
  readonly id = 'game';
  readonly root = new Container();

  private readonly playfield = new Container();
  private readonly targets = new Container();
  private readonly hud = new GameHud();
  private readonly score = new ScoreModel();
  private activeTarget: TargetNode | null = null;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.playfield.addChild(this.targets);
    this.root.addChild(this.playfield, this.hud);
  }

  mount(): void {
    this.playfield.eventMode = 'static';
    this.playfield.on('pointertap', this.handlePointerTap);
    this.resize(this.width, this.height);
    this.spawnTarget();
  }

  update(deltaSeconds: number): void {
    this.activeTarget?.animate(deltaSeconds);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.playfield.hitArea = new Rectangle(0, 0, width, height);
    this.hud.resize(width);
  }

  unmount(): void {
    this.playfield.off('pointertap', this.handlePointerTap);
    this.activeTarget?.destroy();
    this.activeTarget = null;
  }

  private readonly handlePointerTap = (event: FederatedPointerEvent): void => {
    const target = this.activeTarget;
    if (!target || !target.isHitAt(event.global.x, event.global.y)) return;

    if (target.kind === 'danger') {
      this.score.miss();
    } else {
      this.score.hit(GAME_CONFIG.scorePerHit, GAME_CONFIG.comboBonus);
    }

    this.hud.update(this.score.snapshot());
    this.spawnTarget();
  };

  private spawnTarget(): void {
    this.activeTarget?.destroy();

    const target = new TargetNode('tap');
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
