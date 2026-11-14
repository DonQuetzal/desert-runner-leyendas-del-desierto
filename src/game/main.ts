import { DesertRunnerGame, GameSnapshot } from './game';

/**
 * Punto de entrada modular del motor de videojuego.
 * Conecta el elemento <canvas> con el ciclo principal de DesertRunnerGame.
 */
export function mountDesertRunner(
  canvas: HTMLCanvasElement,
  onSnapshot: (snapshot: GameSnapshot) => void
): DesertRunnerGame {
  const game = new DesertRunnerGame(canvas, onSnapshot);
  game.startLoop();
  return game;
}

export type { DesertRunnerGame, GameSnapshot };
