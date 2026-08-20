import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { getDifficultyLabel } from '../game/difficulty/Difficulty';
import type { PerformanceRecord } from '../progression/ProgressionTypes';
import { formatStars } from '../progression/StarRating';
import { TrackCoverArt } from './TrackCoverArt';

const headerStyle = new TextStyle({
  fill: '#8fb4ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 10,
  fontWeight: '900',
  letterSpacing: 1.4,
});

const starStyle = new TextStyle({
  fill: '#ffd76a',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 18,
  fontWeight: '900',
  letterSpacing: 1.4,
});

const trackTitleStyle = new TextStyle({
  fill: '#f1f5ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  fontWeight: '900',
  letterSpacing: 0.4,
});

const metricLabelStyle = new TextStyle({
  fill: '#7181aa',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 8,
  fontWeight: '900',
  letterSpacing: 0.7,
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
  private readonly cover = new TrackCoverArt();
  private readonly trackTitle = new Text({ text: 'SIN CANCION', style: trackTitleStyle });
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
  private trackName = 'SIN CANCION';
  private trackId = '';
  private trackBpm: number | undefined;
  private accent = 0x62efff;
  private secondary = 0xff5bd8;

  constructor() {
    super();
    this.eventMode = 'none';
    this.cover.setSize(58);
    this.stars.anchor.set(1, 0.5);
    for (const text of [...this.metricLabels, ...this.metricValues]) text.anchor.set(0.5);
    this.addChild(
      this.background,
      this.cover,
      this.trackTitle,
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

  setTrackInfo(
    title: string,
    bpm?: number,
    trackId = '',
    accent = 0x62efff,
    secondary = 0xff5bd8,
  ): void {
    this.trackName = title || 'SIN CANCION';
    this.trackBpm = bpm;
    this.trackId = trackId;
    this.accent = accent;
    this.secondary = secondary;
    this.cover.setTrack(trackId || 'empty', accent, secondary);
    this.refresh();
    this.draw();
  }

  update(deltaSeconds: number): void {
    this.cover.update(deltaSeconds);
  }

  resize(width: number): void {
    this.panelWidth = width;
    this.draw();
    this.refresh();
  }

  private refresh(): void {
    this.trackTitle.text = this.trackName.toUpperCase();
    this.header.text = `${getDifficultyLabel(this.difficulty).toUpperCase()}${
      this.trackBpm ? `  ·  ${this.trackBpm} BPM` : ''
    }`;
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
      .roundRect(0, 0, this.panelWidth, this.panelHeight, 20)
      .fill({ color: 0x0b1224, alpha: 0.78 })
      .stroke({ color: 0x6af0ff, alpha: 0.22, width: 1 });

    this.cover.position.set(12, 10);
    this.header.position.set(82, 14);
    this.trackTitle.position.set(82, 30);
    this.trackTitle.scale.set(1);
    const titleLimit = Math.max(90, this.panelWidth - 168);
    if (this.trackTitle.width > titleLimit) {
      this.trackTitle.scale.set(titleLimit / this.trackTitle.width);
    }
    this.stars.position.set(this.panelWidth - 16, 24);

    const metricsLeft = 10;
    const metricsWidth = this.panelWidth - 20;
    const columnWidth = metricsWidth / this.metricLabels.length;
    this.metricLabels.forEach((text, index) => {
      const x = metricsLeft + columnWidth * index + columnWidth / 2;
      text.position.set(x, 64);
      this.metricValues[index].position.set(x, 84);
      if (index > 0) {
        this.background
          .moveTo(metricsLeft + columnWidth * index, 68)
          .lineTo(metricsLeft + columnWidth * index, 94)
          .stroke({ color: 0x7181aa, alpha: 0.12, width: 1 });
      }
    });
  }
}
