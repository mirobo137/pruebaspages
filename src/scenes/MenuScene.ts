import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { TrackSelection } from '../content/TrackSelection';
import type { Scene } from '../core/scene/Scene';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { getDifficultyLabel } from '../game/difficulty/Difficulty';
import { ProgressionStore } from '../progression/ProgressionStore';
import { MenuButton } from '../ui/MenuButton';

export interface MenuSceneOptions {
  tracks: TrackSelection[];
  progression: ProgressionStore;
  onStart: (difficulty: Difficulty, selection: TrackSelection) => void;
}

const titleStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 34,
  fontWeight: '800',
  align: 'center',
});

const subtitleStyle = new TextStyle({
  fill: '#a9b5d6',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  align: 'center',
});

const infoStyle = new TextStyle({
  fill: '#dfe6ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  align: 'center',
});

export class MenuScene implements Scene {
  readonly id = 'menu';
  readonly root = new Container();

  private readonly background = new Graphics();
  private readonly title = new Text({ text: 'RHYTHM CIRCLES', style: titleStyle });
  private readonly subtitle = new Text({
    text: 'Elige una cancion y domina sus tres fases.',
    style: subtitleStyle,
  });
  private readonly currency = new Text({ text: '', style: infoStyle });
  private readonly songInfo = new Text({ text: '', style: infoStyle });
  private readonly difficultyInfo = new Text({
    text: 'Selecciona dificultad',
    style: subtitleStyle,
  });
  private readonly status = new Text({ text: '', style: subtitleStyle });
  private readonly previousTrackButton: MenuButton;
  private readonly nextTrackButton: MenuButton;
  private readonly difficultyButtons: Record<Difficulty, MenuButton>;
  private readonly tracks: TrackSelection[];
  private readonly progression: ProgressionStore;
  private readonly onStart: MenuSceneOptions['onStart'];
  private selectedTrackIndex = 0;
  private width: number;
  private height: number;

  constructor(width: number, height: number, options: MenuSceneOptions) {
    this.width = width;
    this.height = height;
    this.tracks = options.tracks;
    this.progression = options.progression;
    this.onStart = options.onStart;
    this.previousTrackButton = new MenuButton('<', this.handlePreviousTrack, 0x26366f);
    this.nextTrackButton = new MenuButton('>', this.handleNextTrack, 0x26366f);
    this.difficultyButtons = {
      easy: new MenuButton('Facil', () => this.handleDifficultyPress('easy'), 0x287a62),
      medium: new MenuButton('Medio', () => this.handleDifficultyPress('medium'), 0x3958b8),
      hard: new MenuButton('Dificil', () => this.handleDifficultyPress('hard'), 0x9f3e61),
    };

    this.root.addChild(
      this.background,
      this.title,
      this.subtitle,
      this.currency,
      this.songInfo,
      this.difficultyInfo,
      this.previousTrackButton,
      this.nextTrackButton,
      this.difficultyButtons.easy,
      this.difficultyButtons.medium,
      this.difficultyButtons.hard,
      this.status,
    );
  }

  mount(): void {
    this.refresh();
    this.resize(this.width, this.height);
  }

  update(): void {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const buttonWidth = Math.min(360, Math.max(220, width - 40));

    this.background.clear().rect(0, 0, width, height).fill({ color: 0x0b1022 });
    this.title.anchor.set(0.5);
    this.title.position.set(width / 2, Math.max(68, height * 0.12));
    this.subtitle.anchor.set(0.5);
    this.subtitle.position.set(width / 2, this.title.y + 46);
    this.currency.anchor.set(1, 0);
    this.currency.position.set(width - 20, 18);
    this.songInfo.anchor.set(0.5);
    this.songInfo.position.set(width / 2, height * 0.29);
    this.difficultyInfo.anchor.set(0.5);
    this.difficultyInfo.position.set(width / 2, height * 0.37);

    const firstButtonY = height * 0.43;
    const buttonGap = Math.min(72, Math.max(62, height * 0.09));
    (['easy', 'medium', 'hard'] as Difficulty[]).forEach((difficulty, index) => {
      const button = this.difficultyButtons[difficulty];
      button.resize(buttonWidth);
      button.position.set((width - buttonWidth) / 2, firstButtonY + index * buttonGap);
    });

    this.previousTrackButton.resize(56);
    this.nextTrackButton.resize(56);
    this.previousTrackButton.position.set(
      Math.max(12, (width - buttonWidth) / 2 - 68),
      height * 0.29 - 32,
    );
    this.nextTrackButton.position.set(
      Math.min(width - 68, (width + buttonWidth) / 2 + 12),
      height * 0.29 - 32,
    );

    this.status.anchor.set(0.5);
    this.status.position.set(width / 2, Math.min(height - 28, height * 0.88));
  }

  unmount(): void {}

  private handleDifficultyPress(difficulty: Difficulty): void {
    const selection = this.tracks[this.selectedTrackIndex];
    if (!selection) {
      this.status.text = 'Todavia no hay canciones disponibles.';
      return;
    }

    const unlocked = this.progression.isTrackUnlocked(
      selection.track.id,
      this.selectedTrackIndex,
    );
    if (!unlocked) {
      const unlockedNow = this.progression.tryUnlockTrack(
        selection.track.id,
        this.selectedTrackIndex,
      );
      this.status.text = unlockedNow
        ? 'Cancion desbloqueada. Ahora elige dificultad.'
        : 'Necesitas mas monedas para desbloquearla.';
      this.refresh();
      return;
    }

    this.onStart(difficulty, selection);
  }

  private readonly handlePreviousTrack = (): void => {
    if (this.tracks.length === 0) return;
    this.selectedTrackIndex = (this.selectedTrackIndex - 1 + this.tracks.length)
      % this.tracks.length;
    this.status.text = '';
    this.refresh();
  };

  private readonly handleNextTrack = (): void => {
    if (this.tracks.length === 0) return;
    this.selectedTrackIndex = (this.selectedTrackIndex + 1) % this.tracks.length;
    this.status.text = '';
    this.refresh();
  };

  private refresh(): void {
    const selection = this.tracks[this.selectedTrackIndex];
    const isUnlocked = selection
      ? this.progression.isTrackUnlocked(selection.track.id, this.selectedTrackIndex)
      : false;
    const cost = selection
      ? this.progression.getTrackUnlockCost(this.selectedTrackIndex)
      : 0;
    const title = selection?.track.title ?? 'Sin canciones';
    this.currency.text = 'Monedas: ' + this.progression.coins;
    this.songInfo.text = selection
      ? 'Cancion ' + (this.selectedTrackIndex + 1) + '/' + this.tracks.length + ': ' + title
      : 'Agrega un MP3 y sus tres beatmaps.';
    this.difficultyInfo.text = isUnlocked
      ? 'Tres fases · 90 segundos'
      : 'Desbloquea esta cancion por ' + cost + ' monedas';

    (['easy', 'medium', 'hard'] as Difficulty[]).forEach((difficulty) => {
      const button = this.difficultyButtons[difficulty];
      button.setText(isUnlocked
        ? getDifficultyLabel(difficulty)
        : difficulty === 'easy'
          ? 'Desbloquear (' + cost + ' monedas)'
          : getDifficultyLabel(difficulty));
      button.setEnabled(Boolean(selection && (isUnlocked || difficulty === 'easy')));
    });

    this.previousTrackButton.setEnabled(this.tracks.length > 1);
    this.nextTrackButton.setEnabled(this.tracks.length > 1);
  }
}
