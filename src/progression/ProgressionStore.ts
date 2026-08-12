import type { Difficulty } from '../game/difficulty/Difficulty';
import type { FlowSnapshot } from '../game/flow/FlowModel';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { LocalProgressStorage } from '../platform/LocalProgressStorage';
import { DEFAULT_THEME_ID, listVisualThemes } from '../customization/ThemeCatalog';
import {
  composeCustomTheme,
  CUSTOM_THEME_ID,
  sanitizeCustomThemeSelection,
  type CustomThemeSelection,
} from '../customization/ThemeComponents';
import { getVisualTheme } from '../customization/ThemeCatalog';
import type { VisualTheme } from '../customization/ThemeTypes';
import { getAutomaticallyUnlockedThemeIds } from '../customization/ThemeCollection';
import type {
  EventClaimResult,
  EventRunInput,
  WeeklyEventCampaign,
  WeeklyEventSnapshot,
} from '../events/EventTypes';
import {
  claimWeeklyEventReward,
  evaluateWeeklyEventRun,
  getWeeklyEventSnapshot,
} from '../events/WeeklyEventEngine';
import type {
  PerformanceRecord,
  MenuPreferences,
  ProgressState,
  RecordedRun,
} from './ProgressionTypes';
import { calculateStarRating, calculateWeightedAccuracy } from './StarRating';
import { calculateCoinReward } from './Economy';

export class ProgressionStore {
  private readonly storage: LocalProgressStorage;
  private state: ProgressState;

  constructor(storage: LocalProgressStorage = new LocalProgressStorage()) {
    this.storage = storage;
    this.state = this.storage.load();
    if (this.syncCustomization()) this.save();
  }

  get coins(): number {
    return this.state.coins;
  }

  get totalRuns(): number {
    return this.state.totalRuns;
  }

  get menuPreferences(): MenuPreferences {
    return { ...this.state.menuPreferences };
  }

  get unlockedThemeIds(): readonly string[] {
    return [...this.state.customization.unlockedThemeIds];
  }

  get unlockedCosmeticIds(): readonly string[] {
    return [...this.state.customization.unlockedCosmeticIds];
  }

  get equippedThemeId(): string {
    return this.state.customization.equippedThemeId;
  }

  get customThemeSelection(): CustomThemeSelection {
    return { ...this.state.customization.customTheme.componentThemeIds };
  }

  get equippedVisualTheme(): VisualTheme {
    return this.equippedThemeId === CUSTOM_THEME_ID
      ? composeCustomTheme(this.customThemeSelection)
      : getVisualTheme(this.equippedThemeId);
  }

  isThemeUnlocked(themeId: string): boolean {
    return themeId === CUSTOM_THEME_ID
      || this.state.customization.unlockedThemeIds.includes(themeId);
  }

  equipTheme(themeId: string): boolean {
    if (!this.isThemeUnlocked(themeId)) return false;
    if (
      themeId !== CUSTOM_THEME_ID
      && !listVisualThemes().some((theme) => theme.id === themeId)
    ) return false;
    if (this.state.customization.equippedThemeId === themeId) return true;
    this.state.customization.equippedThemeId = themeId;
    this.save();
    return true;
  }

  saveCustomTheme(selection: CustomThemeSelection, equip = true): VisualTheme {
    const sanitized = sanitizeCustomThemeSelection(
      selection,
      this.state.customization.unlockedThemeIds,
      this.state.customization.unlockedCosmeticIds,
    );
    this.state.customization.customTheme = {
      slotId: CUSTOM_THEME_ID,
      componentThemeIds: sanitized,
    };
    if (equip) this.state.customization.equippedThemeId = CUSTOM_THEME_ID;
    this.save();
    return composeCustomTheme(sanitized);
  }

  setMenuPreferences(selectedTrackId: string | null, difficulty: Difficulty): void {
    const current = this.state.menuPreferences;
    if (
      current.selectedTrackId === selectedTrackId
      && current.difficulty === difficulty
    ) return;

    this.state.menuPreferences = { selectedTrackId, difficulty };
    this.save();
  }

  isTrackUnlocked(trackId: string, price: number): boolean {
    return price <= 0
      || this.state.unlockedTrackIds.includes(trackId);
  }

  getTrackUnlockCost(price: number): number {
    return Math.max(0, Math.floor(price));
  }

  tryUnlockTrack(trackId: string, price: number): boolean {
    if (this.isTrackUnlocked(trackId, price)) return true;

    const cost = this.getTrackUnlockCost(price);
    if (this.state.coins < cost) return false;

    this.state.coins -= cost;
    this.state.unlockedTrackIds.push(trackId);
    this.save();
    return true;
  }

  getRecord(trackId: string, difficulty: Difficulty): PerformanceRecord | null {
    return this.state.records[trackId]?.[difficulty] ?? null;
  }

