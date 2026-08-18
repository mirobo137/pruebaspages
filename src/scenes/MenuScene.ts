import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { TrackSelection } from '../content/TrackSelection';
import type { VisualTheme } from '../customization/ThemeTypes';
import { MENU_TRACK_PREVIEW_SECONDS } from '../content/MenuMusic';
import {
  getSongTierDefinition,
  type SongPriceTier,
} from '../content/SongEconomy';
import type { Scene } from '../core/scene/Scene';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { getDifficultyLabel } from '../game/difficulty/Difficulty';
import { ProgressionStore } from '../progression/ProgressionStore';
import { DifficultySelector } from '../ui/DifficultySelector';
import { MenuButton } from '../ui/MenuButton';
import { SongList } from '../ui/SongList';
import { SongTierSelector } from '../ui/SongTierSelector';
import { TrackProgressPanel } from '../ui/TrackProgressPanel';
import { calculateMenuLayout } from './MenuLayout';

export interface MenuSceneOptions {
  tracks: TrackSelection[];
  progression: ProgressionStore;
  visualTheme: VisualTheme;
  onOpenCollection: () => void;
  onOpenEvent: () => void;
  onOpenDailyRoulette: () => void;
  eventRewardPending: boolean;
  dailyRewardPending: boolean;
  onPreview: (selection: TrackSelection) => void;
  onStopPreview: () => void;
  onStart: (difficulty: Difficulty, selection: TrackSelection) => void;
}

const titleStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 30,
  fontWeight: '900',
  letterSpacing: 2,
  align: 'center',
});

const subtitleStyle = new TextStyle({
  fill: '#9eabc9',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  align: 'center',
});

const sectionStyle = new TextStyle({
  fill: '#d9e1fa',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  fontWeight: '900',
  letterSpacing: 2,
});

const infoStyle = new TextStyle({
  fill: '#dfe6ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  fontWeight: '700',
  align: 'center',
});

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  easy: 'Ritmo accesible · 6 vidas',
  medium: 'Subdivisiones y arrastres · 4 vidas',
  hard: 'Alta densidad y precisión · 3 vidas',
};

export class MenuScene implements Scene {
  readonly id = 'menu';
  readonly root = new Container();

  private readonly background = new Graphics();
  private readonly title = new Text({ text: 'SUPERFLOW', style: titleStyle });
  private readonly subtitle = new Text({
    text: 'TU PLAYLIST · Toca una pista para escuchar 5 segundos.',
    style: subtitleStyle,
  });
  private readonly currency = new Text({ text: '', style: infoStyle });
  private readonly songSection = new Text({ text: 'PLAYLIST', style: sectionStyle });
  private readonly difficultySection = new Text({ text: '', style: sectionStyle });
  private readonly difficultyHint = new Text({ text: '', style: subtitleStyle });
  private readonly status = new Text({ text: '', style: subtitleStyle });
  private readonly songList: SongList;
  private readonly tierSelector: SongTierSelector;
  private readonly difficultySelector: DifficultySelector;
  private readonly progressPanel = new TrackProgressPanel();
  private readonly playButton: MenuButton;
  private readonly collectionButton: MenuButton;
  private readonly eventButton: MenuButton;
  private readonly dailyButton: MenuButton;
  private readonly tracks: TrackSelection[];
  private readonly progression: ProgressionStore;
  private readonly visualTheme: VisualTheme;
  private readonly onPreview: MenuSceneOptions['onPreview'];
  private readonly onStopPreview: MenuSceneOptions['onStopPreview'];
  private readonly onStart: MenuSceneOptions['onStart'];
  private selectedTrackIndex = 0;
  private selectedTier: SongPriceTier = 'free';
  private readonly selectedTrackByTier: Partial<Record<SongPriceTier, number>> = {};
  private visibleTrackIndexes: number[] = [];
  private selectedDifficulty: Difficulty = 'medium';
  private previewTrackIndex: number | null = null;
  private previewElapsed = 0;
  private width: number;
  private height: number;

