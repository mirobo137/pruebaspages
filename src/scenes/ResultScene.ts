import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Scene } from '../core/scene/Scene';
import type { GameMode } from '../game/modes/GameMode';
import { getGameModeLabel } from '../game/modes/GameMode';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { MenuButton } from '../ui/MenuButton';

export interface ResultSceneOptions {
  mode: GameMode;
  snapshot: ScoreSnapshot;
  flowActivations: number;
  rewardCoins: number;
  onBackToMenu: () => void;
}

const resultTitleStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 32,
  fontWeight: '800',
  align: 'center',
});

const resultInfoStyle = new TextStyle({
  fill: '#dfe6ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 20,
  align: 'center',
});

export class ResultScene implements Scene {
  readonly id = 'result';
  readonly root = new Container();
  private readonly background = new Graphics();
  private readonly title = new Text({ text: 'PARTIDA TERMINADA', style: resultTitleStyle });
  private readonly info = new Text({ text: '', style: resultInfoStyle });
  private readonly backButton: MenuButton;
  private width: number;
  private height: number;
  private readonly options: ResultSceneOptions;

  constructor(width: number, height: number, options: ResultSceneOptions) {
    this.width = width;
    this.height = height;
    this.options = options;
    this.backButton = new MenuButton('Volver al menu', this.handleBack);
    this.root.addChild(this.background, this.title, this.info, this.backButton);
  }

  mount(): void {
    const snapshot = this.options.snapshot;
    this.info.text = [
      getGameModeLabel(this.options.mode),
      '',
      'Puntos: ' + snapshot.score,
      'Combo maximo: x' + snapshot.bestCombo,
      'Perfect: ' + snapshot.perfects + '   Bien: ' + snapshot.goods,
      'Fallos: ' + snapshot.misses,
      'FLOW activado: ' + this.options.flowActivations,
      '',
      '+' + this.options.rewardCoins + ' monedas',
    ].join('\n');
    this.resize(this.width, this.height);
  }

  update(): void {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.background.clear().rect(0, 0, width, height).fill({ color: 0x0b1022 });
    this.title.anchor.set(0.5);
    this.title.position.set(width / 2, Math.max(72, height * 0.16));
    this.info.anchor.set(0.5);
    this.info.position.set(width / 2, height * 0.45);

    const buttonWidth = Math.min(360, Math.max(220, width - 40));
    this.backButton.resize(buttonWidth);
    this.backButton.position.set((width - buttonWidth) / 2, height * 0.78);
  }

  unmount(): void {}

  private readonly handleBack = (): void => {
    this.options.onBackToMenu();
  };
}