  recordRun(
    trackId: string,
    difficulty: Difficulty,
    snapshot: ScoreSnapshot,
    flow: FlowSnapshot,
    completed: boolean,
  ): RecordedRun {
    const rewardCoins = calculateCoinReward(snapshot, difficulty, completed);
    const earnedStars = calculateStarRating(snapshot, completed);
    const accuracy = calculateWeightedAccuracy(snapshot);
    const previous = this.getRecord(trackId, difficulty);
    const previousStars = previous?.stars ?? 0;
    const isNewHighScore = snapshot.score > (previous?.highScore ?? 0);
    const record: PerformanceRecord = {
      stars: Math.max(previousStars, earnedStars),
      highScore: Math.max(previous?.highScore ?? 0, snapshot.score),
      bestCombo: Math.max(previous?.bestCombo ?? 0, snapshot.bestCombo),
      bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy),
      bestPerfects: Math.max(previous?.bestPerfects ?? 0, snapshot.perfects),
      fewestMisses: previous
        ? Math.min(previous.fewestMisses, snapshot.misses)
        : snapshot.misses,
      attempts: (previous?.attempts ?? 0) + 1,
      completions: (previous?.completions ?? 0) + (earnedStars > 0 ? 1 : 0),
      bestFlowActivations: Math.max(
        previous?.bestFlowActivations ?? 0,
        flow.activations,
      ),
      bestSuperFlowActivations: Math.max(
        previous?.bestSuperFlowActivations ?? 0,
        flow.superActivations,
      ),
      lastPlayedAt: Date.now(),
    };

    this.state.records[trackId] ??= {};
    this.state.records[trackId][difficulty] = record;
    this.state.totalRuns += 1;
    this.state.coins += rewardCoins;
    this.syncCustomization();
    this.save();

    return {
      rewardCoins,
      earnedStars,
      previousStars,
      isNewHighScore,
      record,
    };
  }

  recordWeeklyEventRun(
    catalog: readonly WeeklyEventCampaign[],
    input: EventRunInput,
    date: Date = new Date(),
  ): WeeklyEventSnapshot {
    const snapshot = evaluateWeeklyEventRun(
      catalog,
      this.state.weeklyEvent,
      input,
      date,
    );
    if (snapshot.changed) {
      this.state.weeklyEvent = snapshot.progress;
      this.save();
    }
    return snapshot;
  }

  getWeeklyEvent(
    catalog: readonly WeeklyEventCampaign[],
    date: Date = new Date(),
  ): WeeklyEventSnapshot {
    return getWeeklyEventSnapshot(catalog, this.state.weeklyEvent, date);
  }

  claimWeeklyEventReward(
    catalog: readonly WeeklyEventCampaign[],
    rewardId: string,
    date: Date = new Date(),
  ): EventClaimResult {
    const snapshot = this.getWeeklyEvent(catalog, date);
    const result = claimWeeklyEventReward(
      catalog,
      this.state.weeklyEvent,
      rewardId,
      date,
    );
    if (result.claimed) {
      this.state.weeklyEvent = result.progress;
      const campaign = snapshot.activeEvent?.campaign;
      if (campaign && result.reward) {
        const cosmeticId = `${campaign.themeId}:${result.reward.id}`;
        if (!this.state.customization.unlockedCosmeticIds.includes(cosmeticId)) {
          this.state.customization.unlockedCosmeticIds.push(cosmeticId);
        }
        if (
          result.reward.cosmeticSlot === 'complete-theme'
          && !this.state.customization.unlockedThemeIds.includes(campaign.themeId)
        ) {
          this.state.customization.unlockedThemeIds.push(campaign.themeId);
        }
      }
      this.syncCustomization();
      this.save();
    }
    return result;
  }

  private save(): void {
    this.storage.save(this.state);
  }

  private syncCustomization(): boolean {
    const validThemeIds = new Set(listVisualThemes().map((theme) => theme.id));
    const unlockedThemeIds = [...new Set([
      ...this.state.customization.unlockedThemeIds,
      ...getAutomaticallyUnlockedThemeIds(this.state.totalRuns),
      DEFAULT_THEME_ID,
    ])].filter((themeId) => validThemeIds.has(themeId));
    const currentUnlocked = this.state.customization.unlockedThemeIds;
    const unlocksChanged = unlockedThemeIds.length !== currentUnlocked.length
      || unlockedThemeIds.some((themeId, index) => themeId !== currentUnlocked[index]);
    const sanitizedCustomTheme = sanitizeCustomThemeSelection(
      this.state.customization.customTheme.componentThemeIds,
      unlockedThemeIds,
      this.state.customization.unlockedCosmeticIds,
    );
    const customChanged = JSON.stringify(sanitizedCustomTheme)
      !== JSON.stringify(this.state.customization.customTheme.componentThemeIds);
    const equippedIsValid = this.state.customization.equippedThemeId === CUSTOM_THEME_ID
      || (validThemeIds.has(this.state.customization.equippedThemeId)
        && unlockedThemeIds.includes(this.state.customization.equippedThemeId));
    const equippedThemeId = equippedIsValid
      ? this.state.customization.equippedThemeId
      : DEFAULT_THEME_ID;
    const equippedChanged = equippedThemeId !== this.state.customization.equippedThemeId;

    if (!unlocksChanged && !equippedChanged && !customChanged) return false;
    this.state.customization = {
      unlockedThemeIds,
      unlockedCosmeticIds: this.state.customization.unlockedCosmeticIds,
      equippedThemeId,
      customTheme: {
        slotId: CUSTOM_THEME_ID,
        componentThemeIds: sanitizedCustomTheme,
      },
    };
    return true;
  }
}
