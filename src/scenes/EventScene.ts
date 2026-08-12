import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Scene } from '../core/scene/Scene';
import type { EventClaimResult, WeeklyEventSnapshot } from '../events/EventTypes';
import { EventMissionList } from '../ui/EventMissionList';
import { EventRewardTrack } from '../ui/EventRewardTrack';
import { MenuButton } from '../ui/MenuButton';

export interface EventSceneOptions {
  getSnapshot: () => WeeklyEventSnapshot;
  onClaim: (rewardId: string) => EventClaimResult;
  onBack: () => void;
}

const titleStyle = new TextStyle({
  fill: '#f4fff9', fontFamily: 'system-ui, sans-serif', fontSize: 28,
  fontWeight: '900', letterSpacing: 2, align: 'center',
});
const eyebrowStyle = new TextStyle({
  fill: '#71f5c7', fontFamily: 'system-ui, sans-serif', fontSize: 10,
  fontWeight: '900', letterSpacing: 2, align: 'center',
});
const infoStyle = new TextStyle({
  fill: '#bdcec9', fontFamily: 'system-ui, sans-serif', fontSize: 11,
  fontWeight: '800', align: 'center',
});
const sectionStyle = new TextStyle({
  fill: '#d9fff1', fontFamily: 'system-ui, sans-serif', fontSize: 10,
  fontWeight: '900', letterSpacing: 1.6,
});
const claimStyle = new TextStyle({
  fill: '#f5ffca', fontFamily: 'system-ui, sans-serif', fontSize: 19,
  fontWeight: '900', letterSpacing: 1.2, align: 'center',
});

export class EventScene implements Scene {
  readonly id = 'event';
  readonly root = new Container();

  private readonly background = new Graphics();
  private readonly glow = new Graphics();
  private readonly header = new Text({ text: 'EVENTO SEMANAL', style: eyebrowStyle });
  private readonly title = new Text({ text: 'NEON ASCENT', style: titleStyle });
  private readonly countdown = new Text({ text: '', style: infoStyle });
  private readonly points = new Text({ text: '', style: infoStyle });
  private readonly progressBar = new Graphics();
  private readonly missionsLabel = new Text({ text: 'MISIONES', style: sectionStyle });
  private readonly rewardsLabel = new Text({ text: 'RUTA DE RECOMPENSAS · DESLIZA', style: sectionStyle });
  private readonly emptyMessage = new Text({ text: '', style: infoStyle });
  private readonly missionList = new EventMissionList();
  private readonly rewardTrack = new EventRewardTrack();
  private readonly claimButton: MenuButton;
  private readonly backButton: MenuButton;
  private readonly celebration = new Container();
  private readonly celebrationFlash = new Graphics();
  private readonly celebrationRing = new Graphics();
  private readonly celebrationText = new Text({ text: '', style: claimStyle });
  private snapshot: WeeklyEventSnapshot;
  private width: number;
  private height: number;
  private lastSecond = -1;
  private celebrationTime = 0;

  constructor(width: number, height: number, private readonly options: EventSceneOptions) {
    this.width = width;
    this.height = height;
    this.snapshot = options.getSnapshot();
    this.backButton = new MenuButton('‹', options.onBack, 0x10282b, 44);
    this.claimButton = new MenuButton('SIGUE JUGANDO', this.handleClaim, 0x16795f, 56);
    this.celebration.eventMode = 'none';
    this.celebration.visible = false;
    this.celebrationText.anchor.set(0.5);
    this.celebration.addChild(
      this.celebrationFlash,
      this.celebrationRing,
      this.celebrationText,
    );
    this.root.addChild(
      this.background,
      this.glow,
      this.header,
      this.title,
      this.countdown,
      this.points,
      this.progressBar,
      this.missionsLabel,
      this.missionList,
      this.rewardsLabel,
      this.rewardTrack,
      this.emptyMessage,
      this.backButton,
      this.claimButton,
      this.celebration,
    );
  }

