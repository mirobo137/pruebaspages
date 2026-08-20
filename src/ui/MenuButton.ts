import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';

const buttonTextStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 18,
  fontWeight: '800',
  align: 'center',
});

export class MenuButton extends Container {
  private readonly background = new Graphics();
  private readonly icon = new Graphics();
  private readonly badge = new Graphics();
  private readonly textLabel = new Text({ text: '', style: buttonTextStyle });
  private buttonWidth: number;
  private buttonHeight: number;
  private enabled = true;
  private hovered = false;
  private badgeVisible = false;
  private leadingIcon: 'play' | null = null;
  private readonly color: number;
  private readonly onPress: () => void;

  constructor(
    text: string,
    onPress: () => void,
    color = 0x3958b8,
    height = 64,
  ) {
    super();
    this.buttonWidth = 320;
    this.buttonHeight = height;
    this.color = color;
    this.onPress = onPress;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.icon.eventMode = 'none';
    this.badge.eventMode = 'none';
    this.textLabel.anchor.set(0.5);
    this.addChild(this.background, this.icon, this.textLabel, this.badge);
    this.hitArea = new Rectangle(0, 0, this.buttonWidth, this.buttonHeight);
    this.on('pointertap', this.handlePress);
    this.on('pointerover', () => {
      this.hovered = true;
      this.draw();
    });
    this.on('pointerout', () => {
      this.hovered = false;
      this.draw();
    });
    this.setText(text);
    this.draw();
  }

  setText(text: string): void {
    this.textLabel.text = text;
    this.layoutLabel();
    this.draw();
  }

  setLeadingIcon(icon: 'play' | null): void {
    this.leadingIcon = icon;
    this.layoutLabel();
    this.draw();
  }

  setBadge(visible: boolean): void {
    this.badgeVisible = visible;
    this.draw();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.alpha = enabled ? 1 : 0.45;
    this.cursor = enabled ? 'pointer' : 'default';
    this.draw();
  }

  resize(width: number, height = this.buttonHeight): void {
    this.buttonWidth = width;
    this.buttonHeight = height;
    this.hitArea = new Rectangle(0, 0, this.buttonWidth, this.buttonHeight);
    this.layoutLabel();
    this.draw();
  }

  private layoutLabel(): void {
    const iconShift = this.leadingIcon ? 12 : 0;
    this.textLabel.position.set(this.buttonWidth / 2 + iconShift, this.buttonHeight / 2);
    this.textLabel.scale.set(1);
    const maximumLabelWidth = Math.max(20, this.buttonWidth - (this.leadingIcon ? 48 : 18));
    if (this.textLabel.width > maximumLabelWidth) {
      this.textLabel.scale.set(maximumLabelWidth / this.textLabel.width);
    }
  }

  private readonly handlePress = (): void => {
    if (this.enabled) this.onPress();
  };

  private draw(): void {
    const compact = this.buttonHeight < 50;
    const radius = compact ? 14 : 20;
    this.background.clear()
      .roundRect(0, 0, this.buttonWidth, this.buttonHeight, radius)
      .fill({ color: this.hovered && this.enabled ? 0x4d6ed8 : this.color })
      .stroke({ color: 0xb8c7ff, alpha: compact ? 0.22 : 0.4, width: compact ? 1 : 1.5 });

    this.icon.clear();
    if (this.leadingIcon === 'play') {
      const x = this.buttonWidth / 2 - this.textLabel.width / 2 - 18;
      const y = this.buttonHeight / 2;
      this.icon.moveTo(x - 5, y - 7).lineTo(x - 5, y + 7).lineTo(x + 8, y)
        .closePath().fill({ color: 0xffffff });
    }

    this.badge.clear();
    if (this.badgeVisible) {
      this.badge.circle(this.buttonWidth - 8, 8, 6).fill({ color: 0xff4fd6 });
    }
  }
}
