export type GameMode = 'song' | 'survival';

export function getGameModeLabel(mode: GameMode): string {
  return mode === 'song' ? 'Cancion' : 'Supervivencia';
}