  constructor(width: number, height: number, options: MenuSceneOptions) {
    this.width = width;
    this.height = height;
    this.tracks = options.tracks;
    this.progression = options.progression;
    this.visualTheme = options.visualTheme;
    this.subtitle.text = `TEMA ${this.visualTheme.name.toUpperCase()} - Toca una pista para escuchar 5 segundos.`;
    this.onPreview = options.onPreview;
    this.onStopPreview = options.onStopPreview;
    this.onStart = options.onStart;
    const preferences = this.progression.menuPreferences;
    this.selectedDifficulty = preferences.difficulty;
    const rememberedIndex = this.tracks.findIndex(
      (selection) => selection.track.id === preferences.selectedTrackId,
    );
    this.selectedTrackIndex = rememberedIndex >= 0 ? rememberedIndex : 0;
    const rememberedTrack = this.tracks[this.selectedTrackIndex];
    this.selectedTier = rememberedTrack
      ? rememberedTrack.track.priceTier
      : 'free';
    this.selectedTrackByTier[this.selectedTier] = this.selectedTrackIndex;
    this.tierSelector = new SongTierSelector(this.handleTierChanged);
    this.songList = new SongList(this.handleSongSelected);
    this.difficultySelector = new DifficultySelector(this.handleDifficultyChanged);
    this.playButton = new MenuButton('JUGAR', this.handlePlay, 0x3155a5);
    this.collectionButton = new MenuButton(
      'SKIN',
      () => {
        this.onStopPreview();
        options.onOpenCollection();
      },
      0x17233e,
      42,
    );
    this.eventButton = new MenuButton(
      options.eventRewardPending ? 'EVENTO !' : 'EVENTO',
      () => {
        this.onStopPreview();
        options.onOpenEvent();
      },
      options.eventRewardPending ? 0x297a58 : 0x173e39,
      42,
    );
    this.dailyButton = new MenuButton(
      options.dailyRewardPending ? 'DIARIO !' : 'DIARIO',
      () => {
        this.onStopPreview();
        options.onOpenDailyRoulette();
      },
      options.dailyRewardPending ? 0x6a4dba : 0x2b2554,
      42,
    );

    this.root.addChild(
      this.background,
      this.collectionButton,
      this.eventButton,
      this.dailyButton,
      this.title,
      this.subtitle,
      this.currency,
      this.songSection,
      this.tierSelector,
      this.songList,
      this.difficultySection,
      this.difficultySelector,
      this.difficultyHint,
      this.progressPanel,
      this.playButton,
      this.status,
    );
  }

  mount(): void {
    this.tierSelector.setSelected(this.selectedTier);
    this.difficultySelector.setSelected(this.selectedDifficulty);
    this.refresh();
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    if (this.previewTrackIndex === null) return;
    this.previewElapsed += deltaSeconds;
    const progress = Math.min(1, this.previewElapsed / MENU_TRACK_PREVIEW_SECONDS);
    this.songList.setPreview(this.getVisibleIndex(this.previewTrackIndex), progress);
    if (progress < 1) return;

    this.previewTrackIndex = null;
    this.songList.setPreview(null);
    this.status.text = '';
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const layout = calculateMenuLayout(width, height);

    this.background.clear().rect(0, 0, width, height).fill({
      color: this.visualTheme.background.backdrop,
    });
    this.background
      .circle(width * 0.08, height * 0.12, Math.max(width, height) * 0.22)
      .fill({ color: this.visualTheme.background.phasePrimary[0], alpha: 0.04 });
    this.background
      .circle(width * 0.94, height * 0.65, Math.max(width, height) * 0.25)
      .fill({ color: this.visualTheme.background.phaseSecondary[1], alpha: 0.028 });
    this.title.anchor.set(0.5);
    this.title.style.fontSize = width < 350 ? 25 : layout.compact ? 27 : 30;
    this.title.position.set(width / 2, layout.titleY);
    this.subtitle.anchor.set(0.5);
    this.subtitle.position.set(width / 2, layout.subtitleY);
    this.subtitle.visible = layout.showSubtitle;
    this.currency.anchor.set(1, 0);
    this.currency.style.fontSize = width < 350 ? 10 : 12;
    this.collectionButton.resize(layout.actionWidth);
    this.eventButton.resize(layout.actionWidth);
    this.difficultyHint.visible = layout.showDetails;
    this.progressPanel.visible = layout.showDetails;

    if (layout.landscape) {
      this.currency.position.set(width - 14, 14);
      this.collectionButton.position.set(14, 13);
      this.eventButton.position.set(14 + layout.actionWidth + 7, 13);
      this.dailyButton.position.set(14 + (layout.actionWidth + 7) * 2, 13);
      this.resizeLandscape(width, height, layout);
      return;
    }

    const actionGap = 7;
    this.collectionButton.position.set(14, layout.actionsY);
    this.eventButton.position.set(14 + layout.actionWidth + actionGap, layout.actionsY);
    this.dailyButton.position.set(14 + (layout.actionWidth + actionGap) * 2, layout.actionsY);
    this.currency.position.set(width - 14, layout.actionsY + 12);

    this.songSection.position.set(layout.contentX + 4, layout.categoryTop - 16);
    this.tierSelector.position.set(layout.contentX, layout.categoryTop);
    this.tierSelector.resize(layout.contentWidth);
    this.songList.position.set(layout.contentX, layout.listTop);
    this.songList.resize(layout.contentWidth, layout.listHeight);

    this.difficultySection.visible = layout.showDetails;
    this.difficultySection.position.set(layout.contentX + 4, layout.difficultyTop);
    this.difficultySelector.position.set(
      layout.contentX,
      layout.difficultyTop + (layout.showDetails ? 24 : 0),
    );
    this.difficultySelector.resize(layout.contentWidth);
    this.difficultyHint.anchor.set(0.5, 0);
    this.difficultyHint.position.set(width / 2, layout.difficultyTop + 81);

    this.progressPanel.position.set(layout.contentX, layout.difficultyTop + 103);
    this.progressPanel.resize(layout.contentWidth);
    this.playButton.resize(layout.contentWidth);
    this.playButton.position.set(layout.contentX, layout.playTop);
    this.status.anchor.set(0.5, 0);
    this.status.position.set(width / 2, Math.min(height - 17, layout.playTop + 68));
  }

