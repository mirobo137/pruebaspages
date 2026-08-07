import type { BeatEvent, Beatmap } from '../../content/Beatmap';

export class BeatmapPlayer {
  private nextEventIndex = 0;
  private previousTime = 0;

  constructor(private readonly beatmap: Beatmap) {}

  collectDueEvents(currentTime: number): BeatEvent[] {
    if (this.beatmap.events.length === 0 || this.beatmap.duration <= 0) return [];

    const localTime = currentTime % this.beatmap.duration;
    if (localTime < this.previousTime) this.nextEventIndex = 0;

    const dueEvents: BeatEvent[] = [];
    while (
      this.nextEventIndex < this.beatmap.events.length
      && this.beatmap.events[this.nextEventIndex].time <= localTime
    ) {
      dueEvents.push(this.beatmap.events[this.nextEventIndex]);
      this.nextEventIndex += 1;
    }

    this.previousTime = localTime;
    return dueEvents;
  }
}

