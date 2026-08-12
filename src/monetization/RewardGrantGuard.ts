export interface RewardGrantLedger {
  tryClaim(rewardKey: string): boolean | Promise<boolean>;
}

export class MemoryRewardGrantLedger implements RewardGrantLedger {
  private readonly grantedKeys = new Set<string>();

  tryClaim(rewardKey: string): boolean {
    if (this.grantedKeys.has(rewardKey)) return false;
    this.grantedKeys.add(rewardKey);
    return true;
  }
}

export class RewardGrantGuard {
  private readonly pendingKeys = new Set<string>();

  constructor(private readonly ledger: RewardGrantLedger) {}

  async grantOnce(
    rewardKey: string,
    grant: () => void | Promise<void>,
  ): Promise<boolean> {
    if (!isSafeRewardKey(rewardKey) || this.pendingKeys.has(rewardKey)) return false;
    this.pendingKeys.add(rewardKey);
    try {
      if (!await this.ledger.tryClaim(rewardKey)) return false;
      await grant();
      return true;
    } finally {
      this.pendingKeys.delete(rewardKey);
    }
  }
}

function isSafeRewardKey(value: string): boolean {
  return value.length > 0 && value.length <= 160 && /^[a-zA-Z0-9:_-]+$/.test(value);
}
