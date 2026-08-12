import type { Difficulty } from '../game/difficulty/Difficulty';
import type { FlowSnapshot } from '../game/flow/FlowModel';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { LocalProgressStorage } from '../platform/LocalProgressStorage';
import { DEFAULT_THEME_ID, listVisualThemes } from '../customization/ThemeCatalog';
import { getAutomaticallyUnlockedThemeIds } from '../customization/ThemeCollection';
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

  get equippedThemeId(): string {
    return this.state.customization.equippedThemeId;
  }

  isThemeUnlocked(themeId: string): boolean {
    return this.state.customization.unlockedThemeIds.includes(themeId);
  }

  equipTheme(themeId: string): boolean {
    if (!this.isThemeUnlocked(themeId)) return false;
    if (!listVisualThemes().some((theme) => theme.id === themeId)) return false;
    if (this.state.customization.equippedThemeId === themeId) return true;
    this.state.customization.equippedThemeId = themeId;
    this.save();
    return true;
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
    const equippedIsValid = validThemeIds.has(this.state.customization.equippedThemeId)
      && unlockedThemeIds.includes(this.state.customization.equippedThemeId);
    const equippedThemeId = equippedIsValid
      ? this.state.customization.equippedThemeId
      : DEFAULT_THEME_ID;
    const equippedChanged = equippedThemeId !== this.state.customization.equippedThemeId;

    if (!unlocksChanged && !equippedChanged) return false;
    this.state.customization = { unlockedThemeIds, equippedThemeId };
    return true;
  }
}
