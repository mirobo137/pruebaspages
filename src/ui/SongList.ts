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
  number: Text;
  playState: Graphics;
  title: Text;
  subtitle: Text;
  stars: Text;
  stats: Text;
  state: Text;
  previewTrack: Graphics;
  previewFill: Graphics;
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
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 0.7,
});

const numberStyle = new TextStyle({
  fill: '#637397',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '800',
  letterSpacing: 1,
});

const starsStyle = new TextStyle({
  fill: '#ffd76a',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  fontWeight: '800',
  letterSpacing: 0.8,
});

const statsStyle = new TextStyle({
  fill: '#aab8d9',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '700',
  letterSpacing: 0.55,
});

const stateStyle = new TextStyle({
  fill: '#ffcf70',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '900',
  letterSpacing: 0.9,
});

const hintStyle = new TextStyle({
  fill: '#b8c7e9',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '900',
  letterSpacing: 1.25,
});

const emptyStyle = new TextStyle({
  fill: '#8190b5',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  fontWeight: '800',
  letterSpacing: 1,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 260,
});

export class SongList extends Container {
  private readonly frame = new Graphics();
  private readonly viewport = new Container();
  private readonly viewportMask = new Graphics();
  private readonly emptyMessage = new Text({
    text: 'NO HAY CANCIONES EN ESTA CATEGORIA',
    style: emptyStyle,
  });
  private readonly scrollRail = new Graphics();
  private readonly scrollThumb = new Graphics();
  private readonly hintBackground = new Graphics();
  private readonly scrollHint = new Text({ text: 'DESLIZA', style: hintStyle });
  private readonly hintArrows = new Graphics();
  private readonly rows: SongRow[] = [];
  private items: SongListItem[] = [];
  private selectedIndex = 0;
  private previewIndex: number | null = null;
  private previewProgress = 0;
  private listWidth = 320;
  private listHeight = 220;
  private scrollOffset = 0;
  private pointerId: number | null = null;
  private pointerStartY = 0;
  private scrollStart = 0;
  private draggedDistance = 0;
  private readonly rowHeight = 86;
  private readonly rowGap = 6;

