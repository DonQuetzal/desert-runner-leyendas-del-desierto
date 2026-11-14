import { SoundEngine } from './audio';
import { BulletSystem } from './bullet';
import { ParticleSystem } from './particles';
import { Obstacle } from './scenarios';
import { SpatialEntity } from './spatialGrid';
import { getSpriteAtlas } from './sprites';
import { ARENA_BOUNDS, clamp, isVisibleInViewport, normalize, randRange } from './utils';

export type EnemyType = 'bandit' | 'coyote' | 'javelina' | 'rattlesnake' | 'boss';

export interface Enemy extends SpatialEntity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  vx: number;
  vy: number;
  facingLeft: boolean;
  animTime: number;
  hitFlashTimer: number;

  // Estados específicos de comportamiento
  aiTimer: number;
  state: 'chase' | 'windup' | 'charge' | 'coiled';
  chargeDirX: number;
  chargeDirY: number;
  shootCooldown: number;
  bossName?: string;
}

export class EnemySystem {
  public enemies: Enemy[] = [];
  private nextId = 1;

  spawn(type: EnemyType, x: number, y: number, wave: number): Enemy {
    const scale = 1 + (wave - 1) * 0.1;
    let hp = 3;
    let speed = 52;
    let radius = 10;
    let damage = 20;
    let scoreValue = 25;
    let bossName: string | undefined;

    switch (type) {
      case 'coyote':
        hp = 1.5 + Math.floor(wave / 4) * 0.5;
        speed = 92 + Math.min(28, wave * 2.5);
        radius = 9;
        damage = 16;
        scoreValue = 30;
        break;
      case 'bandit':
        hp = 3 * (1 + (wave - 1) * 0.08);
        speed = 54 + Math.min(20, wave * 1.8);
        radius = 10;
        damage = 22;
        scoreValue = 40;
        break;
      case 'javelina':
        hp = 6.5 * scale;
        speed = 46;
        radius = 11;
        damage = 28;
        scoreValue = 65;
        break;
      case 'rattlesnake':
        hp = 2.8 * (1 + (wave - 1) * 0.06);
        speed = 58;
        radius = 9;
        damage = 20;
        scoreValue = 45;
        break;
      case 'boss': {
        const bossTier = Math.max(1, Math.floor(wave / 5));
        hp = 48 + bossTier * 26;
        speed = 48 + bossTier * 4;
        radius = 15;
        damage = 32;
        scoreValue = 350 * bossTier;
        const names = [
          'El Alacrán Rojo',
          'El Caporal de Hierro',
          'La Sombra de Sonora',
        ];
        bossName = names[(bossTier - 1) % names.length];
        break;
      }
    }

    const enemy: Enemy = {
      id: this.nextId++,
      type,
      x,
      y,
      radius,
      hp,
      maxHp: hp,
      speed,
      damage,
      scoreValue,
      vx: 0,
      vy: 0,
      facingLeft: x > 320,
      animTime: randRange(0, 2),
      hitFlashTimer: 0,
      aiTimer: randRange(0.4, 1.4),
      state: 'chase',
      chargeDirX: 0,
      chargeDirY: 0,
      shootCooldown: randRange(1.6, 3.0),
      bossName,
    };

    this.enemies.push(enemy);
    return enemy;
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    wave: number,
    obstacles: Obstacle[],
    bullets: BulletSystem,
    particles: ParticleSystem,
    audio: SoundEngine
  ): void {
    for (const e of this.enemies) {
      e.animTime += dt * (e.state === 'charge' ? 14 : 7);
      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;

      const toPlayer = normalize(playerX - e.x, playerY - e.y);
      const distToPlayer = Math.hypot(playerX - e.x, playerY - e.y);

      if (e.type === 'bandit') {
        e.vx = toPlayer.x * e.speed;
        e.vy = toPlayer.y * e.speed;

        // Bandidos veteranos disparan ocasionalmente desde la oleada 3
        if (wave >= 3 && distToPlayer < 260 && distToPlayer > 70) {
          e.shootCooldown -= dt;
          if (e.shootCooldown <= 0) {
            e.shootCooldown = Math.max(1.8, 3.2 - wave * 0.08);
            const angle = Math.atan2(playerY - e.y, playerX - e.x);
            bullets.spawn({
              x: e.x,
              y: e.y,
              angle,
              speed: 165,
              damage: 18,
              range: 280,
              owner: 'enemy',
              radius: 3.2,
              color: '#F87171',
            });
          }
        }
      } else if (e.type === 'coyote') {
        // Coyote zigzaguea ligeramente al acercarse
        const perpX = -toPlayer.y;
        const perpY = toPlayer.x;
        const weave = Math.sin(e.animTime * 1.3) * 0.32;
        const dir = normalize(toPlayer.x + perpX * weave, toPlayer.y + perpY * weave);
        e.vx = dir.x * e.speed;
        e.vy = dir.y * e.speed;
      } else if (e.type === 'javelina') {
        if (e.state === 'chase') {
          e.vx = toPlayer.x * e.speed;
          e.vy = toPlayer.y * e.speed;
          e.aiTimer -= dt;
          if (distToPlayer < 165 && e.aiTimer <= 0) {
            e.state = 'windup';
            e.aiTimer = 0.45;
            e.chargeDirX = toPlayer.x;
            e.chargeDirY = toPlayer.y;
            e.vx = 0;
            e.vy = 0;
            particles.spawnText(e.x, e.y - 16, '!', '#F97316');
          }
        } else if (e.state === 'windup') {
          e.vx = 0;
          e.vy = 0;
          e.aiTimer -= dt;
          if (e.aiTimer <= 0) {
            e.state = 'charge';
            e.aiTimer = 0.58;
          }
        } else if (e.state === 'charge') {
          e.vx = e.chargeDirX * 195;
          e.vy = e.chargeDirY * 195;
          e.aiTimer -= dt;
          if (e.aiTimer <= 0) {
            e.state = 'chase';
            e.aiTimer = 1.9;
          }
        }
      } else if (e.type === 'rattlesnake') {
        if (e.state === 'chase') {
          e.vx = toPlayer.x * e.speed;
          e.vy = toPlayer.y * e.speed;
          if (distToPlayer < 120) {
            e.state = 'coiled';
            e.aiTimer = 0.42;
            e.chargeDirX = toPlayer.x;
            e.chargeDirY = toPlayer.y;
            audio.playRattle();
            particles.spawnText(e.x, e.y - 14, 'TSS!', '#A3E635');
          }
        } else if (e.state === 'coiled') {
          e.vx = 0;
          e.vy = 0;
          e.aiTimer -= dt;
          if (e.aiTimer <= 0) {
            e.state = 'charge';
            e.aiTimer = 0.34;
            // Disparo corto de veneno si está en rango medio
            if (distToPlayer > 55) {
              const angle = Math.atan2(playerY - e.y, playerX - e.x);
              bullets.spawn({
                x: e.x,
                y: e.y,
                angle,
                speed: 190,
                damage: 15,
                range: 170,
                owner: 'enemy',
                radius: 3,
                color: '#A3E635',
              });
            }
          }
        } else if (e.state === 'charge') {
          e.vx = e.chargeDirX * 175;
          e.vy = e.chargeDirY * 175;
          e.aiTimer -= dt;
          if (e.aiTimer <= 0) {
            e.state = 'chase';
            e.aiTimer = 1.2;
          }
        }
      } else if (e.type === 'boss') {
        // Jefe alterna persecución lenta y ráfagas de revólver en abanico
        const orbitDir = distToPlayer < 105 ? -0.3 : 1;
        e.vx = toPlayer.x * e.speed * orbitDir - toPlayer.y * 22;
        e.vy = toPlayer.y * e.speed * orbitDir + toPlayer.x * 22;

        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0) {
          e.shootCooldown = 1.45;
          const baseAngle = Math.atan2(playerY - e.y, playerX - e.x);
          const count = e.hp < e.maxHp * 0.5 ? 7 : 5;
          const arc = 0.9;
          for (let i = 0; i < count; i++) {
            const a = baseAngle - arc / 2 + (arc * i) / (count - 1);
            bullets.spawn({
              x: e.x,
              y: e.y,
              angle: a,
              speed: 165,
              damage: 20,
              range: 340,
              owner: 'enemy',
              radius: 3.5,
              color: '#FB7185',
            });
          }
          audio.playShoot(true);
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (Math.abs(e.vx) > 2) {
        e.facingLeft = e.vx < 0;
      }

      // Evitar atascarse en obstáculos sólidos
      for (const obs of obstacles) {
        if (!obs.solid) continue;
        const dx = e.x - obs.x;
        const dy = e.y - obs.y;
        const minDist = e.radius + obs.radius;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDist * minDist && dSq > 0.001) {
          const d = Math.sqrt(dSq);
          const push = minDist - d;
          e.x += (dx / d) * push;
          e.y += (dy / d) * push;
        }
      }

      e.x = clamp(e.x, ARENA_BOUNDS.left - 14, ARENA_BOUNDS.right + 14);
      e.y = clamp(e.y, ARENA_BOUNDS.top - 14, ARENA_BOUNDS.bottom + 14);
    }
  }

