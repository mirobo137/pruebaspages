import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { DIFFICULTIES, getDifficultyLabel } from '../game/difficulty/Difficulty';
import { formatStars } from '../progression/StarRating';

const labelStyle = new TextStyle({
  fill: '#c7d1ed',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '800',
  align: 'center',
});

const summaryStyle = new TextStyle({
  fill: '#7586ad',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '800',
  align: 'center',
});

export interface DifficultyProgressSummary {
  stars: number;
  highScore: number;
}

const DIFFICULTY_COLORS: Record<Difficulty, { fill: number; stroke: number }> = {
  easy: { fill: 0x1d6b56, stroke: 0x61f0c2 },
  medium: { fill: 0x2f4ea8, stroke: 0x7eb0ff },
  hard: { fill: 0x8c3358, stroke: 0xff6f9f },
};

export class DifficultySelector extends Container {
  private readonly background = new Graphics();
  private readonly labels = DIFFICULTIES.map((difficulty) => new Text({
    text: getDifficultyLabel(difficulty),
    style: labelStyle,
  }));
  private readonly summaries = DIFFICULTIES.map(() => new Text({
    text: formatStars(0),
    style: summaryStyle,
  }));
  private selected: Difficulty = 'medium';
  private selectorWidth = 320;
  private progress: Partial<Record<Difficulty, DifficultyProgressSummary>> = {};
  private readonly selectorHeight = 52;

  constructor(private readonly onChange: (difficulty: Difficulty) => void) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.addChild(this.background, ...this.labels, ...this.summaries);
    this.on('pointertap', this.handleTap);
  }

  setSelected(difficulty: Difficulty): void {
    this.selected = difficulty;
    this.draw();
  }

  setProgress(progress: Partial<Record<Difficulty, DifficultyProgressSummary>>): void {
    this.progress = progress;
    this.draw();
  }

  resize(width: number): void {
    this.selectorWidth = width;
    this.hitArea = new Rectangle(0, 0, width, this.selectorHeight);
    this.draw();
  }

  private readonly handleTap = (event: FederatedPointerEvent): void => {
    const local = this.toLocal(event.global);
    const index = Math.max(
      0,
      Math.min(DIFFICULTIES.length - 1, Math.floor(local.x / (this.selectorWidth / 3))),
    );
    this.selected = DIFFICULTIES[index];
    this.onChange(this.selected);
    this.draw();
  };

  private draw(): void {
    const segmentWidth = this.selectorWidth / DIFFICULTIES.length;
    this.background.clear()
      .roundRect(0, 0, this.selectorWidth, this.selectorHeight, 18)
      .fill({ color: 0x0c1326, alpha: 0.55 });

    DIFFICULTIES.forEach((difficulty, index) => {
      const selected = difficulty === this.selected;
      const colors = DIFFICULTY_COLORS[difficulty];
      const x = index * segmentWidth + 4;
      const width = segmentWidth - 8;
      this.background
        .roundRect(x, 4, width, this.selectorHeight - 8, 14)
        .fill({
          color: selected ? colors.fill : 0x121a2f,
          alpha: selected ? 0.72 : 0.5,
        });
      if (selected) {
        this.background
          .roundRect(x, 4, width, this.selectorHeight - 8, 14)
          .stroke({ color: colors.stroke, alpha: 0.9, width: 1.4 });
      }

      const label = this.labels[index];
      label.anchor.set(0.5);
      label.position.set(index * segmentWidth + segmentWidth / 2, 18);
      label.style.fill = selected ? '#ffffff' : '#9aa6c6';

      const summary = this.summaries[index];
      const record = this.progress[difficulty];
      summary.text = record && record.highScore > 0
        ? `${formatStars(record.stars)}  ${record.highScore.toLocaleString()}`
        : formatStars(0);
      summary.anchor.set(0.5);
      summary.position.set(index * segmentWidth + segmentWidth / 2, 36);
      summary.style.fill = record?.stars
        ? selected ? '#ffe27f' : '#c2a85e'
        : selected ? '#c5d2ef' : '#66769e';
      summary.scale.set(1);
      const summaryLimit = Math.max(34, segmentWidth - 12);
      if (summary.width > summaryLimit) summary.scale.set(summaryLimit / summary.width);
    });
  }
}
