import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import {
  composeCustomTheme,
  THEME_COMPONENT_LABELS,
  THEME_COMPONENT_SLOTS,
  type CustomThemeSelection,
  type ThemeComponentOption,
  type ThemeComponentSlot,
} from '../customization/ThemeComponents';
import type { VisualQualityProfile } from '../customization/VisualQuality';
import type { Scene } from '../core/scene/Scene';
import { MenuButton } from '../ui/MenuButton';
import { ThemePreview } from '../ui/ThemePreview';

export interface CustomThemeSceneOptions {
  initialSelection: CustomThemeSelection;
  available: Record<ThemeComponentSlot, ThemeComponentOption[]>;
  visualQuality: VisualQualityProfile;
  onSave: (selection: CustomThemeSelection) => void;
  onBack: () => void;
}

const titleStyle = new TextStyle({
  fill: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: 25,
  fontWeight: '900', letterSpacing: 2, align: 'center',
});
const subtitleStyle = new TextStyle({
  fill: '#9fb1d2', fontFamily: 'system-ui, sans-serif', fontSize: 10,
  fontWeight: '700', align: 'center',
});

export class CustomThemeScene implements Scene {
  readonly id = 'custom-theme';
  readonly root = new Container();

  private readonly background = new Graphics();
  private readonly title = new Text({ text: 'MI SKIN', style: titleStyle });
  private readonly subtitle = new Text({
    text: 'TOCA CADA PIEZA PARA COMBINAR TUS TEMAS DESBLOQUEADOS',
    style: subtitleStyle,
  });
  private readonly preview: ThemePreview;
  private readonly componentButtons: Record<ThemeComponentSlot, MenuButton>;
  private readonly backButton: MenuButton;
  private readonly saveButton: MenuButton;
  private selection: CustomThemeSelection;
  private width: number;
  private height: number;

  constructor(width: number, height: number, private readonly options: CustomThemeSceneOptions) {
    this.width = width;
    this.height = height;
    this.selection = { ...options.initialSelection };
    this.preview = new ThemePreview(options.visualQuality);
    this.backButton = new MenuButton('‹', options.onBack, 0x17233e, 44);
    this.saveButton = new MenuButton('GUARDAR Y EQUIPAR', this.save, 0x187762, 56);
    this.componentButtons = Object.fromEntries(THEME_COMPONENT_SLOTS.map((slot) => [
      slot,
      new MenuButton('', () => this.cycle(slot), 0x132c3b, 52),
    ])) as Record<ThemeComponentSlot, MenuButton>;
    this.root.addChild(
      this.background,
      this.title,
      this.subtitle,
      this.preview,
      ...THEME_COMPONENT_SLOTS.map((slot) => this.componentButtons[slot]),
      this.backButton,
      this.saveButton,
    );
  }

  mount(): void {
    this.refresh();
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    this.preview.updatePreview(deltaSeconds);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const landscape = width > height && width >= 650;
    const theme = composeCustomTheme(this.selection);
    this.background.clear().rect(0, 0, width, height).fill(theme.background.backdrop)
      .circle(width * 0.12, height * 0.18, Math.max(width, height) * 0.24)
      .fill({ color: theme.background.phasePrimary[0], alpha: 0.045 })
      .circle(width * 0.9, height * 0.78, Math.max(width, height) * 0.27)
      .fill({ color: theme.background.phasePrimary[2], alpha: 0.04 });
    this.title.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.backButton.resize(46);
    this.backButton.position.set(10, 12);
    if (landscape) this.resizeLandscape(width, height);
    else this.resizePortrait(width, height);
  }

  unmount(): void {}

  private resizePortrait(width: number, height: number): void {
    const compact = height < 680;
    const contentWidth = Math.min(520, width - 28);
    const x = (width - contentWidth) / 2;
    this.title.position.set(width / 2, 34);
    this.subtitle.visible = !compact;
    this.subtitle.position.set(width / 2, 64);
    const previewTop = compact ? 62 : 84;
    const previewHeight = compact ? 142 : Math.min(235, height * 0.27);
    this.preview.position.set(x, previewTop);
    this.preview.resize(contentWidth, previewHeight);
    const gridTop = previewTop + previewHeight + 12;
    const gap = 8;
    const buttonWidth = (contentWidth - gap) / 2;
    THEME_COMPONENT_SLOTS.forEach((slot, index) => {
      const button = this.componentButtons[slot];
      button.resize(buttonWidth);
      button.position.set(x + index % 2 * (buttonWidth + gap), gridTop + Math.floor(index / 2) * 60);
    });
    this.saveButton.resize(contentWidth);
    this.saveButton.position.set(x, height - 70);
  }

  private resizeLandscape(width: number, height: number): void {
    const contentWidth = Math.min(930, width - 34);
    const x = (width - contentWidth) / 2;
    const gap = 18;
    const previewWidth = contentWidth * 0.54;
    const rightX = x + previewWidth + gap;
    const rightWidth = contentWidth - previewWidth - gap;
    this.title.position.set(x + previewWidth / 2, 27);
    this.subtitle.position.set(x + previewWidth / 2, 52);
    this.subtitle.visible = height >= 370;
    this.preview.position.set(x, 70);
    this.preview.resize(previewWidth, Math.max(180, height - 88));
    const buttonWidth = (rightWidth - 8) / 2;
    THEME_COMPONENT_SLOTS.forEach((slot, index) => {
      const button = this.componentButtons[slot];
      button.resize(buttonWidth);
      button.position.set(rightX + index % 2 * (buttonWidth + 8), 70 + Math.floor(index / 2) * 60);
    });
    this.saveButton.resize(rightWidth);
    this.saveButton.position.set(rightX, height - 70);
  }

  private readonly save = (): void => {
    this.options.onSave({ ...this.selection });
  };

  private cycle(slot: ThemeComponentSlot): void {
    const options = this.options.available[slot];
    if (options.length === 0) return;
    const current = options.findIndex((option) => option.themeId === this.selection[slot]);
    this.selection[slot] = options[(current + 1) % options.length].themeId;
    this.refresh();
    this.resize(this.width, this.height);
  }

  private refresh(): void {
    this.preview.setTheme(composeCustomTheme(this.selection));
    for (const slot of THEME_COMPONENT_SLOTS) {
      const source = this.options.available[slot].find(
        (option) => option.themeId === this.selection[slot],
      );
      this.componentButtons[slot].setText(
        `${THEME_COMPONENT_LABELS[slot]} · ${source?.themeName.toUpperCase() ?? 'NEON PULSE'}`,
      );
      this.componentButtons[slot].setEnabled(this.options.available[slot].length > 0);
    }
  }
}
