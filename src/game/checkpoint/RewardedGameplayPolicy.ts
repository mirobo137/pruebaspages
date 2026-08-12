import type { RewardedAdStatus } from '../../monetization/RewardTypes';

export class RewardedGameplayPolicy {
  private requestPending = false;
  private opportunityConsumed = false;
  private reviveGranted = false;
  private providerUnavailable = false;

  get pending(): boolean { return this.requestPending; }
  get consumed(): boolean { return this.opportunityConsumed; }
  get revived(): boolean { return this.reviveGranted; }
  get unavailable(): boolean { return this.providerUnavailable; }

  canOffer(providerAvailable: boolean): boolean {
    return providerAvailable
      && !this.requestPending
      && !this.opportunityConsumed
      && !this.reviveGranted
      && !this.providerUnavailable;
  }

  beginRequest(): boolean {
    if (this.requestPending || this.opportunityConsumed || this.reviveGranted) return false;
    this.requestPending = true;
    return true;
  }

  resolve(status: RewardedAdStatus): boolean {
    if (!this.requestPending) return false;
    this.requestPending = false;
    if (status === 'unavailable') {
      this.providerUnavailable = true;
      return false;
    }
    this.opportunityConsumed = true;
    if (status === 'rewarded') this.reviveGranted = true;
    return this.reviveGranted;
  }
}
