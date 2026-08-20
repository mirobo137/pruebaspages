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
import { DIFFICULTIES, getDifficultyLabel } from '../game/difficulty/Difficulty';
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
  fill: '#f4f7ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 28,
  fontWeight: '900',
  letterSpacing: 3,
});

const subtitleStyle = new TextStyle({
  fill: '#8ea2c9',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  fontWeight: '700',
});

const sectionStyle = new TextStyle({
  fill: '#d5def6',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 1.8,
});

const infoStyle = new TextStyle({
  fill: '#e7eeff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  fontWeight: '800',
  align: 'center',
});

function formatTrackDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  easy: '6 vidas · ritmo accesible',
  medium: '4 vidas · arrastres',
  hard: '3 vidas · alta densidad',
};

export class MenuScene implements Scene {
  readonly id = 'menu';
  readonly root = new Container();

  private readonly atmosphere = new Graphics();
  private readonly nebula = new Graphics();
  private readonly actionDock = new Graphics();
  private readonly currencyChip = new Graphics();
  private readonly title = new Text({ text: 'SUPERFLOW', style: titleStyle });
  private readonly subtitle = new Text({
    text: 'Toca una pista para oír 5s',
    style: subtitleStyle,
  });
  private readonly currency = new Text({ text: '', style: infoStyle });
  private readonly songSection = new Text({ text: 'TU MÚSICA', style: sectionStyle });
  private readonly difficultySection = new Text({ text: 'ELIGE DIFICULTAD', style: sectionStyle });
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
  private selectedTrackIndex = -1;
  private hasTrackSelection = false;
  private selectedTier: SongPriceTier = 'free';
  private readonly selectedTrackByTier: Partial<Record<SongPriceTier, number>> = {};
  private visibleTrackIndexes: number[] = [];
  private selectedDifficulty: Difficulty = 'medium';
  private previewTrackIndex: number | null = null;
  private previewElapsed = 0;
  private elapsed = 0;
  private width: number;
  private height: number;

