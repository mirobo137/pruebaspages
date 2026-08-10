import {
  Container,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';
import type { FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import { capturePointer, releasePointer } from '../input/PointerCapture';
import { formatStars } from '../progression/StarRating';

export interface SongListItem {
  title: string;
  subtitle: string;
  locked: boolean;
  stars: number;
  highScore: number;
  bestCombo: number;
  attempts: number;
}

interface SongRow {
  root: Container;
  background: Graphics;
  accent: Graphics;
  title: Text;
  subtitle: Text;
  stars: Text;
  stats: Text;
  lock: Text;
}

const titleStyle = new TextStyle({
  fill: '#f7f9ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  fontWeight: '800',
});

const subtitleStyle = new TextStyle({
  fill: '#8695bb',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '600',
  letterSpacing: 0.4,
});

const starsStyle = new TextStyle({
  fill: '#ffd76a',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 17,
  fontWeight: '800',
  letterSpacing: 1,
});

const statsStyle = new TextStyle({
  fill: '#aab8d9',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 0.6,
});

const lockStyle = new TextStyle({
  fill: '#ffcf70',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 10,
  fontWeight: '900',
  letterSpacing: 1,
});

export class SongList extends Container {
  private readonly frame = new Graphics();
  private readonly viewport = new Container();
  private readonly viewportMask = new Graphics();
  private readonly rows: SongRow[] = [];
  private items: SongListItem[] = [];
  private selectedIndex = 0;
  private listWidth = 320;
  private listHeight = 220;
  private scrollOffset = 0;
  private pointerId: number | null = null;
  private pointerStartY = 0;
  private scrollStart = 0;
  private draggedDistance = 0;
  private readonly rowHeight = 82;
  private readonly rowGap = 7;

  constructor(private readonly onSelect: (index: number) => void) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.viewport.mask = this.viewportMask;
    this.addChild(this.frame, this.viewport, this.viewportMask);
    this.on('pointerdown', this.handlePointerDown);
    this.on('pointermove', this.handlePointerMove);
    this.on('pointerup', this.handlePointerUp);
    this.on('pointerupoutside', this.handlePointerUp);
    this.on('pointercancel', this.handlePointerUp);
    this.on('wheel', this.handleWheel);
  }

  setItems(items: SongListItem[]): void {
    this.items = items;
    for (const row of this.rows) row.root.destroy({ children: true });
    this.rows.length = 0;
    this.viewport.removeChildren();

    items.forEach((item, index) => {
      const root = new Container();
      const background = new Graphics();
      const accent = new Graphics();
      const title = new Text({ text: item.title, style: titleStyle });
      const subtitle = new Text({ text: item.subtitle, style: subtitleStyle });
      const stars = new Text({ text: formatStars(item.stars), style: starsStyle });
      const stats = new Text({ text: '', style: statsStyle });
      const lock = new Text({ text: item.locked ? 'BLOQUEADA' : '', style: lockStyle });
      root.eventMode = 'none';
      root.position.y = index * (this.rowHeight + this.rowGap);
      root.addChild(background, accent, title, subtitle, stars, stats, lock);
      this.viewport.addChild(root);
      this.rows.push({ root, background, accent, title, subtitle, stars, stats, lock });
    });

    this.selectedIndex = Math.max(0, Math.min(items.length - 1, this.selectedIndex));
    this.clampScroll();
    this.drawRows();
  }

  setSelectedIndex(index: number): void {
    this.selectedIndex = Math.max(0, Math.min(this.items.length - 1, index));
    this.ensureSelectedVisible();
    this.drawRows();
  }

  resize(width: number, height: number): void {
    this.listWidth = width;
    this.listHeight = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.frame.clear()
      .roundRect(0, 0, width, height, 14)
      .fill({ color: 0x090f22, alpha: 0.86 })
      .stroke({ color: 0x6cecff, alpha: 0.2, width: 1 });
    this.frame
      .moveTo(18, 0)
      .lineTo(width * 0.42, 0)
      .stroke({ color: 0x67efff, alpha: 0.65, width: 1.4 });
    this.frame
      .moveTo(width * 0.7, height)
      .lineTo(width - 18, height)
      .stroke({ color: 0xff56d7, alpha: 0.5, width: 1.4 });
    this.viewportMask.clear().roundRect(0, 0, width, height, 14).fill({ color: 0xffffff });
    this.clampScroll();
    this.drawRows();
  }

  private readonly handlePointerDown = (event: FederatedPointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    capturePointer(event);
    const local = this.toLocal(event.global);
    this.pointerId = event.pointerId;
    this.pointerStartY = local.y;
    this.scrollStart = this.scrollOffset;
    this.draggedDistance = 0;
  };

  private readonly handlePointerMove = (event: FederatedPointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    const local = this.toLocal(event.global);
    const delta = local.y - this.pointerStartY;
    this.draggedDistance = Math.max(this.draggedDistance, Math.abs(delta));
    if (this.draggedDistance < 4) return;
    this.setScroll(this.scrollStart + delta);
  };

  private readonly handlePointerUp = (event: FederatedPointerEvent): void => {
    releasePointer(event);
    if (event.pointerId !== this.pointerId) return;

    if (this.draggedDistance < 9) {
      const local = this.toLocal(event.global);
      const index = Math.floor(
        (local.y - this.scrollOffset) / (this.rowHeight + this.rowGap),
      );
      if (index >= 0 && index < this.items.length) {
        this.selectedIndex = index;
        this.onSelect(index);
        this.drawRows();
      }
    }

    this.pointerId = null;
  };

  private readonly handleWheel = (event: FederatedWheelEvent): void => {
    event.preventDefault();
    this.setScroll(this.scrollOffset - event.deltaY * 0.55);
  };

  private setScroll(offset: number): void {
    this.scrollOffset = offset;
    this.clampScroll();
    this.viewport.y = this.scrollOffset;
  }

  private clampScroll(): void {
    const contentHeight = Math.max(
      0,
      this.items.length * (this.rowHeight + this.rowGap) - this.rowGap,
    );
    const minimum = Math.min(0, this.listHeight - contentHeight);
    this.scrollOffset = Math.max(minimum, Math.min(0, this.scrollOffset));
    this.viewport.y = this.scrollOffset;
  }

  private ensureSelectedVisible(): void {
    const rowTop = this.selectedIndex * (this.rowHeight + this.rowGap);
    const rowBottom = rowTop + this.rowHeight;
    if (rowTop + this.scrollOffset < 0) this.setScroll(-rowTop);
    if (rowBottom + this.scrollOffset > this.listHeight) {
      this.setScroll(this.listHeight - rowBottom);
    }
  }

  private drawRows(): void {
    this.rows.forEach((row, index) => {
      const selected = index === this.selectedIndex;
      const item = this.items[index];
      if (!item) return;

      row.background.clear()
        .roundRect(7, 3, Math.max(0, this.listWidth - 14), this.rowHeight - 6, 11)
        .fill({
          color: selected ? 0x152d53 : 0x11182d,
          alpha: selected ? 0.96 : 0.78,
        })
        .stroke({
          color: selected ? 0x64efff : 0x6879aa,
          alpha: selected ? 0.58 : 0.14,
          width: selected ? 1.2 : 0.8,
        });
      row.accent.clear();
      if (selected) {
        row.accent
          .roundRect(7, 17, 2, this.rowHeight - 34, 1)
          .fill({ color: 0x62efff, alpha: 0.95 });
        row.accent
          .circle(this.listWidth - 13, this.rowHeight / 2, 2)
          .fill({ color: 0xff55d8, alpha: 0.9 });
      }

      row.title.position.set(20, 11);
      row.title.style.fill = item.locked ? '#aab4ce' : '#f7f9ff';
      row.title.scale.set(1);
      const titleLimit = Math.max(100, this.listWidth - 154);
      if (row.title.width > titleLimit) row.title.scale.set(titleLimit / row.title.width);

      row.stars.anchor.set(1, 0);
      row.stars.position.set(this.listWidth - 20, 9);
      row.stars.alpha = item.stars > 0 ? 1 : 0.42;
      row.subtitle.position.set(20, 36);
      row.stats.position.set(20, 57);
      row.stats.text = item.attempts > 0
        ? `MEJOR ${item.highScore.toLocaleString()}  ·  COMBO ${item.bestCombo}`
        : 'SIN REGISTRO EN ESTA DIFICULTAD';
      row.stats.alpha = item.locked ? 0.45 : 0.85;
      row.lock.anchor.set(1, 0.5);
      row.lock.position.set(this.listWidth - 20, 45);
    });
  }
}
