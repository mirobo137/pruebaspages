import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';

const buttonTextStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 18,
  fontWeight: '700',
  align: 'center',
});

export class MenuButton extends Container {
  private readonly background = new Graphics();
  private readonly textLabel = new Text({ text: '', style: buttonTextStyle });
  private buttonWidth: number;
  private buttonHeight: number;
  private enabled = true;
  private hovered = false;
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
    this.textLabel.anchor.set(0.5);
    this.addChild(this.background, this.textLabel);
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
    this.textLabel.position.set(this.buttonWidth / 2, this.buttonHeight / 2);
    this.fitLabel();
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
    this.textLabel.position.set(this.buttonWidth / 2, this.buttonHeight / 2);
    this.fitLabel();
    this.draw();
  }

  private fitLabel(): void {
    this.textLabel.scale.set(1);
    const maximumLabelWidth = Math.max(20, this.buttonWidth - 18);
    if (this.textLabel.width > maximumLabelWidth) {
      this.textLabel.scale.set(maximumLabelWidth / this.textLabel.width);
    }
  }

  private readonly handlePress = (): void => {
    if (this.enabled) this.onPress();
  };

  private draw(): void {
    this.background.clear();
    this.background.roundRect(0, 0, this.buttonWidth, this.buttonHeight, 16).fill({
      color: this.hovered && this.enabled ? 0x4d6ed8 : this.color,
    });
    this.background.roundRect(0, 0, this.buttonWidth, this.buttonHeight, 16).stroke({
      color: 0xb8c7ff,
      alpha: 0.25,
      width: 2,
    });
  }
}
