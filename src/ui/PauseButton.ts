import { Container, Graphics, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';

export class PauseButton extends Container {
  private readonly background = new Graphics();
  private readonly icon = new Graphics();

  constructor(private readonly onPress: () => void) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(-4, -4, 48, 48);
    this.on('pointertap', this.handlePress);
    this.on('pointerover', () => this.draw(0.9));
    this.on('pointerout', () => this.draw(0.68));
    this.addChild(this.background, this.icon);
    this.draw(0.68);
  }

  private readonly handlePress = (event: FederatedPointerEvent): void => {
    event.stopPropagation();
    this.onPress();
  };

  private draw(alpha: number): void {
    this.background.clear().circle(20, 20, 20).fill({
      color: 0x121a32,
      alpha,
    });
    this.background.circle(20, 20, 20).stroke({
      color: 0xb8c7ff,
      alpha: 0.38,
      width: 2,
    });
    this.icon.clear();
    this.icon.roundRect(13, 11, 5, 18, 2).fill({ color: 0xe7edff, alpha: 0.9 });
    this.icon.roundRect(22, 11, 5, 18, 2).fill({ color: 0xe7edff, alpha: 0.9 });
  }
}
