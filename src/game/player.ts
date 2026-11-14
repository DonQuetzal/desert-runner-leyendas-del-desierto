import { SoundEngine } from './audio';
import { BulletSystem } from './bullet';
import { ParticleSystem } from './particles';
import { Obstacle } from './scenarios';
import { getSpriteAtlas } from './sprites';
import { ARENA_BOUNDS, WORLD_HEIGHT, WORLD_WIDTH, clamp, normalize } from './utils';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shooting: boolean;
  mouseX: number;
  mouseY: number;
}

export class Player {
  public x = WORLD_WIDTH / 2;
  public y = (ARENA_BOUNDS.top + ARENA_BOUNDS.bottom) / 2;
  public radius = 10;
  public baseSpeed = 128;

  public hp = 100;
  public maxHp = 100;
  public lives = 3;
  public maxLives = 5;

  public ammo = 6;
  public maxAmmo = 6;
  public reloadTimer = 0;
  public reloadDuration = 0.52;
  public fireCooldown = 0;
  public baseFireInterval = 0.21;

  public aimAngle = 0;
  public facingLeft = false;
  public invulnTimer = 0;
  public walkAnim = 0;
  public dustTimer = 0;
  public muzzleFlashTimer = 0;

  // Mejoras temporales (segundos restantes)
  public shotgunTimer = 0;
  public rapidTimer = 0;
  public bootsTimer = 0;
  public sheriffTimer = 0;

  reset(): void {
    this.x = WORLD_WIDTH / 2;
    this.y = (ARENA_BOUNDS.top + ARENA_BOUNDS.bottom) / 2;
    this.hp = 100;
    this.maxHp = 100;
    this.lives = 3;
    this.ammo = 6;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.invulnTimer = 0;
    this.shotgunTimer = 0;
    this.rapidTimer = 0;
    this.bootsTimer = 0;
    this.sheriffTimer = 0;
    this.muzzleFlashTimer = 0;
  }

  triggerReload(audio: SoundEngine, particles: ParticleSystem): void {
    if (this.reloadTimer > 0 || this.ammo >= this.maxAmmo) return;
    this.reloadTimer = this.bootsTimer > 0 ? this.reloadDuration * 0.65 : this.reloadDuration;
    audio.playReload();
    particles.spawnText(this.x, this.y - 18, 'RECARGA', '#E2E8F0');
  }

