import { ObjectPool, Poolable, isVisibleInViewport, randRange } from './utils';

export class Particle implements Poolable {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  size = 2;
  color = '#F59E0B';
  life = 0;
  maxLife = 0.3;
  gravity = 0;

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 2;
    this.color = '#F59E0B';
    this.life = 0;
    this.maxLife = 0.3;
    this.gravity = 0;
  }
}

export class FloatingText implements Poolable {
  active = false;
  x = 0;
  y = 0;
  vy = -22;
  text = '';
  color = '#FEF08A';
  life = 0;
  maxLife = 0.75;

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.vy = -22;
    this.text = '';
    this.color = '#FEF08A';
    this.life = 0;
    this.maxLife = 0.75;
  }
}

/**
 * Sistema de partículas y textos flotantes respaldado por Object Pooling.
 */
export class ParticleSystem {
  public readonly particlePool = new ObjectPool(() => new Particle(), 260);
  public readonly textPool = new ObjectPool(() => new FloatingText(), 48);

  spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speedMin: number = 25,
    speedMax: number = 95,
    size: number = 2,
    maxLife: number = 0.35
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.acquire();
      if (!p) break;
      const angle = randRange(0, Math.PI * 2);
      const speed = randRange(speedMin, speedMax);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = size;
      p.color = color;
      p.life = maxLife * randRange(0.7, 1.15);
      p.maxLife = p.life;
      p.gravity = 0;
    }
  }

  spawnShellCasing(x: number, y: number, aimAngle: number): void {
    const p = this.particlePool.acquire();
    if (!p) return;
    const ejectAngle = aimAngle + Math.PI * 0.5 + randRange(-0.35, 0.35);
    const speed = randRange(38, 62);
    p.x = x;
    p.y = y;
    p.vx = Math.cos(ejectAngle) * speed;
    p.vy = Math.sin(ejectAngle) * speed - 18;
    p.size = 2;
    p.color = '#FACC15';
    p.life = 0.42;
    p.maxLife = 0.42;
    p.gravity = 120;
  }

  spawnDust(x: number, y: number): void {
    const p = this.particlePool.acquire();
    if (!p) return;
    p.x = x + randRange(-4, 4);
    p.y = y + 6;
    p.vx = randRange(-12, 12);
    p.vy = randRange(-14, -4);
    p.size = 2;
    p.color = '#EBD2A9';
    p.life = 0.25;
    p.maxLife = 0.25;
    p.gravity = 0;
  }

  spawnText(x: number, y: number, text: string, color: string = '#FEF08A'): void {
    const ft = this.textPool.acquire();
    if (!ft) return;
    ft.x = x;
    ft.y = y;
    ft.text = text;
    ft.color = color;
    ft.life = 0.8;
    ft.maxLife = 0.8;
    ft.vy = -24;
  }

  update(dt: number): void {
    this.particlePool.forEachActive((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        this.particlePool.release(p);
        return;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
    });

    this.textPool.forEachActive((ft) => {
      ft.life -= dt;
      if (ft.life <= 0) {
        this.textPool.release(ft);
        return;
      }
      ft.y += ft.vy * dt;
    });
  }

  render(ctx: CanvasRenderingContext2D): number {
    let culled = 0;
    this.particlePool.forEachActive((p) => {
      if (!isVisibleInViewport(p.x, p.y, p.size)) {
        culled++;
        return;
      }
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    });
    ctx.globalAlpha = 1;

    ctx.font = 'bold 8px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    this.textPool.forEachActive((ft) => {
      if (!isVisibleInViewport(ft.x, ft.y, 24)) {
        culled++;
        return;
      }
      ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
      ctx.fillStyle = '#1B1410';
      ctx.fillText(ft.text, Math.round(ft.x) + 1, Math.round(ft.y) + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    });
    ctx.globalAlpha = 1;
    return culled;
  }

  clear(): void {
    this.particlePool.releaseAll();
    this.textPool.releaseAll();
  }
}
