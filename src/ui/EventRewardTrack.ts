import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import type { EventRewardDefinition } from '../events/EventTypes';
import { capturePointer, releasePointer } from '../input/PointerCapture';

const labelStyle = new TextStyle({
  fill: '#f5fff9', fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: '800',
});
const stateStyle = new TextStyle({
  fill: '#9effdd', fontFamily: 'system-ui, sans-serif', fontSize: 9, fontWeight: '900', letterSpacing: 0.5,
});

interface RewardRow {
  root: Container; graphics: Graphics; label: Text; state: Text; reward: EventRewardDefinition;
}

export class EventRewardTrack extends Container {
  private readonly frame = new Graphics();
  private readonly viewport = new Container();
  private readonly maskShape = new Graphics();
  private readonly rows: RewardRow[] = [];
  private widthValue = 320;
  private heightValue = 220;
  private scroll = 0;
  private pointerId: number | null = null;
  private startY = 0;
  private startScroll = 0;
  private claimed = new Set<string>();
  private claimable = new Set<string>();

  constructor() {
    super();
    this.viewport.mask = this.maskShape;
    this.addChild(this.frame, this.viewport, this.maskShape);
    this.eventMode = 'static';
    this.on('pointerdown', this.onDown);
    this.on('pointermove', this.onMove);
    this.on('pointerup', this.onUp);
    this.on('pointerupoutside', this.onUp);
    this.on('pointercancel', this.onUp);
    this.on('wheel', this.onWheel);
  }

  setRewards(
    rewards: readonly EventRewardDefinition[],
    claimedIds: readonly string[],
    claimableIds: readonly string[],
  ): void {
    for (const row of this.rows) row.root.destroy({ children: true });
    this.rows.length = 0;
    this.viewport.removeChildren();
    this.claimed = new Set(claimedIds);
    this.claimable = new Set(claimableIds);
    rewards.forEach((reward, index) => {
      const root = new Container();
      const row = {
        root,
        graphics: new Graphics(),
        label: new Text({ text: reward.label.toUpperCase(), style: labelStyle }),
        state: new Text({ text: '', style: stateStyle }),
        reward,
      };
      root.position.y = index * 58;
      root.eventMode = 'none';
      root.addChild(row.graphics, row.label, row.state);
      this.viewport.addChild(root);
      this.rows.push(row);
    });
    this.clamp();
    this.drawRows();
  }

  resize(width: number, height: number): void {
    this.widthValue = width;
    this.heightValue = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.frame.clear().roundRect(0, 0, width, height, 14)
      .fill({ color: 0x061119, alpha: 0.88 })
      .stroke({ color: 0x71f9cb, alpha: 0.22, width: 1 });
    this.maskShape.clear().roundRect(1, 1, width - 2, height - 2, 13).fill(0xffffff);
    this.clamp();
    this.drawRows();
  }

  private readonly onDown = (event: FederatedPointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    capturePointer(event);
    this.pointerId = event.pointerId;
    this.startY = this.toLocal(event.global).y;
    this.startScroll = this.scroll;
  };

  private readonly onMove = (event: FederatedPointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.scroll = this.startScroll + this.toLocal(event.global).y - this.startY;
    this.clamp();
  };

  private readonly onUp = (event: FederatedPointerEvent): void => {
    releasePointer(event);
    if (event.pointerId === this.pointerId) this.pointerId = null;
  };

  private readonly onWheel = (event: FederatedWheelEvent): void => {
    event.preventDefault();
    this.scroll -= event.deltaY * 0.5;
    this.clamp();
  };

  private clamp(): void {
    const contentHeight = Math.max(0, this.rows.length * 58 - 4);
    this.scroll = Math.max(Math.min(0, this.heightValue - contentHeight), Math.min(0, this.scroll));
    this.viewport.y = this.scroll;
  }

  private drawRows(): void {
    this.rows.forEach((row, index) => {
      const claimed = this.claimed.has(row.reward.id);
      const claimable = this.claimable.has(row.reward.id);
      const color = claimed ? 0x5ef1bc : claimable ? 0xeaff7c : 0x56847b;
      row.graphics.clear()
        .roundRect(8, 5, Math.max(0, this.widthValue - 16), 49, 10)
        .fill({ color: claimable ? 0x17372d : 0x0d2024, alpha: 0.92 })
        .stroke({ color, alpha: claimable ? 0.85 : 0.25, width: claimable ? 1.5 : 1 })
        .circle(29, 29, 13).fill({ color, alpha: claimed ? 0.85 : 0.17 })
        .circle(29, 29, 5).fill({ color, alpha: 0.9 });
      if (index < this.rows.length - 1) {
        row.graphics.moveTo(29, 43).lineTo(29, 61)
          .stroke({ color: 0x62eec1, alpha: 0.3, width: 2 });
      }
      row.label.position.set(52, 12);
      row.label.style.fill = claimed ? '#a6ffe1' : claimable ? '#f4ffb2' : '#bdcbc9';
      row.state.anchor.set(1, 0);
      row.state.position.set(this.widthValue - 20, 32);
      row.state.text = claimed
        ? 'OBTENIDO'
        : claimable
          ? 'LISTO PARA RECLAMAR'
          : `${row.reward.pointsRequired} PTS`;
      row.state.style.fill = claimed ? '#78f4c5' : claimable ? '#efff7e' : '#7caaa0';
    });
  }
}