  getActiveBoss(): Enemy | null {
    for (const e of this.enemies) {
      if (e.type === 'boss') return e;
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D): number {
    const atlas = getSpriteAtlas();
    let culled = 0;

    for (const e of this.enemies) {
      if (!isVisibleInViewport(e.x, e.y, e.radius + 8)) {
        culled++;
        continue;
      }

      const frameIdx = Math.floor(e.animTime) % 2;
      let sprite: HTMLCanvasElement;
      let drawW = 20;
      let drawH = 22;

      switch (e.type) {
        case 'bandit':
          sprite = atlas.bandit[frameIdx];
          break;
        case 'coyote':
          sprite = atlas.coyote[frameIdx];
          drawW = 20;
          drawH = 15;
          break;
        case 'javelina':
          sprite = atlas.javelina[frameIdx];
          drawW = 22;
          drawH = 17;
          break;
        case 'rattlesnake':
          sprite = atlas.rattlesnake[frameIdx];
          drawW = 19;
          drawH = 15;
          break;
        case 'boss':
          sprite = atlas.boss[frameIdx];
          drawW = 30;
          drawH = 30;
          break;
      }

      // Sombra
      ctx.fillStyle = 'rgba(27, 20, 16, 0.3)';
      ctx.fillRect(Math.round(e.x - drawW * 0.4), Math.round(e.y + drawH * 0.35), Math.round(drawW * 0.8), 4);

      ctx.save();
      const shakeX = e.state === 'windup' || e.state === 'coiled' ? Math.sin(e.animTime * 45) * 1.5 : 0;
      ctx.translate(Math.round(e.x + shakeX), Math.round(e.y));
      if (e.facingLeft) ctx.scale(-1, 1);

      if (e.hitFlashTimer > 0) {
        ctx.filter = 'brightness(2.2)';
      }
      ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Barra de vida miniatura sobre enemigos heridos (no jefes)
      if (e.type !== 'boss' && e.hp < e.maxHp) {
        const bw = 16;
        const bx = Math.round(e.x - bw / 2);
        const by = Math.round(e.y - drawH / 2 - 5);
        ctx.fillStyle = '#1B1410';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(bx, by, Math.max(1, Math.round(bw * (e.hp / e.maxHp))), 2);
      }
    }

    return culled;
  }

  clear(): void {
    this.enemies.length = 0;
  }
}