  mount(): void {
    this.refresh();
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    const second = Math.floor(Date.now() / 1000);
    if (second !== this.lastSecond) {
      this.lastSecond = second;
      this.refreshCountdown();
    }
    if (this.celebrationTime <= 0) return;
    this.celebrationTime = Math.max(0, this.celebrationTime - deltaSeconds);
    const elapsed = 1.25 - this.celebrationTime;
    const pulse = Math.sin(Math.min(1, elapsed / 0.35) * Math.PI);
    this.celebration.alpha = Math.min(1, this.celebrationTime * 2.5);
    this.celebrationRing.scale.set(0.65 + elapsed * 0.75);
    this.celebrationRing.alpha = Math.max(0, 1 - elapsed / 1.25);
    this.celebrationText.scale.set(0.88 + pulse * 0.12);
    if (this.celebrationTime === 0) this.celebration.visible = false;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const landscape = width > height && width >= 650;
    this.drawBackground();
    this.backButton.resize(46);
    this.backButton.position.set(10, 12);
    this.header.anchor.set(0.5);
    this.title.anchor.set(0.5);
    this.countdown.anchor.set(0.5);
    this.points.anchor.set(0.5);
    this.emptyMessage.anchor.set(0.5);
    this.celebrationFlash.clear().rect(0, 0, width, height)
      .fill({ color: 0x9dffd6, alpha: 0.16 });
    this.celebrationRing.clear().circle(0, 0, 75)
      .stroke({ color: 0xeaff78, alpha: 0.9, width: 3 });
    this.celebrationRing.position.set(width / 2, height / 2);
    this.celebrationText.position.set(width / 2, height / 2);

    if (landscape) this.resizeLandscape(width, height);
    else this.resizePortrait(width, height);
  }

  unmount(): void {}

  private resizePortrait(width: number, height: number): void {
    const contentWidth = Math.min(520, width - 28);
    const x = (width - contentWidth) / 2;
    this.header.position.set(width / 2, 24);
    this.title.position.set(width / 2, 51);
    this.countdown.position.set(width / 2, 80);
    this.points.position.set(width / 2, 103);
    this.drawProgressBar(x, 120, contentWidth);
    this.missionsLabel.position.set(x + 2, 140);
    this.missionList.position.set(x, 159);
    this.missionList.resize(contentWidth);
    const rewardsTop = 352;
    this.rewardsLabel.position.set(x + 2, rewardsTop);
    const trackTop = rewardsTop + 20;
    const trackHeight = Math.max(130, height - trackTop - 92);
    this.rewardTrack.position.set(x, trackTop);
    this.rewardTrack.resize(contentWidth, trackHeight);
    this.claimButton.resize(contentWidth);
    this.claimButton.position.set(x, height - 70);
    this.emptyMessage.position.set(width / 2, height / 2);
  }

  private resizeLandscape(width: number, height: number): void {
    const contentWidth = Math.min(900, width - 34);
    const x = (width - contentWidth) / 2;
    const gap = 18;
    const leftWidth = contentWidth * 0.45;
    const rightWidth = contentWidth - leftWidth - gap;
    const rightX = x + leftWidth + gap;
    this.header.position.set(width / 2, 18);
    this.title.position.set(width / 2, 43);
    this.countdown.position.set(width / 2, 68);
    this.points.position.set(x + leftWidth / 2, 93);
    this.drawProgressBar(x, 109, leftWidth);
    this.missionsLabel.position.set(x + 2, 128);
    this.missionList.position.set(x, 147);
    this.missionList.resize(leftWidth);
    this.rewardsLabel.position.set(rightX + 2, 91);
    this.rewardTrack.position.set(rightX, 110);
    this.rewardTrack.resize(rightWidth, Math.max(150, height - 181));
    this.claimButton.resize(rightWidth);
    this.claimButton.position.set(rightX, height - 64);
    this.emptyMessage.position.set(width / 2, height / 2);
  }

