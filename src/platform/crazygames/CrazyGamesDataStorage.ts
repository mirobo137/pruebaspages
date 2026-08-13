import type { ProgressStorageAdapter } from '../LocalProgressStorage';
import type { CrazyGamesDataModule } from './CrazyGamesTypes';

/**
 * Adaptador listo para la futura activacion del modulo Data. No debe utilizarse
 * hasta habilitar "Progress Save" en el portal y ejecutar la migracion una vez.
 */
export class CrazyGamesDataStorage implements ProgressStorageAdapter {
  constructor(private readonly data: CrazyGamesDataModule) {}

  getItem(key: string): string | null {
    return this.data.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.data.setItem(key, value);
  }
}

export function migrateLocalKeysToCrazyGamesData(
  local: Pick<Storage, 'getItem'>,
  data: CrazyGamesDataModule,
  keys: readonly string[],
): number {
  let migrated = 0;
  for (const key of [...new Set(keys)]) {
    if (data.getItem(key) !== null) continue;
    const value = local.getItem(key);
    if (value === null) continue;
    data.setItem(key, value);
    migrated += 1;
  }
  return migrated;
}

