import type { PokiSdk } from '../platform/poki/PokiTypes';
import type { TelemetryRecord, TelemetrySink } from './TelemetryTypes';

export class PokiTelemetrySink implements TelemetrySink {
  constructor(private readonly sdk: PokiSdk) {}

  track({ event }: TelemetryRecord): void {
    switch (event.type) {
      case 'song_started':
        this.measure('song', `${event.trackId}-${event.difficulty}`, 'start');
        break;
      case 'song_finished':
        this.measure(
          'song',
          `${event.trackId}-${event.difficulty}`,
          event.completed ? 'complete' : 'fail',
        );
        break;
      case 'weekly_event_visible':
        this.measure('button', 'weekly-event', 'visible');
        break;
      case 'weekly_event_opened':
        this.measure('button', 'weekly-event', 'interact');
        break;
      case 'weekly_reward_claimed':
        this.measure('weekly-event', event.rewardId, event.completed ? 'complete' : 'claimed');
        break;
      case 'daily_roulette_visible':
        this.measure('button', 'daily-roulette', 'visible');
        break;
      case 'daily_roulette_opened':
        this.measure('button', 'daily-roulette', 'interact');
        break;
      case 'daily_roulette_claimed':
        this.measure('daily-roulette', event.rewardKind, event.duplicate ? 'duplicate' : 'claimed');
        break;
      case 'rewarded_offer_visible':
        this.measure('rewarded', event.placement, 'visible');
        break;
      case 'rewarded_offer_interacted':
        this.measure('rewarded', event.placement, 'interact');
        break;
      default:
        // Sesiones, retorno y resultados de anuncios ya los mide Poki.
        break;
    }
  }

  private measure(category: string, what: string, action: string): void {
    this.sdk.measure(
      sanitize(category),
      sanitize(what),
      sanitize(action),
    );
  }
}

function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 64);
}
