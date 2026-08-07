import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { TrackSelection } from '../content/TrackSelection';
import type { Scene } from '../core/scene/Scene';
import type { GameMode } from '../game/modes/GameMode';
import { ProgressionStore } from '../progression/ProgressionStore';
import { MenuButton } from '../ui/MenuButton';

export interface MenuSceneOptions {
  tracks: TrackSelection[];
  progression: ProgressionStore;
  onStart: (mode: GameMode, selection: TrackSelection) => void;
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
    text: 'Siente el beat. Toca a tiempo. Mantén el combo.',
    style: subtitleStyle,
  });
  private readonly currency = new Text({ text: '', style: infoStyle });
  private readonly songInfo = new Text({ text: '', style: infoStyle });
  private readonly status = new Text({ text: '', style: subtitleStyle });
  private readonly previousTrackButton: MenuButton;
  private readonly nextTrackButton: MenuButton;
  private readonly songButton: MenuButton;
  private readonly survivalButton: MenuButton;
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
    this.songButton = new MenuButton('Cancion', this.handleSongPress, 0x3958b8);
    this.survivalButton = new MenuButton(
      'Supervivencia',
      this.handleSurvivalPress,
      0x7847aa,
    );

    this.root.addChild(
      this.background,
      this.title,
      this.subtitle,
      this.currency,
      this.songInfo,
      this.previousTrackButton,
      this.nextTrackButton,
      this.songButton,
      this.survivalButton,
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
    this.title.position.set(width / 2, Math.max(72, height * 0.14));
    this.subtitle.anchor.set(0.5);
    this.subtitle.position.set(width / 2, this.title.y + 48);
    this.currency.anchor.set(1, 0);
    this.currency.position.set(width - 20, 18);
    this.songInfo.anchor.set(0.5);
    this.songInfo.position.set(width / 2, height * 0.31);

    this.songButton.resize(buttonWidth);
    this.survivalButton.resize(buttonWidth);
    this.songButton.position.set((width - buttonWidth) / 2, height * 0.43);
    this.survivalButton.position.set((width - buttonWidth) / 2, height * 0.43 + 82);
    this.previousTrackButton.resize(56);
    this.nextTrackButton.resize(56);
    this.previousTrackButton.position.set(
      Math.max(12, (width - buttonWidth) / 2 - 68),
      height * 0.31 - 32,
    );
    this.nextTrackButton.position.set(
      Math.min(width - 68, (width + buttonWidth) / 2 + 12),
      height * 0.31 - 32,
    );

    this.status.anchor.set(0.5);
    this.status.position.set(width / 2, Math.min(height - 36, height * 0.86));
  }

  unmount(): void {}

  private readonly handleSongPress = (): void => {
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
        ? 'Cancion desbloqueada.'
        : 'Necesitas mas monedas para desbloquearla.';
      this.refresh();
      return;
    }

    this.onStart('song', selection);
  };

  private readonly handleSurvivalPress = (): void => {
    const selection = this.tracks[this.selectedTrackIndex];
    if (selection) this.onStart('survival', selection);
  };

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
      : 'Agrega un MP3 en public/assets/audio/';
    this.songButton.setText(!selection
      ? 'Sin canciones'
      : isUnlocked
        ? 'Jugar cancion'
        : 'Desbloquear (' + cost + ' monedas)');
    this.songButton.setEnabled(Boolean(selection));
    this.survivalButton.setText('Supervivencia');
    this.survivalButton.setEnabled(Boolean(selection && isUnlocked));
    this.previousTrackButton.setEnabled(this.tracks.length > 1);
    this.nextTrackButton.setEnabled(this.tracks.length > 1);
  }
}