  unmount(): void {}

  private readonly handleSongSelected = (index: number): void => {
    const globalIndex = this.visibleTrackIndexes[index];
    if (globalIndex === undefined) return;
    this.selectedTrackIndex = globalIndex;
    this.selectedTrackByTier[this.selectedTier] = globalIndex;
    this.previewTrackIndex = globalIndex;
    this.previewElapsed = 0;
    this.status.text = 'PREVIEW DE 5 SEGUNDOS';
    this.persistMenuPreferences();
    this.refresh();
    this.songList.setPreview(index, 0);
    const selection = this.tracks[globalIndex];
    if (selection) this.onPreview(selection);
  };

  private readonly handleTierChanged = (tier: SongPriceTier): void => {
    if (this.selectedTrackIndex >= 0) {
      this.selectedTrackByTier[this.selectedTier] = this.selectedTrackIndex;
    }
    this.selectedTier = tier;
    this.previewTrackIndex = null;
    this.previewElapsed = 0;
    this.onStopPreview();

    const available = this.getTrackIndexesForTier(tier);
    const remembered = this.selectedTrackByTier[tier];
    this.selectedTrackIndex = remembered !== undefined && available.includes(remembered)
      ? remembered
      : available[0] ?? -1;
    if (this.selectedTrackIndex >= 0) {
      this.selectedTrackByTier[tier] = this.selectedTrackIndex;
      this.persistMenuPreferences();
    }
    this.status.text = '';
    this.refresh();
  };

  private readonly handleDifficultyChanged = (difficulty: Difficulty): void => {
    this.selectedDifficulty = difficulty;
    this.status.text = '';
    this.persistMenuPreferences();
    this.refresh();
  };

  private readonly handlePlay = (): void => {
    this.previewTrackIndex = null;
    this.songList.setPreview(null);
    const selection = this.tracks[this.selectedTrackIndex];
    if (!selection) {
      this.status.text = 'Todavía no hay canciones disponibles.';
      return;
    }

    const unlocked = this.progression.isTrackUnlocked(
      selection.track.id,
      selection.track.price,
    );
    if (!unlocked) {
      this.onStopPreview();
      const unlockedNow = this.progression.tryUnlockTrack(
        selection.track.id,
        selection.track.price,
      );
      this.status.text = unlockedNow
        ? 'Canción desbloqueada. Pulsa JUGAR para comenzar.'
        : 'Necesitas más monedas para desbloquearla.';
      this.refresh();
      return;
    }

    this.onStart(this.selectedDifficulty, selection);
  };

