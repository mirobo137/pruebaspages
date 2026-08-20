import {
  Container,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';
import type { FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import type { ThemeCollectionItem } from '../customization/ThemeCollection';
import { capturePointer, releasePointer } from '../input/PointerCapture';

interface ThemeRow {
  root: Container;
  background: Graphics;
  icon: Graphics;
  title: Text;
  origin: Text;
  progress: Text;
  state: Text;
}

const titleStyle = new TextStyle({
  fill: '#f7f9ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  fontWeight: '900',
});

const originStyle = new TextStyle({
  fill: '#99a8ca',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 10,
  fontWeight: '700',
});

const progressStyle = new TextStyle({
  fill: '#cad5ef',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '800',
});

const stateStyle = new TextStyle({
  fill: '#74f6d6',
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

export class ThemeList extends Container {
  private readonly frame = new Graphics();
  private readonly viewport = new Container();
  private readonly viewportMask = new Graphics();
  private readonly scrollRail = new Graphics();
  private readonly scrollThumb = new Graphics();
  private readonly scrollHint = new Text({ text: 'DESLIZA', style: hintStyle });
  private readonly rows: ThemeRow[] = [];
  private items: readonly ThemeCollectionItem[] = [];
  private selectedThemeId = '';
  private equippedThemeId = '';
  private listWidth = 320;
  private listHeight = 190;
  private scrollOffset = 0;
  private pointerId: number | null = null;
  private pointerStartY = 0;
  private scrollStart = 0;
  private draggedDistance = 0;
  private readonly rowHeight = 88;
  private readonly rowGap = 7;

  constructor(private readonly onSelect: (themeId: string) => void) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.viewport.mask = this.viewportMask;
    this.scrollRail.eventMode = 'none';
    this.scrollThumb.eventMode = 'none';
    this.scrollHint.eventMode = 'none';
    this.addChild(
      this.frame,
      this.viewport,
      this.viewportMask,
      this.scrollRail,
      this.scrollThumb,
      this.scrollHint,
    );
    this.on('pointerdown', this.handlePointerDown);
    this.on('pointermove', this.handlePointerMove);
    this.on('pointerup', this.handlePointerUp);
    this.on('pointerupoutside', this.handlePointerUp);
    this.on('pointercancel', this.handlePointerUp);
    this.on('wheel', this.handleWheel);
  }

  setItems(items: readonly ThemeCollectionItem[]): void {
    this.items = items;
    for (const row of this.rows) row.root.destroy({ children: true });
    this.rows.length = 0;
    this.viewport.removeChildren();

    items.forEach((item, index) => {
      const root = new Container();
      const row: ThemeRow = {
        root,
        background: new Graphics(),
        icon: new Graphics(),
        title: new Text({ text: item.theme.name, style: titleStyle }),
        origin: new Text({ text: item.origin.toUpperCase(), style: originStyle }),
        progress: new Text({ text: item.progressLabel, style: progressStyle }),
        state: new Text({ text: '', style: stateStyle }),
      };
      root.eventMode = 'none';
      root.position.y = index * (this.rowHeight + this.rowGap);
      root.addChild(
        row.background,
        row.icon,
        row.title,
        row.origin,
        row.progress,
        row.state,
      );
      this.viewport.addChild(root);
      this.rows.push(row);
    });
    this.clampScroll();
    this.drawRows();
  }

  setSelectedTheme(themeId: string): void {
    this.selectedThemeId = themeId;
    this.ensureSelectedVisible();
    this.drawRows();
  }

  setEquippedTheme(themeId: string): void {
    this.equippedThemeId = themeId;
    this.drawRows();
  }

  resize(width: number, height: number): void {
    this.listWidth = width;
    this.listHeight = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.frame.clear()
      .roundRect(0, 0, width, height, 15)
      .fill({ color: 0x070d1d, alpha: 0.94 })
      .stroke({ color: 0x6cecff, alpha: 0.24, width: 1 });
    this.viewportMask.clear()
      .roundRect(1, 1, Math.max(0, width - 2), Math.max(0, height - 2), 14)
      .fill({ color: 0xffffff });
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
      const item = this.items[index];
      if (item) {
        this.selectedThemeId = item.theme.id;
        this.onSelect(item.theme.id);
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
  }

  private clampScroll(): void {
    const minimum = Math.min(0, this.listHeight - this.getContentHeight());
    this.scrollOffset = Math.max(minimum, Math.min(0, this.scrollOffset));
    this.viewport.y = this.scrollOffset;
    this.drawScrollChrome();
  }

  private ensureSelectedVisible(): void {
    const index = this.items.findIndex((item) => item.theme.id === this.selectedThemeId);
    if (index < 0) return;
    const rowTop = index * (this.rowHeight + this.rowGap);
    const rowBottom = rowTop + this.rowHeight;
    if (rowTop + this.scrollOffset < 0) this.setScroll(-rowTop);
    if (rowBottom + this.scrollOffset > this.listHeight) {
      this.setScroll(this.listHeight - rowBottom);
    }
  }

  private getContentHeight(): number {
    return Math.max(0, this.items.length * (this.rowHeight + this.rowGap) - this.rowGap);
  }

  private drawScrollChrome(): void {
    const contentHeight = this.getContentHeight();
    const canScroll = contentHeight > this.listHeight + 1;
    this.scrollRail.visible = canScroll;
    this.scrollThumb.visible = canScroll;
    this.scrollHint.visible = canScroll;
    if (!canScroll) return;

    const railTop = 38;
    const railHeight = Math.max(1, this.listHeight - railTop - 12);
    const thumbHeight = Math.max(28, railHeight * this.listHeight / contentHeight);
    const maximumScroll = contentHeight - this.listHeight;
    const progress = maximumScroll > 0 ? -this.scrollOffset / maximumScroll : 0;
    const thumbY = railTop + progress * (railHeight - thumbHeight);
    const railX = this.listWidth - 7;
    this.scrollRail.clear()
      .roundRect(railX, railTop, 2, railHeight, 1)
      .fill({ color: 0x7183a9, alpha: 0.18 });
    this.scrollThumb.clear()
      .roundRect(railX - 1, thumbY, 4, thumbHeight, 2)
      .fill({ color: 0x69efff, alpha: 0.75 });
    this.scrollHint.anchor.set(1, 0);
    this.scrollHint.position.set(this.listWidth - 15, 11);
  }

  private drawRows(): void {
    this.rows.forEach((row, index) => {
      const item = this.items[index];
      if (!item) return;
      const selected = item.theme.id === this.selectedThemeId;
      const equipped = item.theme.id === this.equippedThemeId;
      const primary = item.theme.background.phasePrimary[0];
      const secondary = item.theme.background.phasePrimary[2];
      const rowWidth = Math.max(0, this.listWidth - 16);
      row.background.clear()
        .roundRect(6, 3, rowWidth, this.rowHeight - 6, 11)
        .fill({
          color: selected ? item.theme.background.backdrop : 0x10172b,
          alpha: selected ? 0.98 : 0.78,
        })
        .stroke({
          color: selected ? primary : 0x6e7fa8,
          alpha: selected ? 0.78 : 0.15,
          width: selected ? 1.3 : 0.8,
        });
      row.icon.clear()
        .circle(32, 44, 23)
        .fill({ color: primary, alpha: selected ? 0.16 : 0.09 })
        .circle(32, 44, 15)
        .fill({ color: item.theme.target.innerSurface, alpha: 0.95 });
      if (item.theme.target.shape === 'faceted') {
        row.icon.regularPoly(32, 44, 15, 6).stroke({ color: primary, alpha: 0.95, width: 2 });
      } else if (item.theme.target.shape === 'segmented') {
        for (let segment = 0; segment < 6; segment += 1) {
          const start = segment * Math.PI / 3 + 0.08;
          row.icon
            .moveTo(
              32 + Math.cos(start) * 16,
              44 + Math.sin(start) * 16,
            )
            .arc(32, 44, 16, start, start + Math.PI / 3 - 0.16)
            .stroke({ color: primary, alpha: 0.95, width: 2 });
        }
      } else if (item.theme.target.shape === 'stellar') {
        row.icon.star(32, 44, 6, 16, 7).stroke({ color: primary, alpha: 0.95, width: 2 });
      } else {
        row.icon.circle(32, 44, 16).stroke({ color: primary, alpha: 0.95, width: 2 });
        row.icon.circle(32, 44, 8).stroke({ color: secondary, alpha: 0.72, width: 1 });
      }
      if (!item.unlocked) {
        row.icon.rect(27, 41, 10, 9).stroke({ color: 0xffcf70, width: 1.4 });
        row.icon
          .moveTo(28, 41)
          .arc(32, 41, 4, Math.PI, 0)
          .stroke({ color: 0xffcf70, width: 1.4 });
      }

      row.title.position.set(63, 10);
      row.title.style.fill = item.unlocked ? '#f7f9ff' : '#aab4ce';
      row.origin.position.set(63, 36);
      row.progress.position.set(63, 59);
      row.progress.text = item.progressLabel;
      row.progress.style.fill = item.unlocked ? '#74f6d6' : '#ffcf70';
      row.state.anchor.set(1, 0);
      row.state.position.set(this.listWidth - 23, 13);
      row.state.text = equipped
        ? 'EQUIPADO'
        : item.unlocked
          ? 'DISPONIBLE'
          : 'BLOQUEADO';
      row.state.style.fill = equipped
        ? '#74f6d6'
        : item.unlocked
          ? '#8fdcff'
          : '#ffcf70';
    });
    this.drawScrollChrome();
  }
}
