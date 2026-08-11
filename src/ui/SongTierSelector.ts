import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import {
  SONG_PRICE_TIERS,
  type SongPriceTier,
} from '../content/SongEconomy';

const labelStyle = new TextStyle({
  fill: '#aab7d7',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '900',
  letterSpacing: 0.45,
  align: 'center',
});

const priceStyle = new TextStyle({
  fill: '#7282a8',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 8,
  fontWeight: '800',
  align: 'center',
});

export class SongTierSelector extends Container {
  readonly selectorHeight = 48;
  private readonly background = new Graphics();
  private readonly labels = SONG_PRICE_TIERS.map((tier) => new Text({
    text: tier.shortLabel,
    style: labelStyle,
  }));
  private readonly prices = SONG_PRICE_TIERS.map((tier) => new Text({
    text: tier.price === 0 ? 'INCLUIDAS' : `${tier.price} MON.`,
    style: priceStyle,
  }));
  private selected: SongPriceTier = 'free';
  private selectorWidth = 320;

  constructor(private readonly onChange: (tier: SongPriceTier) => void) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    for (const text of [...this.labels, ...this.prices]) text.anchor.set(0.5);
    this.addChild(this.background, ...this.labels, ...this.prices);
    this.on('pointertap', this.handleTap);
  }

  setSelected(tier: SongPriceTier): void {
    this.selected = tier;
    this.draw();
  }

  resize(width: number): void {
    this.selectorWidth = width;
    this.hitArea = new Rectangle(0, 0, width, this.selectorHeight);
    this.draw();
  }

  private readonly handleTap = (event: FederatedPointerEvent): void => {
    const local = this.toLocal(event.global);
    const segmentWidth = this.selectorWidth / SONG_PRICE_TIERS.length;
    const index = Math.max(
      0,
      Math.min(SONG_PRICE_TIERS.length - 1, Math.floor(local.x / segmentWidth)),
    );
    this.selected = SONG_PRICE_TIERS[index].id;
    this.onChange(this.selected);
    this.draw();
  };

  private draw(): void {
    const segmentWidth = this.selectorWidth / SONG_PRICE_TIERS.length;
    this.background.clear()
      .roundRect(0, 0, this.selectorWidth, this.selectorHeight, 12)
      .fill({ color: 0x0b1328, alpha: 0.95 })
      .stroke({ color: 0x718cff, alpha: 0.24, width: 1 });

    SONG_PRICE_TIERS.forEach((tier, index) => {
      const selected = tier.id === this.selected;
      const segmentX = index * segmentWidth;
      if (selected) {
        this.background
          .roundRect(segmentX + 3, 3, segmentWidth - 6, this.selectorHeight - 6, 9)
          .fill({ color: tier.color, alpha: 0.14 })
          .stroke({ color: tier.color, alpha: 0.72, width: 1 });
        this.background
          .moveTo(segmentX + 14, this.selectorHeight - 4)
          .lineTo(segmentX + segmentWidth - 14, this.selectorHeight - 4)
          .stroke({ color: tier.color, alpha: 0.9, width: 1.4 });
      } else if (index > 0) {
        this.background
          .moveTo(segmentX, 10)
          .lineTo(segmentX, this.selectorHeight - 10)
          .stroke({ color: 0x7181ad, alpha: 0.16, width: 1 });
      }

      const label = this.labels[index];
      label.position.set(segmentX + segmentWidth / 2, 16);
      label.style.fill = selected ? '#ffffff' : '#9ca9c8';
      label.scale.set(1);
      const labelLimit = Math.max(35, segmentWidth - 8);
      if (label.width > labelLimit) label.scale.set(labelLimit / label.width);

      const price = this.prices[index];
      price.position.set(segmentX + segmentWidth / 2, 33);
      price.style.fill = selected ? tier.color : '#65759b';
    });
  }
}
