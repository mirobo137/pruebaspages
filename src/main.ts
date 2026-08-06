import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import './style.css';

const app = new Application();
const playfield = new Container();
const stars = new Container();

const scoreStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 24,
  fontWeight: '700',
});

const hintStyle = new TextStyle({
  fill: '#a9b5d6',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  align: 'center',
});

const scoreText = new Text({ text: 'Estrellas: 0', style: scoreStyle });
const hintText = new Text({ text: 'Toca una estrella para empezar', style: hintStyle });

let score = 0;
let target: Graphics | null = null;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function positionUi(): void {
  scoreText.position.set(20, 20);
  hintText.anchor.set(0.5, 0);
  hintText.position.set(app.screen.width / 2, 62);
}

function createStar(): Graphics {
  const star = new Graphics()
    .circle(0, 0, 30)
    .fill({ color: 0xffd166 })
    .circle(0, 0, 42)
    .stroke({ color: 0xfff3b0, alpha: 0.35, width: 3 });

  star.eventMode = 'static';
  star.cursor = 'pointer';
  star.position.set(
    randomBetween(62, Math.max(63, app.screen.width - 62)),
    randomBetween(130, Math.max(131, app.screen.height - 62)),
  );
  star.alpha = 0;
  star.scale.set(0.5);
  return star;
}

function showNextStar(): void {
  target?.destroy();
  target = createStar();
  stars.addChild(target);

  let elapsed = 0;
  app.ticker.add(function appear(delta) {
    if (!target) {
      app.ticker.remove(appear);
      return;
    }

    elapsed += delta.deltaTime;
    target.alpha = Math.min(1, elapsed / 12);
    target.scale.set(0.5 + Math.min(0.5, elapsed / 24));
    if (target.alpha >= 1) app.ticker.remove(appear);
  });
}

function collectStar(star: Graphics): void {
  if (star !== target) return;

  score += 1;
  scoreText.text = `Estrellas: ${score}`;
  hintText.text = score === 1 ? '¡Bien! Sigue tocando' : 'Busca la siguiente estrella';
  navigator.vibrate?.(12);
  showNextStar();
}

async function start(): Promise<void> {
  await app.init({
    antialias: true,
    autoDensity: true,
    backgroundColor: 0x0b1022,
    resolution: Math.min(window.devicePixelRatio, 2),
    resizeTo: window,
  });

  document.querySelector('#game')?.appendChild(app.canvas);
  app.stage.addChild(playfield);
  playfield.addChild(stars, scoreText, hintText);
  playfield.eventMode = 'static';
  playfield.hitArea = app.screen;

  playfield.on('pointertap', (event) => {
    if (!target) return;
    const dx = event.global.x - target.x;
    const dy = event.global.y - target.y;
    if (Math.hypot(dx, dy) <= 48) collectStar(target);
  });

  window.addEventListener('resize', () => {
    playfield.hitArea = app.screen;
    positionUi();
  });

  positionUi();
  showNextStar();
}

void start();
