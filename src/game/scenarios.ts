import { getSpriteAtlas } from './sprites';
import { ARENA_BOUNDS, WORLD_HEIGHT, WORLD_WIDTH } from './utils';

export type ScenarioId = 'desierto_abierto' | 'pueblo_abandonado' | 'canon_rocoso';
export type TimeOfDay = 'afternoon' | 'sunset' | 'night';

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  kind: 'sahuaro' | 'rock' | 'mezquite';
  solid: boolean;
}

export interface ScenarioConfig {
  id: ScenarioId;
  name: string;
  subtitle: string;
  unlocked: boolean;
  sandBase: string;
  sandAlt: string;
  sandCrack: string;
  borderColor: string;
  obstacles: Obstacle[];
}

/**
 * Arquitectura extensible de escenarios sonorenses.
 * Escenario 1 jugable ("Desierto Abierto"); escenarios 2 y 3 preparados en la arquitectura.
 */
export const SCENARIOS: Record<ScenarioId, ScenarioConfig> = {
  desierto_abierto: {
    id: 'desierto_abierto',
    name: 'Desierto Abierto de Sonora',
    subtitle: 'Llanura de sahuaros, mezquites y tierra roja',
    unlocked: true,
    sandBase: '#D9A76A',
    sandAlt: '#CE9858',
    sandCrack: '#B57F43',
    borderColor: '#7A4B2A',
    obstacles: [
      { x: 138, y: 128, radius: 12, kind: 'sahuaro', solid: true },
      { x: 502, y: 128, radius: 12, kind: 'sahuaro', solid: true },
      { x: 138, y: 304, radius: 12, kind: 'rock', solid: true },
      { x: 502, y: 304, radius: 12, kind: 'sahuaro', solid: true },
      { x: 255, y: 216, radius: 11, kind: 'rock', solid: true },
      { x: 385, y: 216, radius: 11, kind: 'rock', solid: true },
      // Vegetación decorativa transitable (no bloquea al jugador)
      { x: 90, y: 216, radius: 10, kind: 'mezquite', solid: false },
      { x: 550, y: 216, radius: 10, kind: 'mezquite', solid: false },
      { x: 320, y: 102, radius: 10, kind: 'mezquite', solid: false },
      { x: 320, y: 334, radius: 10, kind: 'mezquite', solid: false },
    ],
  },
  pueblo_abandonado: {
    id: 'pueblo_abandonado',
    name: 'Pueblo Abandonado',
    subtitle: 'Muros de adobe, cantina vieja y callejón polvoriento',
    unlocked: false,
    sandBase: '#C89B6E',
    sandAlt: '#B6865A',
    sandCrack: '#9A6C42',
    borderColor: '#5C3A24',
    obstacles: [
      { x: 180, y: 150, radius: 13, kind: 'rock', solid: true },
      { x: 460, y: 150, radius: 13, kind: 'rock', solid: true },
      { x: 180, y: 280, radius: 13, kind: 'rock', solid: true },
      { x: 460, y: 280, radius: 13, kind: 'rock', solid: true },
    ],
  },
  canon_rocoso: {
    id: 'canon_rocoso',
    name: 'Cañón Rocoso',
    subtitle: 'Desfiladero de terracota y sombras largas',
    unlocked: false,
    sandBase: '#BF7D54',
    sandAlt: '#AD6B43',
    sandCrack: '#8A4F2E',
    borderColor: '#572C19',
    obstacles: [
      { x: 220, y: 140, radius: 14, kind: 'rock', solid: true },
      { x: 420, y: 290, radius: 14, kind: 'rock', solid: true },
    ],
  },
};

export function getTimeOfDayForWave(wave: number): TimeOfDay {
  if (wave <= 2) return 'afternoon';
  if (wave <= 4) return 'sunset';
  return 'night';
}

/**
 * Genera el Offscreen Canvas estático del escenario (cielo sonorense, cerros,
 * suelo arenoso pixel art, grietas, piedritas y sombra de obstáculos).
 */
