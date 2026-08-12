import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { EventMissionDefinition } from '../events/EventTypes';

const labelStyle = new TextStyle({
  fill: '#eefcf8', fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: '800',
});
const valueStyle = new TextStyle({
  fill: '#9effdd', fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: '900',
});

export class EventMissionList extends Container {
  private readonly rows: Array<{
    root: Container;
    background: Graphics;
    bar: Graphics;
    label: Text;
    value: Text;
    ratio: number;
  }> = [];
  private listWidth = 320;

  setMissions(
    missions: readonly EventMissionDefinition[],
    progress: Readonly<Record<string, number>>,
  ): void {
    for (const row of this.rows) row.root.destroy({ children: true });
    this.rows.length = 0;
    missions.forEach((mission, index) => {
      const root = new Container();
      const background = new Graphics();
      const label = new Text({ text: mission.label.toUpperCase(), style: labelStyle });
      const amount = Math.min(mission.target, progress[mission.id] ?? 0);
      const value = new Text({ text: `${amount}/${mission.target}`, style: valueStyle });
      const bar = new Graphics();
      root.position.y = index * 62;
      root.addChild(background, bar, label, value);
      root.eventMode = 'none';
      this.addChild(root);
      this.rows.push({
        root,
        background,
        bar,
        label,
        value,
        ratio: amount / mission.target,
      });
    });
    this.draw();
  }

  resize(width: number): void {
    this.listWidth = width;
    this.draw();
  }

  private draw(): void {
    this.rows.forEach((row) => {
      row.background.clear().roundRect(0, 0, this.listWidth, 54, 12)
        .fill({ color: 0x081a21, alpha: 0.88 })
        .stroke({ color: 0x62f4c3, alpha: 0.22, width: 1 });
      row.bar.clear().roundRect(10, 37, this.listWidth - 20, 5, 2.5)
        .fill({ color: 0x29463f, alpha: 0.8 })
        .roundRect(10, 37, Math.max(0, this.listWidth - 20) * row.ratio, 5, 2.5)
        .fill({ color: 0x63f5c2, alpha: 0.95 });
      row.label.position.set(11, 10);
      row.value.anchor.set(1, 0);
      row.value.position.set(this.listWidth - 11, 11);
    });
  }
}
