import { Container, Text, TextStyle } from 'pixi.js';
import type { ScoreSnapshot } from '../game/score/ScoreModel';

const scoreStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 24,
  fontWeight: '700',
});

const comboStyle = new TextStyle({
  fill: '#a9b5d6',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  align: 'center',
});

export class GameHud extends Container {
  private readonly scoreText = new Text({ text: 'Puntos: 0', style: scoreStyle });
  private readonly comboText = new Text({ text: 'Toca una estrella para empezar', style: comboStyle });

  constructor() {
    super();
    this.addChild(this.scoreText, this.comboText);
  }

  update(snapshot: ScoreSnapshot): void {
    this.scoreText.text = `Puntos: ${snapshot.score}`;
    this.comboText.text = snapshot.combo > 1
      ? `Combo x${snapshot.combo}`
      : 'Toca una estrella para empezar';
  }

  resize(width: number): void {
    this.scoreText.position.set(20, 20);
    this.comboText.anchor.set(0.5, 0);
    this.comboText.position.set(width / 2, 62);
  }
}

