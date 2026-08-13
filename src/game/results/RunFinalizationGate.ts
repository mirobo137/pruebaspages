export class RunFinalizationGate {
  private claimed = false;

  claim(): boolean {
    if (this.claimed) return false;
    this.claimed = true;
    return true;
  }

  get finalized(): boolean {
    return this.claimed;
  }
}