  constructor(private readonly onSelect: (index: number) => void) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.viewport.mask = this.viewportMask;
    this.emptyMessage.anchor.set(0.5);
    this.emptyMessage.eventMode = 'none';
    this.scrollRail.eventMode = 'none';
    this.scrollThumb.eventMode = 'none';
    this.hintBackground.eventMode = 'none';
    this.scrollHint.eventMode = 'none';
    this.hintArrows.eventMode = 'none';
    this.addChild(
      this.frame,
      this.viewport,
      this.viewportMask,
      this.emptyMessage,
      this.scrollRail,
      this.scrollThumb,
      this.hintBackground,
      this.scrollHint,
      this.hintArrows,
    );
    this.on('pointerdown', this.handlePointerDown);
    this.on('pointermove', this.handlePointerMove);
    this.on('pointerup', this.handlePointerUp);
    this.on('pointerupoutside', this.handlePointerUp);
    this.on('pointercancel', this.handlePointerUp);
    this.on('wheel', this.handleWheel);
  }

  setItems(items: SongListItem[]): void {
    this.items = items;
    this.emptyMessage.visible = items.length === 0;
    for (const row of this.rows) row.root.destroy({ children: true });
    this.rows.length = 0;
    this.viewport.removeChildren();

    items.forEach((item, index) => {
      const root = new Container();
      const background = new Graphics();
      const accent = new Graphics();
      const number = new Text({
        text: String(index + 1).padStart(2, '0'),
        style: numberStyle,
      });
      const playState = new Graphics();
      const title = new Text({ text: item.title, style: titleStyle });
      const subtitle = new Text({ text: item.subtitle, style: subtitleStyle });
      const stars = new Text({ text: formatStars(item.stars), style: starsStyle });
      const stats = new Text({ text: '', style: statsStyle });
      const state = new Text({ text: '', style: stateStyle });
      const previewTrack = new Graphics();
      const previewFill = new Graphics();
      root.eventMode = 'none';
      root.position.y = index * (this.rowHeight + this.rowGap);
      root.addChild(
        background,
        accent,
        number,
        playState,
        title,
        subtitle,
        stars,
        stats,
        state,
        previewTrack,
        previewFill,
      );
      this.viewport.addChild(root);
      this.rows.push({
        root,
        background,
        accent,
        number,
        playState,
        title,
        subtitle,
        stars,
        stats,
        state,
        previewTrack,
        previewFill,
      });
    });

    this.selectedIndex = Math.max(0, Math.min(items.length - 1, this.selectedIndex));
    if (this.previewIndex !== null && this.previewIndex >= items.length) {
      this.previewIndex = null;
      this.previewProgress = 0;
    }
    this.clampScroll();
    this.drawRows();
  }

  setSelectedIndex(index: number | null): void {
    this.selectedIndex = index === null
      ? -1
      : Math.max(0, Math.min(this.items.length - 1, index));
    if (this.selectedIndex >= 0) this.ensureSelectedVisible();
    this.drawRows();
  }

  setEmptyMessage(message: string): void {
    this.emptyMessage.text = message;
  }

  setPreview(index: number | null, progress = 0): void {
    this.previewIndex = index;
    this.previewProgress = Math.max(0, Math.min(1, progress));
    this.drawRows();
  }

  resize(width: number, height: number): void {
    this.listWidth = width;
    this.listHeight = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.frame.clear()
      .roundRect(0, 0, width, height, 14)
      .fill({ color: 0x080e20, alpha: 0.92 })
      .stroke({ color: 0x6cecff, alpha: 0.24, width: 1 });
    this.frame
      .moveTo(18, 0)
      .lineTo(width * 0.42, 0)
      .stroke({ color: 0x67efff, alpha: 0.72, width: 1.4 });
    this.frame
      .moveTo(width * 0.7, height)
      .lineTo(width - 18, height)
      .stroke({ color: 0xff56d7, alpha: 0.58, width: 1.4 });
    this.viewportMask.clear().roundRect(1, 1, width - 2, height - 2, 13)
      .fill({ color: 0xffffff });
    this.emptyMessage.style.wordWrapWidth = Math.max(160, width - 70);
    this.emptyMessage.position.set(width / 2, height / 2);
    this.drawScrollChrome();
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
    this.drawScrollChrome();
  }

  private clampScroll(): void {
    const contentHeight = this.getContentHeight();
    const minimum = Math.min(0, this.listHeight - contentHeight);
    this.scrollOffset = Math.max(minimum, Math.min(0, this.scrollOffset));
    this.viewport.y = this.scrollOffset;
    this.drawScrollChrome();
  }

  private ensureSelectedVisible(): void {
    const rowTop = this.selectedIndex * (this.rowHeight + this.rowGap);
    const rowBottom = rowTop + this.rowHeight;
    if (rowTop + this.scrollOffset < 0) this.setScroll(-rowTop);
    if (rowBottom + this.scrollOffset > this.listHeight) {
      this.setScroll(this.listHeight - rowBottom);
    }
  }

  private getContentHeight(): number {
    return Math.max(
      0,
      this.items.length * (this.rowHeight + this.rowGap) - this.rowGap,
    );
  }

  private drawScrollChrome(): void {
    const contentHeight = this.getContentHeight();
    const canScroll = contentHeight > this.listHeight + 1;
    this.scrollRail.visible = canScroll;
    this.scrollThumb.visible = canScroll;
    this.hintBackground.visible = canScroll;
    this.scrollHint.visible = canScroll;
    this.hintArrows.visible = canScroll;
    if (!canScroll) return;

    const railTop = 13;
    const railHeight = Math.max(1, this.listHeight - railTop * 2);
    const thumbHeight = Math.max(30, railHeight * (this.listHeight / contentHeight));
    const maximumScroll = contentHeight - this.listHeight;
    const progress = maximumScroll > 0 ? -this.scrollOffset / maximumScroll : 0;
    const thumbY = railTop + progress * (railHeight - thumbHeight);
    const railX = this.listWidth - 7;

    this.scrollRail.clear()
      .roundRect(railX, railTop, 2, railHeight, 1)
      .fill({ color: 0x6e82ac, alpha: 0.18 });
    this.scrollThumb.clear()
      .roundRect(railX - 1, thumbY, 4, thumbHeight, 2)
      .fill({ color: 0x65efff, alpha: 0.72 });

    const hintWidth = 83;
    this.hintBackground.clear()
      .roundRect(this.listWidth - hintWidth - 14, 8, hintWidth, 22, 8)
      .fill({ color: 0x071020, alpha: 0.9 })
      .stroke({ color: 0x6defff, alpha: 0.22, width: 0.8 });
    this.scrollHint.anchor.set(0, 0.5);
    this.scrollHint.position.set(this.listWidth - hintWidth - 3, 19);
    this.hintArrows.clear()
      .moveTo(this.listWidth - 28, 15)
      .lineTo(this.listWidth - 24, 11)
      .lineTo(this.listWidth - 20, 15)
      .moveTo(this.listWidth - 28, 23)
      .lineTo(this.listWidth - 24, 27)
      .lineTo(this.listWidth - 20, 23)
      .stroke({ color: 0x6defff, alpha: 0.85, width: 1.2 });
  }

  private drawRows(): void {
    this.rows.forEach((row, index) => {
      const selected = index === this.selectedIndex;
      const previewing = index === this.previewIndex;
      const item = this.items[index];
      if (!item) return;
      const rowWidth = Math.max(0, this.listWidth - 16);
      const distance = this.selectedIndex >= 0
        ? Math.min(4, Math.abs(index - this.selectedIndex))
        : 0;
      row.root.x = selected ? 1 : distance * 1.2;
      row.root.scale.set(selected ? 1.012 : 1 - distance * 0.008);
      row.root.alpha = selected || previewing ? 1 : 0.88 - distance * 0.05;

      row.background.clear()
        .roundRect(9, 8, rowWidth, this.rowHeight - 6, 10)
        .fill({ color: 0x020611, alpha: selected ? 0.76 : 0.5 })
        .roundRect(6, 3, rowWidth, this.rowHeight - 6, 10)
        .fill({
          color: previewing ? 0x1a3e5d : selected ? 0x173252 : 0x10172b,
          alpha: selected || previewing ? 0.98 : 0.82,
        })
        .stroke({
          color: previewing ? 0xff5bd8 : selected ? 0x64efff : 0x6879aa,
          alpha: previewing ? 0.7 : selected ? 0.52 : 0.13,
          width: previewing ? 1.2 : 0.8,
        });
      if (selected || previewing) {
        row.background
          .moveTo(20, 7)
          .lineTo(rowWidth - 12, 7)
          .stroke({
            color: previewing ? 0xff72df : 0x78efff,
            alpha: 0.55,
            width: 1,
          });
      }
      row.accent.clear();
      if (selected || previewing) {
        row.accent
          .roundRect(6, 17, 2, this.rowHeight - 34, 1)
          .fill({ color: previewing ? 0xff55d8 : 0x62efff, alpha: 0.95 });
      }

      row.number.position.set(16, 13);
      row.number.style.fill = selected || previewing ? '#7eefff' : '#637397';
      row.playState.clear();
      if (previewing) {
        row.playState
          .moveTo(27, 34)
          .lineTo(27, 48)
          .lineTo(38, 41)
          .closePath()
          .fill({ color: 0xff62da, alpha: 0.96 });
      } else {
        row.playState
          .circle(32, 41, 5)
          .stroke({ color: selected ? 0x66efff : 0x7080a6, alpha: 0.75, width: 1 });
        row.playState
          .circle(32, 41, 1.5)
          .fill({ color: selected ? 0x66efff : 0x7080a6, alpha: 0.75 });
      }

      row.title.position.set(49, 10);
      row.title.style.fill = item.locked ? '#aab4ce' : '#f7f9ff';
      row.title.scale.set(1);
      const titleLimit = Math.max(90, this.listWidth - 194);
      if (row.title.width > titleLimit) row.title.scale.set(titleLimit / row.title.width);

      row.stars.anchor.set(1, 0);
      row.stars.position.set(this.listWidth - 24, 8);
      row.stars.alpha = item.stars > 0 ? 1 : 0.36;
      row.subtitle.position.set(49, 35);
      row.stats.position.set(49, 59);
      row.stats.text = item.attempts > 0
        ? `MEJOR ${item.highScore.toLocaleString()}  /  COMBO ${item.bestCombo}`
        : 'SIN REGISTRO EN ESTA DIFICULTAD';
      row.stats.alpha = item.locked ? 0.42 : 0.82;
      row.state.anchor.set(1, 0.5);
      row.state.position.set(this.listWidth - 23, 46);
      row.state.text = previewing ? 'PREVIEW 5S' : item.locked ? 'BLOQUEADA' : '';
      row.state.style.fill = previewing ? '#ff71dc' : '#ffcf70';

      row.previewTrack.clear();
      row.previewFill.clear();
      if (previewing) {
        const progressWidth = Math.max(0, rowWidth - 14);
        row.previewTrack
          .roundRect(13, this.rowHeight - 8, progressWidth, 2, 1)
          .fill({ color: 0x425273, alpha: 0.55 });
        row.previewFill
          .roundRect(13, this.rowHeight - 8, progressWidth * this.previewProgress, 2, 1)
          .fill({ color: 0xff5bd8, alpha: 0.95 });
      }
    });
    this.drawScrollChrome();
  }
}