  private refresh(): void {
    this.currency.text = `${this.progression.coins.toLocaleString()} MONEDAS`;
    const tier = getSongTierDefinition(this.selectedTier);
    this.visibleTrackIndexes = this.getTrackIndexesForTier(this.selectedTier);
    this.songSection.text = `${tier.label.toUpperCase()} · ${this.visibleTrackIndexes.length} CANCIONES`;
    this.songList.setEmptyMessage(
      `TODAVIA NO HAY CANCIONES ${tier.label.toUpperCase()}\nLAS NUEVAS PISTAS APARECERAN AQUI`,
    );
    this.songList.setItems(this.visibleTrackIndexes.map((trackIndex) => {
      const selection = this.tracks[trackIndex];
      const unlocked = this.progression.isTrackUnlocked(
        selection.track.id,
        selection.track.price,
      );
      const record = this.progression.getRecord(
        selection.track.id,
        this.selectedDifficulty,
      );
      return {
        title: selection.track.title,
        subtitle: unlocked
          ? '3 FASES · 90 SEGUNDOS'
          : `${this.progression.getTrackUnlockCost(selection.track.price)} MONEDAS`,
        locked: !unlocked,
        stars: record?.stars ?? 0,
        highScore: record?.highScore ?? 0,
        bestCombo: record?.bestCombo ?? 0,
        attempts: record?.attempts ?? 0,
      };
    }));
    this.songList.setSelectedIndex(this.getVisibleIndex(this.selectedTrackIndex) ?? 0);
    this.songList.setPreview(
      this.getVisibleIndex(this.previewTrackIndex),
      this.previewElapsed / MENU_TRACK_PREVIEW_SECONDS,
    );
    this.refreshDetails();
  }

  private persistMenuPreferences(): void {
    const trackId = this.tracks[this.selectedTrackIndex]?.track.id
      ?? this.progression.menuPreferences.selectedTrackId;
    this.progression.setMenuPreferences(trackId, this.selectedDifficulty);
  }

  private getTrackIndexesForTier(tier: SongPriceTier): number[] {
    const indexes: number[] = [];
    this.tracks.forEach((selection, index) => {
      if (selection.track.priceTier === tier) indexes.push(index);
    });
    return indexes;
  }

  private getVisibleIndex(globalIndex: number | null): number | null {
    if (globalIndex === null || globalIndex < 0) return null;
    const index = this.visibleTrackIndexes.indexOf(globalIndex);
    return index >= 0 ? index : null;
  }

  private refreshDetails(): void {
    const selection = this.tracks[this.selectedTrackIndex];
    const unlocked = selection
      ? this.progression.isTrackUnlocked(selection.track.id, selection.track.price)
      : false;
    const cost = selection
      ? this.progression.getTrackUnlockCost(selection.track.price)
      : 0;
    const record = selection
      ? this.progression.getRecord(selection.track.id, this.selectedDifficulty)
      : null;
    this.difficultySection.text = `DIFICULTAD · ${getDifficultyLabel(
      this.selectedDifficulty,
    ).toUpperCase()}`;
    this.difficultyHint.text = DIFFICULTY_HINTS[this.selectedDifficulty];
    this.progressPanel.setProgress(this.selectedDifficulty, record);
    this.playButton.setText(!selection
      ? 'SIN CANCIONES'
      : unlocked
        ? 'JUGAR'
        : `DESBLOQUEAR · ${cost}`);
    this.playButton.setEnabled(Boolean(selection));
  }

  private resizeLandscape(
    width: number,
    height: number,
    layout: ReturnType<typeof calculateMenuLayout>,
  ): void {
    const contentWidth = layout.contentWidth;
    const contentX = layout.contentX;
    const gap = 18;
    const leftWidth = contentWidth * 0.54;
    const rightWidth = contentWidth - leftWidth - gap;
    const top = layout.categoryTop;
    const listTop = layout.listTop;
    const listHeight = layout.listHeight;
    const rightX = contentX + leftWidth + gap;

    this.songSection.position.set(contentX + 4, top - 23);
    this.tierSelector.position.set(contentX, top);
    this.tierSelector.resize(leftWidth);
    this.songList.position.set(contentX, listTop);
    this.songList.resize(leftWidth, listHeight);

    this.difficultySection.position.set(rightX + 4, top - 23);
    this.difficultySection.visible = true;
    this.difficultySelector.position.set(rightX, top);
    this.difficultySelector.resize(rightWidth);
    this.difficultyHint.anchor.set(0.5, 0);
    this.difficultyHint.position.set(rightX + rightWidth / 2, top + 58);
    this.progressPanel.position.set(rightX, top + 80);
    this.progressPanel.resize(rightWidth);
    this.playButton.resize(rightWidth);
    this.playButton.position.set(rightX, layout.playTop);
    this.status.anchor.set(0.5, 0);
    this.status.position.set(rightX + rightWidth / 2, Math.min(height - 16, layout.playTop + 68));
  }
}
