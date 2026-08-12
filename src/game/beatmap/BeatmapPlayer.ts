import type { BeatEvent, Beatmap } from '../../content/Beatmap';

export class BeatmapPlayer {
  private nextEventIndex = 0;

  constructor(private readonly beatmap: Beatmap) {}

  collectUpcomingEvents(currentTime: number, lookAhead: number): BeatEvent[] {
    if (this.beatmap.events.length === 0 || currentTime >= this.beatmap.duration) {
      return [];
    }

    const dueEvents: BeatEvent[] = [];
    const targetTime = currentTime + lookAhead;

    while (
      this.nextEventIndex < this.beatmap.events.length
      && this.beatmap.events[this.nextEventIndex].time <= targetTime
    ) {
      dueEvents.push(this.beatmap.events[this.nextEventIndex]);
      this.nextEventIndex += 1;
    }

    return dueEvents;
  }

  seek(time: number): void {
    const safeTime = Math.max(0, time);
    let low = 0;
    let high = this.beatmap.events.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.beatmap.events[middle].time < safeTime) low = middle + 1;
      else high = middle;
    }
    this.nextEventIndex = low;
  }
}