  constructor(width: number, height: number, options: MenuSceneOptions) {
    this.width = width;
    this.height = height;
    this.tracks = options.tracks;
    this.progression = options.progression;
    this.visualTheme = options.visualTheme;
    this.onPreview = options.onPreview;
    this.onStopPreview = options.onStopPreview;
    this.onStart = options.onStart;
    const preferences = this.progression.menuPreferences;
    this.selectedDifficulty = preferences.difficulty;
    const rememberedIndex = this.tracks.findIndex(
      (selection) => selection.track.id === preferences.selectedTrackId,
    );
    this.selectedTrackIndex = rememberedIndex >= 0 ? rememberedIndex : -1;
    this.hasTrackSelection = this.selectedTrackIndex >= 0;
    const rememberedTrack = this.tracks[this.selectedTrackIndex];
    this.selectedTier = rememberedTrack
      ? rememberedTrack.track.priceTier
      : 'free';
    if (this.hasTrackSelection) this.selectedTrackByTier[this.selectedTier] = this.selectedTrackIndex;
    this.tierSelector = new SongTierSelector(this.handleTierChanged);
    this.songList = new SongList(this.handleSongSelected);
    this.difficultySelector = new DifficultySelector(this.handleDifficultyChanged);
    this.playButton = new MenuButton('JUGAR', this.handlePlay, 0x2f7dff);
    this.collectionButton = new MenuButton(
      'SKIN',
      () => {
        this.onStopPreview();
        options.onOpenCollection();
      },
      0x1a2744,
      42,
    );
    this.eventButton = new MenuButton(
      'EVENTO',
      () => {
        this.onStopPreview();
        options.onOpenEvent();
      },
      options.eventRewardPending ? 0x1f7a5c : 0x173e39,
      42,
    );
    this.dailyButton = new MenuButton(
      'DIARIO',
      () => {
        this.onStopPreview();
        options.onOpenDailyRoulette();
      },
      options.dailyRewardPending ? 0x6a4dba : 0x2b2554,
      42,
    );
    this.eventButton.setBadge(options.eventRewardPending);
    this.dailyButton.setBadge(options.dailyRewardPending);
    this.nebula.eventMode = 'none';
    this.nebula.blendMode = 'add';
    this.currencyChip.eventMode = 'none';

    this.root.addChild(
      this.atmosphere,
      this.nebula,
      this.actionDock,
      this.currencyChip,
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
    this.elapsed += deltaSeconds;
    const previewing = this.previewTrackIndex !== null;
    this.nebula.alpha = (previewing ? 0.55 : 0.28) + Math.sin(this.elapsed * 1.5) * 0.1;
    this.songList.update(deltaSeconds);
    this.progressPanel.update(deltaSeconds);

    if (this.previewTrackIndex === null) return;
    this.previewElapsed += deltaSeconds;
    const progress = Math.min(1, this.previewElapsed / MENU_TRACK_PREVIEW_SECONDS);
    this.songList.setPreview(this.getVisibleIndex(this.previewTrackIndex), progress);
    if (progress < 1) return;

    this.previewTrackIndex = null;
    this.songList.setPreview(null);
    this.status.text = '';
    this.refreshInstruction();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const layout = calculateMenuLayout(width, height, this.hasTrackSelection);
    this.atmosphere.clear().rect(0, 0, width, height).fill({
      color: this.visualTheme.background.backdrop,
    });
    this.nebula.clear()
      .circle(width * 0.12, height * 0.1, Math.max(width, height) * 0.26)
      .fill({ color: this.visualTheme.background.phasePrimary[0], alpha: 0.16 })
      .circle(width * 0.92, height * 0.72, Math.max(width, height) * 0.3)
      .fill({ color: this.visualTheme.background.phaseSecondary[1], alpha: 0.12 });

    this.title.style.fontSize = width < 350 ? 22 : layout.compact ? 24 : 28;
    this.subtitle.style.fontSize = width < 350 ? 11 : 12;
    this.currency.style.fontSize = width < 350 ? 10 : 12;
    this.collectionButton.resize(layout.actionWidth);
    this.eventButton.resize(layout.actionWidth);
    this.dailyButton.resize(layout.actionWidth);
    const actionGap = 7;
    const dockWidth = layout.actionWidth * 3 + actionGap * 2 + 8;
    this.actionDock.clear()
      .roundRect(10, layout.actionsY - 4, dockWidth, 50, 18)
      .fill({ color: 0x071021, alpha: 0.58 })
      .stroke({ color: this.visualTheme.background.phasePrimary[0], alpha: 0.18, width: 1 });
    this.difficultyHint.visible = layout.showDetails && this.hasTrackSelection;
    this.progressPanel.visible = layout.showDetails && this.hasTrackSelection;
    this.difficultySelector.visible = this.hasTrackSelection;
    this.playButton.visible = this.hasTrackSelection;

    if (layout.landscape) {
      this.title.anchor.set(0.5, 0);
      this.title.position.set(width / 2, layout.titleY);
      this.subtitle.anchor.set(0.5, 0);
      this.subtitle.position.set(width / 2, layout.subtitleY);
      this.subtitle.visible = layout.showSubtitle;
      this.currency.anchor.set(1, 0.5);
      this.currency.position.set(width - 22, 34);
      this.drawCurrencyChip(width - 22, 34);
      this.collectionButton.position.set(14, 13);
      this.eventButton.position.set(14 + layout.actionWidth + 7, 13);
      this.dailyButton.position.set(14 + (layout.actionWidth + 7) * 2, 13);
      this.resizeLandscape(width, height, layout);
      return;
    }

    const alignLeft = !layout.compact;
    this.title.anchor.set(alignLeft ? 0 : 0.5, 0);
    this.title.position.set(alignLeft ? layout.contentX : width / 2, layout.titleY - 6);
    this.subtitle.anchor.set(alignLeft ? 0 : 0.5, 0);
    this.subtitle.position.set(alignLeft ? layout.contentX : width / 2, layout.subtitleY - 4);
    this.subtitle.visible = layout.showSubtitle;
    this.collectionButton.position.set(14, layout.actionsY);
    this.eventButton.position.set(14 + layout.actionWidth + actionGap, layout.actionsY);
    this.dailyButton.position.set(14 + (layout.actionWidth + actionGap) * 2, layout.actionsY);
    this.currency.anchor.set(1, 0.5);
    this.currency.position.set(width - 18, layout.actionsY + 21);
    this.drawCurrencyChip(width - 18, layout.actionsY + 21);

    this.songSection.position.set(layout.contentX + 4, layout.categoryTop - 16);
    this.tierSelector.position.set(layout.contentX, layout.categoryTop);
    this.tierSelector.resize(layout.contentWidth);
    this.songList.position.set(layout.contentX, layout.listTop);
    this.songList.resize(layout.contentWidth, layout.listHeight);

    this.difficultySection.visible = layout.showDetails && this.hasTrackSelection;
    this.difficultySection.position.set(layout.contentX + 4, layout.difficultyTop);
    this.difficultySelector.position.set(
      layout.contentX,
      layout.difficultyTop + (layout.showDetails ? 22 : 0),
    );
    this.difficultySelector.resize(layout.contentWidth);
    this.difficultyHint.anchor.set(0.5, 0);
    this.difficultyHint.position.set(width / 2, layout.difficultyTop + 78);

    this.progressPanel.position.set(layout.contentX, layout.difficultyTop + 100);
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
    this.hasTrackSelection = true;
    this.selectedTrackByTier[this.selectedTier] = globalIndex;
    this.previewTrackIndex = globalIndex;
    this.previewElapsed = 0;
    this.status.text = '';
    this.persistMenuPreferences();
    this.refresh();
    this.resize(this.width, this.height);
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
      : -1;
    this.hasTrackSelection = this.selectedTrackIndex >= 0;
    if (this.selectedTrackIndex >= 0) {
      this.selectedTrackByTier[tier] = this.selectedTrackIndex;
      this.persistMenuPreferences();
    }
    this.status.text = '';
    this.refresh();
    this.resize(this.width, this.height);
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
      this.resize(this.width, this.height);
      return;
    }

    this.onStart(this.selectedDifficulty, selection);
  };

