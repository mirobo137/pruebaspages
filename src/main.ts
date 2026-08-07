import './style.css';
import { GameApplication } from './app/GameApplication';

const mountElement = document.querySelector<HTMLElement>('#game');

if (!mountElement) {
  throw new Error('No se encontró el elemento #game.');
}

void new GameApplication(mountElement).start();
