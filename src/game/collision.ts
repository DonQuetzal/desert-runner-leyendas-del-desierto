import { SoundEngine } from './audio';
import { BulletSystem } from './bullet';
import { Enemy, EnemySystem } from './enemy';
import { ParticleSystem } from './particles';
import { Player } from './player';
import { POWERUP_LABELS, PowerUpSystem } from './powerups';
import { Obstacle } from './scenarios';
import { SpatialGrid } from './spatialGrid';
import { distSq } from './utils';

export interface CollisionCallbacks {
  onEnemyKilled: (enemy: Enemy) => void;
  onScoreAdd: (points: number) => void;
  onPlayerLifeLost: () => void;
  onGameOver: () => void;
}

/**
 * Resuelve todas las colisiones del juego utilizando el Spatial Grid
 * para evitar comparaciones cuadráticas innecesarias.
 */
export function resolveCollisions(params: {
  player: Player;
  enemySystem: EnemySystem;
  bulletSystem: BulletSystem;
  powerUpSystem: PowerUpSystem;
  particleSystem: ParticleSystem;
  audio: SoundEngine;
  obstacles: Obstacle[];
  grid: SpatialGrid<Enemy>;
  callbacks: CollisionCallbacks;
}): void {
  const {
    player,
    enemySystem,
    bulletSystem,
    powerUpSystem,
    particleSystem,
    audio,
    obstacles,
    grid,
    callbacks,
  } = params;

  // 1. Reconstruir el Spatial Grid con las posiciones actuales de los enemigos
  grid.clear();
  for (let i = 0; i < enemySystem.enemies.length; i++) {
    grid.insert(enemySystem.enemies[i]);
  }

  const nearbyBuffer: Enemy[] = [];
  const deadEnemyIds = new Set<number>();

  // 2. Colisiones de proyectiles (jugador y enemigos)
  bulletSystem.pool.forEachActive((bullet) => {
    // Choque contra obstáculos sólidos (sahuaros / rocas)
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs.solid) continue;
      const rSum = bullet.radius + obs.radius * 0.78;
      if (distSq(bullet.x, bullet.y, obs.x, obs.y) <= rSum * rSum) {
        particleSystem.spawnBurst(bullet.x, bullet.y, 4, '#D6B68B', 20, 65, 2, 0.2);
        bulletSystem.pool.release(bullet);
        return;
      }
    }

    if (bullet.owner === 'player') {
      const candidates = grid.queryRadius(bullet.x, bullet.y, bullet.radius + 18, nearbyBuffer);
      for (let i = 0; i < candidates.length; i++) {
        const enemy = candidates[i];
        if (deadEnemyIds.has(enemy.id)) continue;

        const rSum = bullet.radius + enemy.radius;
        if (distSq(bullet.x, bullet.y, enemy.x, enemy.y) <= rSum * rSum) {
          enemy.hp -= bullet.damage;
          enemy.hitFlashTimer = 0.08;
          particleSystem.spawnBurst(bullet.x, bullet.y, 5, '#FDE047', 30, 90, 2, 0.22);

          if (!bullet.piercing) {
            bulletSystem.pool.release(bullet);
          }

          if (enemy.hp <= 0) {
            deadEnemyIds.add(enemy.id);
            const isBoss = enemy.type === 'boss';
            audio.playEnemyKill(isBoss);
            particleSystem.spawnBurst(
              enemy.x,
              enemy.y,
              isBoss ? 28 : 11,
              isBoss ? '#F97316' : '#EF4444',
              35,
              140,
              isBoss ? 3 : 2,
              isBoss ? 0.55 : 0.35
            );
            powerUpSystem.spawnRandomDrop(enemy.x, enemy.y, isBoss);
            if (isBoss) {
              powerUpSystem.spawnSpecific(enemy.x + 14, enemy.y, 'canteen');
              powerUpSystem.spawnSpecific(enemy.x - 14, enemy.y, 'coin');
            }
            callbacks.onEnemyKilled(enemy);
          } else {
            audio.playHit();
          }
          return;
        }
      }
    } else {
      // Bala enemiga contra jugador
      const rSum = bullet.radius + player.radius * 0.85;
      if (distSq(bullet.x, bullet.y, player.x, player.y) <= rSum * rSum) {
        bulletSystem.pool.release(bullet);
        const result = player.takeDamage(bullet.damage, audio, particleSystem);
        if (result === 'life_lost') {
          callbacks.onPlayerLifeLost();
        } else if (result === 'game_over') {
          callbacks.onGameOver();
          return;
        }
      }
    }
  });

  // 3. Colisión cuerpo a cuerpo enemigos vs jugador usando Spatial Grid
  const playerThreatCandidates = grid.queryRadius(player.x, player.y, player.radius + 20, nearbyBuffer);
  for (let i = 0; i < playerThreatCandidates.length; i++) {
    const enemy = playerThreatCandidates[i];
    if (deadEnemyIds.has(enemy.id)) continue;

    const rSum = player.radius + enemy.radius * 0.88;
    if (distSq(player.x, player.y, enemy.x, enemy.y) <= rSum * rSum) {
      if (player.sheriffTimer > 0 && enemy.type !== 'boss') {
        // Estrella del Sheriff elimina enemigos normales al contacto
        enemy.hp = 0;
        deadEnemyIds.add(enemy.id);
        audio.playEnemyKill(false);
        particleSystem.spawnBurst(enemy.x, enemy.y, 10, '#FACC15', 30, 110, 2, 0.3);
        callbacks.onEnemyKilled(enemy);
      } else {
        const result = player.takeDamage(enemy.damage, audio, particleSystem);
        if (result === 'life_lost') {
          // Onda de polvo que limpia enemigos muy cercanos al perder una vida
          for (const other of enemySystem.enemies) {
            if (other.type !== 'boss' && distSq(player.x, player.y, other.x, other.y) < 95 * 95) {
              deadEnemyIds.add(other.id);
              particleSystem.spawnBurst(other.x, other.y, 8, '#EBD2A9', 30, 95, 2, 0.3);
            }
          }
          callbacks.onPlayerLifeLost();
          break;
        } else if (result === 'game_over') {
          callbacks.onGameOver();
          return;
        }
      }
    }
  }

  // Purgar enemigos derrotados
  if (deadEnemyIds.size > 0) {
    enemySystem.enemies = enemySystem.enemies.filter((e) => !deadEnemyIds.has(e.id));
  }

  // 4. Recogida de potenciadores y objetos coleccionables
  for (let i = powerUpSystem.items.length - 1; i >= 0; i--) {
    const item = powerUpSystem.items[i];
    const rSum = player.radius + item.radius;
    if (distSq(player.x, player.y, item.x, item.y) <= rSum * rSum) {
      const label = POWERUP_LABELS[item.type];
      particleSystem.spawnText(item.x, item.y - 12, label.title, label.color);
      particleSystem.spawnBurst(item.x, item.y, 8, label.color, 25, 80, 2, 0.3);

      switch (item.type) {
        case 'coin':
          callbacks.onScoreAdd(50);
          audio.playPickup(false);
          break;
        case 'shotgun':
          player.shotgunTimer = 12;
          audio.playPickup(true);
          break;
        case 'rapid':
          player.rapidTimer = 10;
          player.ammo = player.maxAmmo;
          player.reloadTimer = 0;
          audio.playPickup(true);
          break;
        case 'boots':
          player.bootsTimer = 12;
          audio.playPickup(false);
          break;
        case 'sheriff':
          player.sheriffTimer = 7;
          audio.playPickup(true);
          break;
        case 'canteen':
          player.hp = Math.min(player.maxHp, player.hp + 35);
          audio.playPickup(false);
          break;
        case 'life':
          player.lives = Math.min(player.maxLives, player.lives + 1);
          audio.playPickup(true);
          break;
      }

      powerUpSystem.items.splice(i, 1);
    }
  }
}