export function buildOffscreenTerrain(
  scenario: ScenarioConfig,
  timeOfDay: TimeOfDay
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 1. Cielo / horizonte superior sonorense
  const skyColors: Record<TimeOfDay, [string, string, string]> = {
    afternoon: ['#E59A54', '#F2B86B', '#C47B3D'],
    sunset: ['#6B242A', '#C94E2C', '#F29A38'],
    night: ['#111324', '#1E213D', '#352A47'],
  };
  const [skyTop, skyMid, skyLow] = skyColors[timeOfDay];

  ctx.fillStyle = skyTop;
  ctx.fillRect(0, 0, WORLD_WIDTH, 16);
  ctx.fillStyle = skyMid;
  ctx.fillRect(0, 16, WORLD_WIDTH, 16);
  ctx.fillStyle = skyLow;
  ctx.fillRect(0, 32, WORLD_WIDTH, 20);

  // Estrellas en noche o atardecer tardío
  if (timeOfDay === 'night') {
    ctx.fillStyle = '#FEF3C7';
    for (let i = 0; i < 42; i++) {
      const sx = (i * 53 + 17) % WORLD_WIDTH;
      const sy = (i * 29 + 5) % 34;
      ctx.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    // Luna creciente
    ctx.fillStyle = '#FDE68A';
    ctx.fillRect(560, 10, 8, 8);
    ctx.fillStyle = skyTop;
    ctx.fillRect(563, 10, 6, 6);
  } else {
    // Sol del desierto
    ctx.fillStyle = timeOfDay === 'sunset' ? '#FBBF24' : '#FEF08A';
    ctx.fillRect(534, timeOfDay === 'sunset' ? 20 : 10, 14, 14);
  }

  // Cerros y mesetas sonorenses en el horizonte
  ctx.fillStyle = timeOfDay === 'night' ? '#251D2E' : timeOfDay === 'sunset' ? '#6E2D24' : '#9C5C38';
  const ridges = [
    [0, 34, 85, 18],
    [70, 26, 110, 26],
    [175, 32, 95, 20],
    [260, 24, 130, 28],
    [380, 30, 100, 22],
    [475, 25, 90, 27],
    [555, 31, 85, 21],
  ];
  for (const [rx, ry, rw, rh] of ridges) {
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillRect(rx + 12, ry - 4, Math.max(12, rw - 24), 4);
  }

  // Pequeña silueta de pueblo de adobe a lo lejos
  ctx.fillStyle = timeOfDay === 'night' ? '#36272A' : '#854C30';
  ctx.fillRect(296, 36, 20, 12);
  ctx.fillRect(320, 33, 14, 15);
  ctx.fillRect(324, 29, 6, 4);

  // 2. Borde perimetral de madera / empalizada rústica del campo
  ctx.fillStyle = '#3B2516';
  ctx.fillRect(0, ARENA_BOUNDS.top - 4, WORLD_WIDTH, WORLD_HEIGHT - ARENA_BOUNDS.top + 4);

  // 3. Suelo arenoso en mosaico 16x16 pixel art
  const sandTone = timeOfDay === 'night' ? '#8E6B4B' : timeOfDay === 'sunset' ? '#C78952' : scenario.sandBase;
  const sandAlt = timeOfDay === 'night' ? '#826042' : timeOfDay === 'sunset' ? '#BA7D48' : scenario.sandAlt;
  const crackTone = timeOfDay === 'night' ? '#6B4C33' : scenario.sandCrack;

  ctx.fillStyle = sandTone;
  ctx.fillRect(
    ARENA_BOUNDS.left,
    ARENA_BOUNDS.top,
    ARENA_BOUNDS.right - ARENA_BOUNDS.left,
    ARENA_BOUNDS.bottom - ARENA_BOUNDS.top
  );

  // Textura determinista de arena, piedritas y senderos
  for (let ty = ARENA_BOUNDS.top; ty < ARENA_BOUNDS.bottom; ty += 16) {
    for (let tx = ARENA_BOUNDS.left; tx < ARENA_BOUNDS.right; tx += 16) {
      const hash = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
      if (hash % 5 === 0) {
        ctx.fillStyle = sandAlt;
        ctx.fillRect(tx + 2, ty + 4, 8, 4);
      }
      if (hash % 11 === 0) {
        ctx.fillStyle = crackTone;
        ctx.fillRect(tx + 5, ty + 9, 4, 1);
        ctx.fillRect(tx + 8, ty + 10, 2, 1);
      }
      if (hash % 17 === 0) {
        ctx.fillStyle = '#EBD2A9';
        ctx.fillRect(tx + 10, ty + 3, 2, 2);
      }
    }
  }

  // Marco de borde interior cálido
  ctx.strokeStyle = scenario.borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    ARENA_BOUNDS.left - 1,
    ARENA_BOUNDS.top - 1,
    ARENA_BOUNDS.right - ARENA_BOUNDS.left + 2,
    ARENA_BOUNDS.bottom - ARENA_BOUNDS.top + 2
  );

  // Postes de madera en las esquinas y entradas
  const posts = [
    [ARENA_BOUNDS.left - 4, ARENA_BOUNDS.top - 4],
    [ARENA_BOUNDS.right - 2, ARENA_BOUNDS.top - 4],
    [ARENA_BOUNDS.left - 4, ARENA_BOUNDS.bottom - 2],
    [ARENA_BOUNDS.right - 2, ARENA_BOUNDS.bottom - 2],
  ];
  for (const [px, py] of posts) {
    ctx.fillStyle = '#5C3820';
    ctx.fillRect(px, py, 6, 6);
    ctx.fillStyle = '#8F5B36';
    ctx.fillRect(px + 1, py + 1, 4, 2);
  }

  // 4. Vegetación transitable y sombras base de obstáculos en el offscreen canvas
  const atlas = getSpriteAtlas();
  for (const obs of scenario.obstacles) {
    if (!obs.solid && obs.kind === 'mezquite') {
      ctx.fillStyle = 'rgba(27, 20, 16, 0.22)';
      ctx.fillRect(obs.x - 10, obs.y + 4, 20, 5);
      ctx.drawImage(atlas.mezquite, Math.round(obs.x - 12), Math.round(obs.y - 9), 24, 18);
    } else {
      // Sombra proyectada fija para rocas y sahuaros
      ctx.fillStyle = 'rgba(27, 20, 16, 0.25)';
      ctx.fillRect(obs.x - 10, obs.y + 5, 22, 6);
    }
  }

  return canvas;
}