  private refresh(): void {
    this.currency.text = `${this.progression.coins.toLocaleString()} MON`;
    const tier = getSongTierDefinition(this.selectedTier);
    this.visibleTrackIndexes = this.getTrackIndexesForTier(this.selectedTier);
    this.songSection.text = this.hasTrackSelection
      ? `${tier.label.toUpperCase()}  ·  ${this.visibleTrackIndexes.length}`
      : `TU MÚSICA  ·  ${tier.label.toUpperCase()}`;
    this.songList.setEmptyMessage(
      `Aún no hay canciones ${tier.label.toLowerCase()}.\nLas nuevas pistas aparecerán aquí.`,
    );
    const accent = this.visualTheme.background.phasePrimary[0];
    const secondary = this.visualTheme.background.phaseSecondary[1];
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
      const duration = selection.beatmaps[this.selectedDifficulty]?.duration ?? 0;
      const details = [
        selection.track.bpm ? `${selection.track.bpm} BPM` : null,
        duration > 0 ? formatTrackDuration(duration) : null,
      ].filter((value): value is string => Boolean(value));
      return {
        title: selection.track.title,
        subtitle: unlocked
          ? (details.join('  ·  ') || 'LISTA PARA JUGAR')
          : `${this.progression.getTrackUnlockCost(selection.track.price)} MONEDAS`,
        locked: !unlocked,
        stars: record?.stars ?? 0,
        trackId: selection.track.id,
        accent,
        secondary,
      };
    }));
    this.songList.setSelectedIndex(this.getVisibleIndex(this.selectedTrackIndex));
    this.songList.setPreview(
      this.getVisibleIndex(this.previewTrackIndex),
      this.previewElapsed / MENU_TRACK_PREVIEW_SECONDS,
    );
    this.refreshInstruction();
    this.refreshDetails();
  }

  private refreshInstruction(): void {
    this.subtitle.text = this.hasTrackSelection
      ? 'Elige dificultad y pulsa JUGAR'
      : 'Toca una pista para oír 5s';
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
    this.difficultySection.text = `ELIGE DIFICULTAD  ·  ${getDifficultyLabel(
      this.selectedDifficulty,
    ).toUpperCase()}`;
    this.difficultyHint.text = DIFFICULTY_HINTS[this.selectedDifficulty];
    this.difficultySelector.setProgress(Object.fromEntries(
      DIFFICULTIES.map((difficulty) => {
        const progress = selection
          ? this.progression.getRecord(selection.track.id, difficulty)
          : null;
        return [difficulty, progress
          ? { stars: progress.stars, highScore: progress.highScore }
          : undefined];
      }),
    ));
    this.progressPanel.setTrackInfo(
      selection?.track.title ?? 'SIN CANCION',
      selection?.track.bpm,
      selection?.track.id ?? '',
      this.visualTheme.background.phasePrimary[0],
      this.visualTheme.background.phaseSecondary[1],
    );
    this.progressPanel.setProgress(this.selectedDifficulty, record);
    this.playButton.setText(!selection
      ? 'SIN CANCIONES'
      : unlocked
        ? 'JUGAR'
        : `DESBLOQUEAR · ${cost}`);
    this.playButton.setLeadingIcon(unlocked ? 'play' : null);
    this.playButton.setEnabled(Boolean(selection));
  }

  private drawCurrencyChip(right: number, centerY: number): void {
    const labelWidth = Math.max(72, this.currency.width + 22);
    this.currencyChip.clear()
      .roundRect(right - labelWidth, centerY - 14, labelWidth, 28, 14)
      .fill({ color: 0x10182c, alpha: 0.82 })
      .stroke({ color: 0xffd76a, alpha: 0.35, width: 1 });
    this.currencyChip.circle(right - labelWidth + 12, centerY, 4)
      .fill({ color: 0xffd76a, alpha: 0.95 });
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
    this.difficultySection.visible = this.hasTrackSelection;
    this.difficultySelector.visible = this.hasTrackSelection;
    this.difficultyHint.visible = this.hasTrackSelection;
    this.progressPanel.visible = this.hasTrackSelection;
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
