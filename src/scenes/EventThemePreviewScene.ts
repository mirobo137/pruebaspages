import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { VisualTheme } from '../customization/ThemeTypes';
import type { VisualQualityProfile } from '../customization/VisualQuality';
import type { EventRewardDefinition } from '../events/EventTypes';
import type { Scene } from '../core/scene/Scene';
import { MenuButton } from '../ui/MenuButton';
import { ThemePreview } from '../ui/ThemePreview';

export interface EventThemePreviewSceneOptions {
  eventName: string;
  theme: VisualTheme;
  rewards: readonly EventRewardDefinition[];
  claimedRewardIds: readonly string[];
  visualQuality: VisualQualityProfile;
  onBack: () => void;
}

const titleStyle = new TextStyle({
  fill: '#f7fff9', fontFamily: 'system-ui, sans-serif', fontSize: 25,
  fontWeight: '900', letterSpacing: 1.8, align: 'center',
});
const subtitleStyle = new TextStyle({
  fill: '#a9c6bc', fontFamily: 'system-ui, sans-serif', fontSize: 10,
  fontWeight: '800', letterSpacing: 1, align: 'center',
});
const componentStyle = new TextStyle({
  fill: '#dcebe6', fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: '800',
});

export class EventThemePreviewScene implements Scene {
  readonly id = 'event-preview';
  readonly root = new Container();
  private readonly background = new Graphics();
  private readonly title: Text;
  private readonly subtitle = new Text({ text: 'RECOMPENSA FINAL DEL EVENTO', style: subtitleStyle });
  private readonly preview: ThemePreview;
  private readonly components: Text[];
  private readonly backButton: MenuButton;
  private width: number;
  private height: number;

  constructor(width: number, height: number, private readonly options: EventThemePreviewSceneOptions) {
    this.width = width;
    this.height = height;
    this.title = new Text({ text: options.eventName.toUpperCase(), style: titleStyle });
    this.preview = new ThemePreview(options.visualQuality);
    const claimed = new Set(options.claimedRewardIds);
    this.components = options.rewards.slice(0, 6).map((reward) => new Text({
      text: `${claimed.has(reward.id) ? '✓' : '◇'}  ${reward.label.toUpperCase()}`,
      style: componentStyle,
    }));
    this.backButton = new MenuButton('VOLVER AL EVENTO', options.onBack, 0x175d4c, 54);
    this.root.addChild(this.background, this.title, this.subtitle, this.preview, ...this.components, this.backButton);
  }

  mount(): void {
    this.preview.setTheme(this.options.theme);
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    this.preview.updatePreview(deltaSeconds);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const theme = this.options.theme;
    this.background.clear().rect(0, 0, width, height).fill(theme.background.backdrop)
      .circle(width * 0.08, height * 0.2, Math.max(width, height) * 0.3)
      .fill({ color: theme.background.phasePrimary[0], alpha: 0.055 })
      .circle(width * 0.93, height * 0.74, Math.max(width, height) * 0.28)
      .fill({ color: theme.background.phasePrimary[2], alpha: 0.045 });
    this.title.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.title.position.set(width / 2, 34);
    this.subtitle.position.set(width / 2, 65);
    const landscape = width > height && width >= 650;
    const contentWidth = Math.min(920, width - 28);
    const x = (width - contentWidth) / 2;
    if (landscape) {
      const previewWidth = contentWidth * 0.62;
      this.preview.position.set(x, 82);
      this.preview.resize(previewWidth, height - 98);
      const rightX = x + previewWidth + 18;
      this.components.forEach((component, index) => component.position.set(rightX, 88 + index * 34));
      this.backButton.resize(contentWidth - previewWidth - 18);
      this.backButton.position.set(rightX, height - 66);
      return;
    }
    const compact = height < 680;
    const previewTop = 82;
    const previewHeight = compact ? 185 : Math.min(285, height * 0.34);
    this.preview.position.set(x, previewTop);
    this.preview.resize(contentWidth, previewHeight);
    const componentTop = previewTop + previewHeight + 14;
    this.components.forEach((component, index) => component.position.set(x + 8, componentTop + index * 27));
    this.backButton.resize(contentWidth);
    this.backButton.position.set(x, height - 66);
  }

  unmount(): void {}
}
