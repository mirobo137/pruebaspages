import type { BeatEvent, Beatmap } from '../../content/Beatmap';

export class BeatmapPlayer {
  private nextEventIndex = 0;
  private previousTime = 0;

  constructor(
    private readonly beatmap: Beatmap,
    private readonly loop = false,
  ) {}

  collectUpcomingEvents(currentTime: number, lookAhead: number): BeatEvent[] {
    if (this.beatmap.events.length === 0 || this.beatmap.duration <= 0) return [];

    if (!this.loop && currentTime >= this.beatmap.duration) return [];

    const localTime = currentTime % this.beatmap.duration;
    if (localTime < this.previousTime) this.nextEventIndex = 0;

    const dueEvents: BeatEvent[] = [];
    const targetTime = localTime + lookAhead;
    const firstCycleEnd = Math.min(targetTime, this.beatmap.duration);
    const currentCycle = this.loop
      ? Math.floor(currentTime / this.beatmap.duration)
      : 0;

    while (
      this.nextEventIndex < this.beatmap.events.length
      && this.beatmap.events[this.nextEventIndex].time <= firstCycleEnd
    ) {
      dueEvents.push(this.withAbsoluteTime(
        this.beatmap.events[this.nextEventIndex],
        currentCycle,
      ));
      this.nextEventIndex += 1;
    }

    if (this.loop && targetTime >= this.beatmap.duration) {
      this.nextEventIndex = 0;
      const wrappedTime = targetTime - this.beatmap.duration;

      while (
        this.nextEventIndex < this.beatmap.events.length
        && this.beatmap.events[this.nextEventIndex].time <= wrappedTime
      ) {
        dueEvents.push(this.withAbsoluteTime(
          this.beatmap.events[this.nextEventIndex],
          currentCycle + 1,
        ));
        this.nextEventIndex += 1;
      }
    }

    this.previousTime = localTime;
    return dueEvents;
  }

  private withAbsoluteTime(event: BeatEvent, cycle: number): BeatEvent {
    return {
      ...event,
      time: event.time + cycle * this.beatmap.duration,
    };
  }
}
