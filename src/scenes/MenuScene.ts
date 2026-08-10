import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { TrackSelection } from '../content/TrackSelection';
import type { Scene } from '../core/scene/Scene';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { getDifficultyLabel } from '../game/difficulty/Difficulty';
import { ProgressionStore } from '../progression/ProgressionStore';
import { DifficultySelector } from '../ui/DifficultySelector';
import { MenuButton } from '../ui/MenuButton';
import { SongList } from '../ui/SongList';

export interface MenuSceneOptions {
  tracks: TrackSelection[];
  progression: ProgressionStore;
  onStart: (difficulty: Difficulty, selection: TrackSelection) => void;
}

const titleStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 32,
  fontWeight: '900',
  letterSpacing: 1,
  align: 'center',
});

const subtitleStyle = new TextStyle({
  fill: '#9eabc9',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  align: 'center',
});

const sectionStyle = new TextStyle({
  fill: '#d9e1fa',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '900',
  letterSpacing: 2,
});

const infoStyle = new TextStyle({
  fill: '#dfe6ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  align: 'center',
});

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  easy: 'Ritmo accesible · 6 vidas',
  medium: 'Subdivisiones y arrastres · 4 vidas',
  hard: 'Alta densidad y precision · 3 vidas',
};

export class MenuScene implements Scene {
  readonly id = 'menu';
  readonly root = new Container();

  private readonly background = new Graphics();
  private readonly title = new Text({ text: 'RHYTHM CIRCLES', style: titleStyle });
  private readonly subtitle = new Text({
    text: 'Elige una pista. Domina sus tres fases.',
    style: subtitleStyle,
  });
  private readonly currency = new Text({ text: '', style: infoStyle });
  private readonly songSection = new Text({ text: 'CANCIONES', style: sectionStyle });
  private readonly difficultySection = new Text({ text: '', style: sectionStyle });
  private readonly difficultyHint = new Text({ text: '', style: subtitleStyle });
  private readonly status = new Text({ text: '', style: subtitleStyle });
  private readonly songList: SongList;
  private readonly difficultySelector: DifficultySelector;
  private readonly playButton: MenuButton;
  private readonly tracks: TrackSelection[];
  private readonly progression: ProgressionStore;
  private readonly onStart: MenuSceneOptions['onStart'];
  private selectedTrackIndex = 0;
  private selectedDifficulty: Difficulty = 'medium';
  private width: number;
  private height: number;

  constructor(width: number, height: number, options: MenuSceneOptions) {
    this.width = width;
    this.height = height;
    this.tracks = options.tracks;
    this.progression = options.progression;
    this.onStart = options.onStart;
    this.songList = new SongList(this.handleSongSelected);
    this.difficultySelector = new DifficultySelector(this.handleDifficultyChanged);
    this.playButton = new MenuButton('JUGAR', this.handlePlay, 0x3958b8);

    this.root.addChild(
      this.background,
      this.title,
      this.subtitle,
      this.currency,
      this.songSection,
      this.songList,
      this.difficultySection,
      this.difficultySelector,
      this.difficultyHint,
      this.playButton,
      this.status,
    );
  }

  mount(): void {
    this.difficultySelector.setSelected(this.selectedDifficulty);
    this.refresh();
    this.resize(this.width, this.height);
  }

  update(): void {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const contentWidth = Math.min(500, Math.max(250, width - 32));
    const contentX = (width - contentWidth) / 2;
    const titleY = Math.max(48, height * 0.075);
    const listTop = Math.max(132, height * 0.18);
    const listHeight = Math.max(150, Math.min(290, height * 0.34));

    this.background.clear().rect(0, 0, width, height).fill({ color: 0x0b1022 });
    this.title.anchor.set(0.5);
    this.title.position.set(width / 2, titleY);
    this.subtitle.anchor.set(0.5);
    this.subtitle.position.set(width / 2, titleY + 42);
    this.currency.anchor.set(1, 0);
    this.currency.position.set(width - 16, 16);

    this.songSection.position.set(contentX + 4, listTop - 27);
    this.songList.position.set(contentX, listTop);
    this.songList.resize(contentWidth, listHeight);

    const difficultyTop = listTop + listHeight + 21;
    this.difficultySection.position.set(contentX + 4, difficultyTop);
    this.difficultySelector.position.set(contentX, difficultyTop + 28);
    this.difficultySelector.resize(contentWidth);
    this.difficultyHint.anchor.set(0.5, 0);
    this.difficultyHint.position.set(width / 2, difficultyTop + 87);

    this.playButton.resize(contentWidth);
    this.playButton.position.set(contentX, difficultyTop + 116);
    this.status.anchor.set(0.5, 0);
    this.status.position.set(width / 2, Math.min(height - 25, difficultyTop + 190));
  }

  unmount(): void {}

  private readonly handleSongSelected = (index: number): void => {
    this.selectedTrackIndex = index;
    this.status.text = '';
    this.refresh();
  };

  private readonly handleDifficultyChanged = (difficulty: Difficulty): void => {
    this.selectedDifficulty = difficulty;
    this.status.text = '';
    this.refreshDetails();
  };

  private readonly handlePlay = (): void => {
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
        ? 'Cancion desbloqueada. Pulsa JUGAR para comenzar.'
        : 'Necesitas mas monedas para desbloquearla.';
      this.refresh();
      return;
    }

    this.onStart(this.selectedDifficulty, selection);
  };

  private refresh(): void {
    this.currency.text = 'Monedas: ' + this.progression.coins;
    this.songList.setItems(this.tracks.map((selection, index) => {
      const unlocked = this.progression.isTrackUnlocked(selection.track.id, index);
      return {
        title: selection.track.title,
        subtitle: unlocked
          ? '3 fases · 90 segundos'
          : this.progression.getTrackUnlockCost(index) + ' monedas',
        locked: !unlocked,
      };
    }));
    this.songList.setSelectedIndex(this.selectedTrackIndex);
    this.refreshDetails();
  }

  private refreshDetails(): void {
    const selection = this.tracks[this.selectedTrackIndex];
    const unlocked = selection
      ? this.progression.isTrackUnlocked(selection.track.id, this.selectedTrackIndex)
      : false;
    const cost = selection
      ? this.progression.getTrackUnlockCost(this.selectedTrackIndex)
      : 0;
    this.difficultySection.text = 'DIFICULTAD · '
      + getDifficultyLabel(this.selectedDifficulty).toUpperCase();
    this.difficultyHint.text = DIFFICULTY_HINTS[this.selectedDifficulty];
    this.playButton.setText(!selection
      ? 'SIN CANCIONES'
      : unlocked
        ? 'JUGAR'
        : 'DESBLOQUEAR · ' + cost);
    this.playButton.setEnabled(Boolean(selection));
  }
}
