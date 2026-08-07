import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { TimingGrade } from '../timing/TimingGrade';

interface ParticleEffect {
  node: Graphics;
  velocityX: number;
  velocityY: number;
  life: number;
  duration: number;
  gravity: number;
}

interface RingEffect {
  node: Graphics;
  life: number;
  duration: number;
}

interface TextEffect {
  node: Text;
  life: number;
  duration: number;
}

const floatingTextStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 24,
  fontWeight: '900',
  align: 'center',
  dropShadow: {
    alpha: 0.55,
    blur: 5,
    color: '#000000',
    distance: 2,
  },
});

export class JuiceSystem extends Container {
  private readonly flash = new Graphics();
  private readonly particles: ParticleEffect[] = [];
  private readonly rings: RingEffect[] = [];
  private readonly texts: TextEffect[] = [];
  private viewportWidth = 1;
  private viewportHeight = 1;
  private flashColor = 0xffffff;
  private flashStrength = 0;
  private shakeStrength = 0;
  private shakeX = 0;
  private shakeY = 0;

  constructor() {
    super();
    this.eventMode = 'none';
    this.flash.blendMode = 'add';
    this.addChild(this.flash);
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.redrawFlash();
  }

  emitTouch(x: number, y: number): void {
    this.createRing(x, y, 0x8ea7ff, 22, 0.22, 2);
  }

  emitDragSpark(x: number, y: number): void {
    for (let index = 0; index < 2; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      this.createParticle(
        x,
        y,
        0x9deeff,
        Math.cos(angle) * (18 + Math.random() * 28),
        Math.sin(angle) * (18 + Math.random() * 28),
        2 + Math.random() * 2,
        0.24,
        0,
      );
    }
  }

  emitImpact(x: number, y: number, grade: TimingGrade): void {
    const color = grade === 'perfect'
      ? 0x7df2ba
      : grade === 'good'
        ? 0xffdf78
        : 0xff6f91;
    const particleCount = grade === 'perfect' ? 18 : grade === 'good' ? 12 : 8;
    const speedMultiplier = grade === 'perfect' ? 1.25 : 1;

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2 + Math.random() * 0.28;
      const speed = (65 + Math.random() * 125) * speedMultiplier;
      this.createParticle(
        x,
        y,
        color,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        2 + Math.random() * 4,
        0.42 + Math.random() * 0.2,
        grade === 'miss' ? 100 : 45,
      );
    }

    this.createRing(x, y, color, 32, grade === 'perfect' ? 0.5 : 0.38, 4);
    if (grade === 'perfect') this.createRing(x, y, 0xffffff, 20, 0.34, 2);
    this.createFloatingText(x, y - 42, grade, color);

    this.flashColor = color;
    this.flashStrength = Math.max(
      this.flashStrength,
      grade === 'perfect' ? 0.11 : grade === 'good' ? 0.06 : 0.09,
    );
    this.shakeStrength = Math.max(
      this.shakeStrength,
      grade === 'perfect' ? 4.5 : grade === 'miss' ? 5.5 : 2.5,
    );
    this.redrawFlash();
  }

  updateEffects(deltaSeconds: number): void {
    this.flashStrength = Math.max(0, this.flashStrength - deltaSeconds * 0.55);
    this.flash.alpha = this.flashStrength;
    this.shakeStrength = Math.max(0, this.shakeStrength - deltaSeconds * 24);
    this.shakeX = (Math.random() * 2 - 1) * this.shakeStrength;
    this.shakeY = (Math.random() * 2 - 1) * this.shakeStrength;

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life += deltaSeconds;
      particle.velocityY += particle.gravity * deltaSeconds;
      particle.node.x += particle.velocityX * deltaSeconds;
      particle.node.y += particle.velocityY * deltaSeconds;
      const remaining = Math.max(0, 1 - particle.life / particle.duration);
      particle.node.alpha = remaining;
      particle.node.scale.set(0.65 + remaining * 0.55);

      if (particle.life >= particle.duration) {
        particle.node.destroy();
        this.particles.splice(index, 1);
      }
    }

    for (let index = this.rings.length - 1; index >= 0; index -= 1) {
      const ring = this.rings[index];
      ring.life += deltaSeconds;
      const progress = Math.min(1, ring.life / ring.duration);
      ring.node.alpha = (1 - progress) * 0.9;
      ring.node.scale.set(0.75 + progress * 1.65);

      if (ring.life >= ring.duration) {
        ring.node.destroy();
        this.rings.splice(index, 1);
      }
    }

    for (let index = this.texts.length - 1; index >= 0; index -= 1) {
      const text = this.texts[index];
      text.life += deltaSeconds;
      const progress = Math.min(1, text.life / text.duration);
      text.node.y -= deltaSeconds * 34;
      text.node.alpha = 1 - progress;
      text.node.scale.set(0.85 + Math.sin(progress * Math.PI) * 0.22);

      if (text.life >= text.duration) {
        text.node.destroy();
        this.texts.splice(index, 1);
      }
    }
  }

  getShakeOffset(): { x: number; y: number } {
    return { x: this.shakeX, y: this.shakeY };
  }

  private createParticle(
    x: number,
    y: number,
    color: number,
    velocityX: number,
    velocityY: number,
    radius: number,
    duration: number,
    gravity: number,
  ): void {
    const node = new Graphics();
    node.circle(0, 0, radius).fill({ color });
    node.position.set(x, y);
    node.blendMode = 'add';
    this.addChild(node);
    this.particles.push({
      node,
      velocityX,
      velocityY,
      life: 0,
      duration,
      gravity,
    });
  }

  private createRing(
    x: number,
    y: number,
    color: number,
    radius: number,
    duration: number,
    width: number,
  ): void {
    const node = new Graphics();
    node.circle(0, 0, radius).stroke({ color, alpha: 0.9, width });
    node.position.set(x, y);
    node.blendMode = 'add';
    this.addChild(node);
    this.rings.push({ node, life: 0, duration });
  }

  private createFloatingText(
    x: number,
    y: number,
    grade: TimingGrade,
    color: number,
  ): void {
    const label = grade === 'perfect' ? 'PERFECT' : grade === 'good' ? 'BIEN' : 'MISS';
    const node = new Text({ text: label, style: floatingTextStyle });
    node.style.fill = color;
    node.anchor.set(0.5);
    node.position.set(x, y);
    this.addChild(node);
    this.texts.push({ node, life: 0, duration: 0.7 });
  }

  private redrawFlash(): void {
    this.flash.clear().rect(0, 0, this.viewportWidth, this.viewportHeight).fill({
      color: this.flashColor,
    });
    this.flash.alpha = this.flashStrength;
  }
}