  update(
    dt: number,
    input: InputState,
    obstacles: Obstacle[],
    bullets: BulletSystem,
    particles: ParticleSystem,
    audio: SoundEngine
  ): void {
    // Actualizar temporizadores
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer -= dt;
    if (this.shotgunTimer > 0) this.shotgunTimer -= dt;
    if (this.rapidTimer > 0) this.rapidTimer -= dt;
    if (this.bootsTimer > 0) this.bootsTimer -= dt;
    if (this.sheriffTimer > 0) this.sheriffTimer -= dt;

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        this.ammo = this.maxAmmo;
      }
    }

    // Movimiento en 8 direcciones normalizado
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;

    const dir = normalize(mx, my);
    const speedMult = (this.bootsTimer > 0 ? 1.32 : 1) * (this.sheriffTimer > 0 ? 1.12 : 1);
    const speed = this.baseSpeed * speedMult;

    if (dir.x !== 0 || dir.y !== 0) {
      this.x += dir.x * speed * dt;
      this.resolveObstacles(obstacles);
      this.y += dir.y * speed * dt;
      this.resolveObstacles(obstacles);

      this.walkAnim += dt * 10;
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = 0.14;
        particles.spawnDust(this.x, this.y);
      }
    } else {
      this.walkAnim = 0;
    }

    // Límites dentro del escenario
    this.x = clamp(this.x, ARENA_BOUNDS.left + this.radius, ARENA_BOUNDS.right - this.radius);
    this.y = clamp(this.y, ARENA_BOUNDS.top + this.radius, ARENA_BOUNDS.bottom - this.radius);

    // Apuntado hacia el mouse
    this.aimAngle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);
    this.facingLeft = Math.cos(this.aimAngle) < 0;

    // Disparo del revólver / armas mejoradas
    if (input.shooting && this.fireCooldown <= 0 && this.reloadTimer <= 0) {
      this.fire(bullets, particles, audio);
    }
  }

  private fire(bullets: BulletSystem, particles: ParticleSystem, audio: SoundEngine): void {
    const isRapid = this.rapidTimer > 0;
    const isShotgun = this.shotgunTimer > 0;

    if (!isRapid && this.ammo <= 0) {
      this.triggerReload(audio, particles);
      return;
    }

    const muzzleX = this.x + Math.cos(this.aimAngle) * 14;
    const muzzleY = this.y + Math.sin(this.aimAngle) * 14;

    if (isShotgun) {
      const pellets = 5;
      const spread = 0.42;
      for (let i = 0; i < pellets; i++) {
        const offset = -spread / 2 + (spread * i) / (pellets - 1);
        bullets.spawn({
          x: muzzleX,
          y: muzzleY,
          angle: this.aimAngle + offset,
          speed: 350,
          damage: 1,
          range: 210,
          owner: 'player',
          radius: 2.8,
          color: '#FDBA74',
        });
      }
      this.fireCooldown = isRapid ? 0.16 : 0.34;
      audio.playShoot(true);
    } else {
      bullets.spawn({
        x: muzzleX,
        y: muzzleY,
        angle: this.aimAngle,
        speed: 390,
        damage: isRapid ? 1.2 : 1.5,
        range: 360,
        owner: 'player',
        radius: 3,
        color: isRapid ? '#FDE047' : '#FEF08A',
      });
      this.fireCooldown = isRapid ? 0.095 : this.baseFireInterval;
      audio.playShoot(false);
    }

    this.muzzleFlashTimer = 0.06;
    particles.spawnShellCasing(this.x, this.y, this.aimAngle);

    if (!isRapid) {
      this.ammo--;
      if (this.ammo <= 0) {
        this.reloadTimer = this.bootsTimer > 0 ? this.reloadDuration * 0.65 : this.reloadDuration;
        audio.playReload();
      }
    }
  }

  private resolveObstacles(obstacles: Obstacle[]): void {
    for (const obs of obstacles) {
      if (!obs.solid) continue;
      const dx = this.x - obs.x;
      const dy = this.y - obs.y;
      const minDist = this.radius + obs.radius;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDist * minDist && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        const push = minDist - d;
        this.x += (dx / d) * push;
        this.y += (dy / d) * push;
      }
    }
  }

  takeDamage(amount: number, audio: SoundEngine, particles: ParticleSystem): 'none' | 'hit' | 'life_lost' | 'game_over' {
    if (this.invulnTimer > 0 || this.sheriffTimer > 0) {
      return 'none';
    }

    this.hp -= amount;
    this.invulnTimer = 1.05;
    audio.playPlayerDamage();
    particles.spawnBurst(this.x, this.y, 12, '#EF4444', 35, 115, 2, 0.35);

    if (this.hp <= 0) {
      this.lives--;
      if (this.lives <= 0) {
        this.hp = 0;
        return 'game_over';
      }
      this.hp = this.maxHp;
      this.ammo = this.maxAmmo;
      this.reloadTimer = 0;
      this.invulnTimer = 2.2;
      particles.spawnBurst(this.x, this.y, 24, '#F59E0B', 40, 150, 3, 0.5);
      particles.spawnText(this.x, this.y - 20, '-1 VIDA', '#F87171');
      return 'life_lost';
    }

    return 'hit';
  }

  render(ctx: CanvasRenderingContext2D): void {
    const atlas = getSpriteAtlas();

    // Parpadeo de invulnerabilidad
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 14) % 2 === 0) {
      return;
    }

    // Aura de Estrella del Sheriff
    if (this.sheriffTimer > 0) {
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(Math.round(this.x), Math.round(this.y), 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Sombra bajo el vaquero
    ctx.fillStyle = 'rgba(27, 20, 16, 0.32)';
    ctx.fillRect(Math.round(this.x - 8), Math.round(this.y + 8), 16, 4);

    const frameIdx = Math.floor(this.walkAnim) % 2;
    const sprite = atlas.player[frameIdx];
    const drawW = 20;
    const drawH = 22;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Revólver apuntando hacia el cursor
    const gunX = this.x + Math.cos(this.aimAngle) * 9;
    const gunY = this.y + Math.sin(this.aimAngle) * 9;
    ctx.save();
    ctx.translate(Math.round(gunX), Math.round(gunY));
    ctx.rotate(this.aimAngle);
    ctx.fillStyle = '#1B1410';
    ctx.fillRect(-1, -2, 9, 4);
    ctx.fillStyle = this.shotgunTimer > 0 ? '#D97706' : '#CBD5E1';
    ctx.fillRect(0, -1, 7, 2);

    if (this.muzzleFlashTimer > 0) {
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(7, -3, 5, 6);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(9, -2, 4, 4);
    }
    ctx.restore();

    // Indicador sutil de recarga sobre el vaquero
    if (this.reloadTimer > 0) {
      const progress = 1 - this.reloadTimer / this.reloadDuration;
      ctx.fillStyle = '#1B1410';
      ctx.fillRect(Math.round(this.x - 10), Math.round(this.y - 16), 20, 3);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(Math.round(this.x - 9), Math.round(this.y - 15), Math.round(18 * progress), 1);
    }
  }
}