  private readonly handleClaim = (): void => {
    const rewardId = this.snapshot.claimableRewardIds[0];
    if (!rewardId) return;
    const result = this.options.onClaim(rewardId);
    if (!result.claimed || !result.reward) return;
    this.celebrationText.text = `DESBLOQUEADO\n${result.reward.label.toUpperCase()}`;
    this.celebration.visible = true;
    this.celebration.alpha = 1;
    this.celebrationTime = 1.25;
    this.snapshot = this.options.getSnapshot();
    this.refresh();
  };

  private refresh(): void {
    this.snapshot = this.options.getSnapshot();
    const active = this.snapshot.activeEvent;
    this.emptyMessage.visible = !active;
    this.missionList.visible = Boolean(active);
    this.rewardTrack.visible = Boolean(active);
    this.claimButton.visible = Boolean(active);
    this.missionsLabel.visible = Boolean(active);
    this.rewardsLabel.visible = Boolean(active);
    this.progressBar.visible = Boolean(active);
    this.points.visible = Boolean(active);
    if (!active) {
      this.emptyMessage.text = 'NO HAY UN EVENTO ACTIVO\nVUELVE PRONTO';
      return;
    }
    this.title.text = active.campaign.name.toUpperCase();
    const maximum = active.campaign.rewards.at(-1)?.pointsRequired ?? 1;
    this.points.text = `${this.snapshot.progress.points}/${maximum} PUNTOS DE EVENTO`;
    this.missionList.setMissions(active.campaign.missions, this.snapshot.progress.missionProgress);
    this.rewardTrack.setRewards(
      active.campaign.rewards,
      this.snapshot.progress.claimedRewardIds,
      this.snapshot.claimableRewardIds,
    );
    const claimable = active.campaign.rewards.find(
      (reward) => this.snapshot.claimableRewardIds.includes(reward.id),
    );
    this.claimButton.setText(claimable ? 'RECLAMAR RECOMPENSA' : 'SIGUE JUGANDO');
    this.claimButton.setEnabled(Boolean(claimable));
    this.refreshCountdown();
    this.resize(this.width, this.height);
  }

  private refreshCountdown(): void {
    const endsAt = this.snapshot.activeEvent?.week.endsAt;
    if (!endsAt) {
      this.countdown.text = '';
      return;
    }
    const seconds = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = seconds % 60;
    this.countdown.text = `TERMINA EN ${days}D ${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)} · UTC`;
  }

  private drawProgressBar(x: number, y: number, width: number): void {
    const maximum = this.snapshot.activeEvent?.campaign.rewards.at(-1)?.pointsRequired ?? 1;
    const ratio = Math.min(1, this.snapshot.progress.points / maximum);
    this.progressBar.clear().roundRect(x, y, width, 7, 3.5)
      .fill({ color: 0x23483d, alpha: 0.9 })
      .roundRect(x, y, width * ratio, 7, 3.5)
      .fill({ color: 0x62f5c1, alpha: 1 });
  }

  private drawBackground(): void {
    const size = Math.max(this.width, this.height);
    this.background.clear().rect(0, 0, this.width, this.height).fill(0x040d16)
      .circle(this.width * 0.08, this.height * 0.2, size * 0.3)
      .fill({ color: 0x48e9b3, alpha: 0.055 })
      .circle(this.width * 0.94, this.height * 0.7, size * 0.28)
      .fill({ color: 0xc768ff, alpha: 0.045 });
    this.glow.clear();
    for (let index = 0; index < 7; index += 1) {
      const x = this.width * (0.12 + index * 0.135);
      this.glow.moveTo(x, 0).lineTo(x - this.height * 0.24, this.height)
        .stroke({ color: index % 2 ? 0x64dfff : 0x55f5bd, alpha: 0.035, width: 1 });
    }
    this.glow.eventMode = 'none';
  }
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
