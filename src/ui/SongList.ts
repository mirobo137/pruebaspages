import {
  Container,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';
import type { FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import { capturePointer, releasePointer } from '../input/PointerCapture';

export interface SongListItem {
  title: string;
  subtitle: string;
  locked: boolean;
}

interface SongRow {
  root: Container;
  background: Graphics;
  title: Text;
  subtitle: Text;
  lock: Text;
}

const titleStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 18,
  fontWeight: '800',
});

const subtitleStyle = new TextStyle({
  fill: '#9ba8c9',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
});

const lockStyle = new TextStyle({
  fill: '#ffcf70',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  fontWeight: '800',
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
  private readonly rowHeight = 66;
  private readonly rowGap = 8;

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
      const title = new Text({ text: item.title, style: titleStyle });
      const subtitle = new Text({ text: item.subtitle, style: subtitleStyle });
      const lock = new Text({ text: item.locked ? 'BLOQUEADA' : '', style: lockStyle });
      root.eventMode = 'none';
      root.position.y = index * (this.rowHeight + this.rowGap);
      root.addChild(background, title, subtitle, lock);
      this.viewport.addChild(root);
      this.rows.push({ root, background, title, subtitle, lock });
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
    this.frame.clear().roundRect(0, 0, width, height, 18).fill({
      color: 0x11182d,
      alpha: 0.95,
    }).stroke({ color: 0x7087cf, alpha: 0.2, width: 2 });
    this.viewportMask.clear().roundRect(0, 0, width, height, 18).fill({ color: 0xffffff });
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
      row.background.clear().roundRect(6, 0, Math.max(0, this.listWidth - 12), this.rowHeight, 14).fill({
        color: selected ? 0x263f86 : 0x18213b,
        alpha: selected ? 1 : 0.8,
      }).stroke({
        color: selected ? 0x91aaff : 0x52628f,
        alpha: selected ? 0.8 : 0.18,
        width: selected ? 2 : 1,
      });
      row.title.position.set(22, 12);
      row.title.style.fill = item?.locked ? '#bac3dc' : '#ffffff';
      row.subtitle.position.set(22, 39);
      row.lock.anchor.set(1, 0.5);
      row.lock.position.set(this.listWidth - 24, this.rowHeight / 2);
    });
  }
}
