import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { getDifficultyLabel } from '../game/difficulty/Difficulty';
import type { PerformanceRecord } from '../progression/ProgressionTypes';
import { formatStars } from '../progression/StarRating';

const headerStyle = new TextStyle({
  fill: '#9fb0d8',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 10,
  fontWeight: '900',
  letterSpacing: 1.5,
});

const starStyle = new TextStyle({
  fill: '#ffd76a',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 23,
  fontWeight: '900',
  letterSpacing: 2,
});

const metricLabelStyle = new TextStyle({
  fill: '#7181aa',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 8,
  fontWeight: '900',
  letterSpacing: 0.8,
  align: 'center',
});

const metricValueStyle = new TextStyle({
  fill: '#eff5ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '800',
  align: 'center',
});

const METRIC_LABELS = ['MEJOR', 'COMBO', 'PRECISIÓN', 'INTENTOS'];

export class TrackProgressPanel extends Container {
  readonly panelHeight = 104;
  private readonly background = new Graphics();
  private readonly header = new Text({ text: '', style: headerStyle });
  private readonly stars = new Text({ text: '☆☆☆', style: starStyle });
  private readonly metricLabels = METRIC_LABELS.map((label) => new Text({
    text: label,
    style: metricLabelStyle,
  }));
  private readonly metricValues = METRIC_LABELS.map(() => new Text({
    text: '—',
    style: metricValueStyle,
  }));
  private panelWidth = 320;
  private difficulty: Difficulty = 'medium';
  private record: PerformanceRecord | null = null;

  constructor() {
    super();
    this.eventMode = 'none';
    this.stars.anchor.set(1, 0.5);
    for (const text of [...this.metricLabels, ...this.metricValues]) text.anchor.set(0.5);
    this.addChild(
      this.background,
      this.header,
      this.stars,
      ...this.metricLabels,
      ...this.metricValues,
    );
  }

  setProgress(difficulty: Difficulty, record: PerformanceRecord | null): void {
    this.difficulty = difficulty;
    this.record = record;
    this.refresh();
  }

  resize(width: number): void {
    this.panelWidth = width;
    this.draw();
    this.refresh();
  }

  private refresh(): void {
    this.header.text = `PROGRESO · ${getDifficultyLabel(this.difficulty).toUpperCase()}`;
    this.stars.text = formatStars(this.record?.stars ?? 0);
    this.stars.alpha = this.record?.stars ? 1 : 0.38;

    const values = this.record
      ? [
        this.record.highScore.toLocaleString(),
        `x${this.record.bestCombo}`,
        `${Math.round(this.record.bestAccuracy * 100)}%`,
        this.record.attempts.toString(),
      ]
      : ['—', '—', '—', '0'];
    this.metricValues.forEach((text, index) => {
      text.text = values[index];
      text.alpha = this.record ? 1 : 0.5;
    });
  }

  private draw(): void {
    this.background.clear()
      .roundRect(0, 0, this.panelWidth, this.panelHeight, 13)
      .fill({ color: 0x0c1429, alpha: 0.93 })
      .stroke({ color: 0x718cff, alpha: 0.28, width: 1 });
    this.background
      .moveTo(14, 0)
      .lineTo(this.panelWidth * 0.36, 0)
      .stroke({ color: 0x6af0ff, alpha: 0.75, width: 1.4 });
    this.background
      .moveTo(this.panelWidth * 0.72, this.panelHeight)
      .lineTo(this.panelWidth - 14, this.panelHeight)
      .stroke({ color: 0xff55d5, alpha: 0.52, width: 1.4 });
    this.background
      .moveTo(14, 42)
      .lineTo(this.panelWidth - 14, 42)
      .stroke({ color: 0x7788b8, alpha: 0.16, width: 1 });

    this.header.position.set(15, 15);
    this.stars.position.set(this.panelWidth - 14, 21);
    const columnWidth = this.panelWidth / this.metricLabels.length;
    this.metricLabels.forEach((text, index) => {
      const x = columnWidth * index + columnWidth / 2;
      text.position.set(x, 59);
      this.metricValues[index].position.set(x, 82);
      if (index > 0) {
        this.background
          .moveTo(columnWidth * index, 52)
          .lineTo(columnWidth * index, 91)
          .stroke({ color: 0x7181aa, alpha: 0.12, width: 1 });
      }
    });
  }
}
