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
import { TrackCoverArt } from './TrackCoverArt';

export interface SongListItem {
  title: string;
  subtitle: string;
  locked: boolean;
  stars: number;
  trackId: string;
  accent: number;
  secondary: number;
}

interface SongRow {
  root: Container;
  background: Graphics;
  cover: TrackCoverArt;
  equalizer: Graphics;
  title: Text;
  subtitle: Text;
  stars: Text;
  state: Text;
}

const titleStyle = new TextStyle({
  fill: '#f7f9ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  fontWeight: '800',
});

const subtitleStyle = new TextStyle({
  fill: '#8ea0c8',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '700',
});

const starsStyle = new TextStyle({
  fill: '#ffd76a',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  fontWeight: '800',
});

const stateStyle = new TextStyle({
  fill: '#ff9ae6',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '900',
});

const hintStyle = new TextStyle({
  fill: '#b8c7e9',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '900',
});

const emptyStyle = new TextStyle({
  fill: '#93a3c8',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  fontWeight: '800',
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 260,
});

const COVER_SIZE = 54;
const EQUALIZER_BARS = 5;

export class SongList extends Container {
  private readonly frame = new Graphics();
  private readonly viewport = new Container();
  private readonly viewportMask = new Graphics();
  private readonly emptyMessage = new Text({
    text: 'SIN CANCIONES AQUI',
    style: emptyStyle,
  });
  private readonly scrollRail = new Graphics();
  private readonly scrollThumb = new Graphics();
  private readonly hintBackground = new Graphics();
  private readonly scrollHint = new Text({ text: 'DESLIZA', style: hintStyle });
  private readonly hintArrows = new Graphics();
  private readonly rows: SongRow[] = [];
  private items: SongListItem[] = [];
  private selectedIndex = -1;
  private previewIndex: number | null = null;
  private previewProgress = 0;
  private listWidth = 320;
  private listHeight = 220;
  private scrollOffset = 0;
  private pointerId: number | null = null;
  private pointerStartY = 0;
  private scrollStart = 0;
  private draggedDistance = 0;
  private elapsed = 0;
  private readonly rowHeight = 88;
  private readonly rowGap = 8;

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
      const cover = new TrackCoverArt();
      const equalizer = new Graphics();
      const title = new Text({ text: item.title, style: titleStyle });
      const subtitle = new Text({ text: item.subtitle, style: subtitleStyle });
      const stars = new Text({ text: formatStars(item.stars), style: starsStyle });
      const state = new Text({ text: '', style: stateStyle });
      equalizer.blendMode = 'add';
      cover.setTrack(item.trackId, item.accent, item.secondary);
      cover.setSize(COVER_SIZE);
      root.eventMode = 'none';
      root.position.y = index * (this.rowHeight + this.rowGap);
      root.addChild(
        background,
        cover,
        equalizer,
        title,
        subtitle,
        stars,
        state,
      );
      this.viewport.addChild(root);
      this.rows.push({
        root,
        background,
        cover,
        equalizer,
        title,
        subtitle,
        stars,
        state,
      });
    });

    this.selectedIndex = Math.max(-1, Math.min(items.length - 1, this.selectedIndex));
    if (this.previewIndex !== null && this.previewIndex >= items.length) {
      this.previewIndex = null;
      this.previewProgress = 0;
    }
    this.clampScroll();
    this.drawRows();
  }

  setSelectedIndex(index: number | null): void {
    this.selectedIndex = index === null || index < 0
      ? -1
      : Math.max(0, Math.min(this.items.length - 1, index));
    if (this.selectedIndex >= 0) this.ensureSelectedVisible();
    this.drawRows();
  }

  setEmptyMessage(message: string): void {
    this.emptyMessage.text = message;
  }

  setPreview(index: number | null, progress = 0): void {
    const nextIndex = index !== null && index >= 0 ? index : null;
    const indexChanged = this.previewIndex !== nextIndex;
    this.previewIndex = nextIndex;
    this.previewProgress = Math.max(0, Math.min(1, progress));
    if (indexChanged) {
      this.drawRows();
      return;
    }
    this.rows.forEach((row, rowIndex) => {
      row.cover.setPreview(rowIndex === this.previewIndex ? this.previewProgress : null);
    });
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.rows.forEach((row, index) => {
      const selected = index === this.selectedIndex;
      const previewing = index === this.previewIndex;
      row.cover.setPreview(previewing ? this.previewProgress : null);
      row.cover.update(deltaSeconds);
      this.drawEqualizer(row, selected, previewing);
    });
  }

  resize(width: number, height: number): void {
    this.listWidth = width;
    this.listHeight = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.frame.clear()
      .roundRect(0, 0, width, height, 22)
      .fill({ color: 0x070b18, alpha: 0.62 })
      .stroke({ color: 0x79f3ff, alpha: 0.16, width: 1 });
    this.frame
      .roundRect(1, 1, width - 2, height - 2, 21)
      .stroke({ color: 0xffffff, alpha: 0.04, width: 1 });
    this.viewportMask.clear().roundRect(1, 1, width - 2, height - 2, 21)
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
      const index = this.hitRowIndex(local.y);
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

  private hitRowIndex(localY: number): number {
    const index = Math.floor(
      (localY - this.scrollOffset) / (this.rowHeight + this.rowGap),
    );
    if (index < 0 || index >= this.items.length) return -1;
    const rowTop = index * (this.rowHeight + this.rowGap) + this.scrollOffset;
    if (localY < rowTop || localY > rowTop + this.rowHeight) return -1;
    return index;
  }

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

    const railTop = 16;
    const railHeight = Math.max(1, this.listHeight - railTop * 2);
    const thumbHeight = Math.max(30, railHeight * (this.listHeight / contentHeight));
    const maximumScroll = contentHeight - this.listHeight;
    const progress = maximumScroll > 0 ? -this.scrollOffset / maximumScroll : 0;
    const thumbY = railTop + progress * (railHeight - thumbHeight);
    const railX = this.listWidth - 8;

    this.scrollRail.clear()
      .roundRect(railX, railTop, 3, railHeight, 2)
      .fill({ color: 0x6e82ac, alpha: 0.16 });
    this.scrollThumb.clear()
      .roundRect(railX - 1, thumbY, 5, thumbHeight, 3)
      .fill({ color: 0x73f2ff, alpha: 0.78 });

    const hintWidth = 86;
    this.hintBackground.clear()
      .roundRect(this.listWidth - hintWidth - 16, 10, hintWidth, 22, 11)
      .fill({ color: 0x071020, alpha: 0.82 })
      .stroke({ color: 0x6defff, alpha: 0.2, width: 0.8 });
    this.scrollHint.anchor.set(0, 0.5);
    this.scrollHint.position.set(this.listWidth - hintWidth - 5, 21);
    this.hintArrows.clear()
      .moveTo(this.listWidth - 30, 16)
      .lineTo(this.listWidth - 26, 12)
      .lineTo(this.listWidth - 22, 16)
      .moveTo(this.listWidth - 30, 26)
      .lineTo(this.listWidth - 26, 30)
      .lineTo(this.listWidth - 22, 26)
      .stroke({ color: 0x6defff, alpha: 0.85, width: 1.2 });
  }

  private drawRows(): void {
    this.rows.forEach((row, index) => {
      const selected = index === this.selectedIndex;
      const previewing = index === this.previewIndex;
      const item = this.items[index];
      if (!item) return;
      const rowWidth = Math.max(0, this.listWidth - 18);

      row.root.x = 8;
      row.root.alpha = selected || previewing ? 1 : 0.88;

      row.background.clear()
        .roundRect(0, 6, rowWidth, this.rowHeight - 8, 18)
        .fill({
          color: previewing ? 0x1a1633 : selected ? 0x12263c : 0x0c1324,
          alpha: 0.94,
        })
        .stroke({
          color: previewing ? 0xff6adf : selected ? 0x6af0ff : 0x4d5d82,
          alpha: previewing ? 0.72 : selected ? 0.48 : 0.12,
          width: previewing || selected ? 1.3 : 1,
        });

      row.cover.position.set(10, 12);
      row.cover.setTrack(item.trackId, item.accent, item.secondary);
      row.cover.setPreview(previewing ? this.previewProgress : null);

      const textX = 76;
      row.title.position.set(textX, 14);
      row.title.style.fill = item.locked ? '#c3cbe0' : '#f7f9ff';
      row.title.scale.set(1);
      const titleLimit = Math.max(88, this.listWidth - 168);
      if (row.title.width > titleLimit) row.title.scale.set(titleLimit / row.title.width);

      row.stars.anchor.set(1, 0);
      row.stars.position.set(this.listWidth - 32, 14);
      row.stars.alpha = item.stars > 0 ? 1 : 0.32;

      row.subtitle.position.set(textX, 36);
      row.subtitle.style.fill = item.locked ? '#d7b56a' : '#8ea0c8';

      row.state.anchor.set(1, 0.5);
      row.state.position.set(this.listWidth - 32, previewing ? 48 : 58);
      row.state.text = previewing
        ? 'ESCUCHANDO'
        : item.locked
          ? 'BLOQUEADA'
          : selected
            ? 'LISTA'
            : '';
      row.state.style.fill = previewing ? '#ff9ae6' : item.locked ? '#ffd27a' : '#7eefff';

      row.equalizer.position.set(textX, 64);
      this.drawEqualizer(row, selected, previewing);
    });
    this.drawScrollChrome();
  }

  private drawEqualizer(row: SongRow, selected: boolean, previewing: boolean): void {
    row.equalizer.clear();
    if (!previewing && !selected) return;
    const amplitude = previewing ? 1 : 0.28;
    const barWidth = 3.2;
    for (let index = 0; index < EQUALIZER_BARS; index += 1) {
      const wave = 0.35 + Math.abs(Math.sin(this.elapsed * (2.4 + index * 0.55) + index)) * 0.65;
      const height = (6 + wave * 12) * amplitude;
      row.equalizer
        .roundRect(index * 7, 10 - height, barWidth, height, 1.4)
        .fill({
          color: previewing ? 0xff66da : 0x6af0ff,
          alpha: 0.55 + wave * 0.4,
        });
    }
  }
}
