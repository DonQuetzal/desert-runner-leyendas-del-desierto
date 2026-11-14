import { ARENA_BOUNDS, ObjectPool, Poolable, isVisibleInViewport } from './utils';

export type BulletOwner = 'player' | 'enemy';

export class Bullet implements Poolable {
  active = false;
  x = 0;
  y = 0;
  prevX = 0;
  prevY = 0;
  vx = 0;
  vy = 0;
  radius = 3;
  damage = 1;
  rangeRemaining = 360;
  owner: BulletOwner = 'player';
  color = '#FEF08A';
  piercing = false;

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 3;
    this.damage = 1;
    this.rangeRemaining = 360;
    this.owner = 'player';
    this.color = '#FEF08A';
    this.piercing = false;
  }
}

export class BulletSystem {
  public readonly pool = new ObjectPool(() => new Bullet(), 180);

  spawn(params: {
    x: number;
    y: number;
    angle: number;
    speed: number;
    damage: number;
    range: number;
    owner: BulletOwner;
    radius?: number;
    color?: string;
    piercing?: boolean;
  }): Bullet | null {
    const b = this.pool.acquire();
    if (!b) return null;
    b.x = params.x;
    b.y = params.y;
    b.prevX = params.x;
    b.prevY = params.y;
    b.vx = Math.cos(params.angle) * params.speed;
    b.vy = Math.sin(params.angle) * params.speed;
    b.damage = params.damage;
    b.rangeRemaining = params.range;
    b.owner = params.owner;
    b.radius = params.radius ?? (params.owner === 'player' ? 3 : 3.5);
    b.color = params.color ?? (params.owner === 'player' ? '#FEF08A' : '#F87171');
    b.piercing = params.piercing ?? false;
    return b;
  }

  update(dt: number): void {
    this.pool.forEachActive((b) => {
      b.prevX = b.x;
      b.prevY = b.y;
      const dx = b.vx * dt;
      const dy = b.vy * dt;
      b.x += dx;
      b.y += dy;
      b.rangeRemaining -= Math.hypot(dx, dy);

      if (
        b.rangeRemaining <= 0 ||
        b.x < ARENA_BOUNDS.left - 8 ||
        b.x > ARENA_BOUNDS.right + 8 ||
        b.y < ARENA_BOUNDS.top - 8 ||
        b.y > ARENA_BOUNDS.bottom + 8
      ) {
        this.pool.release(b);
      }
    });
  }

  render(ctx: CanvasRenderingContext2D): number {
    let culled = 0;
    this.pool.forEachActive((b) => {
      if (!isVisibleInViewport(b.x, b.y, b.radius + 4)) {
        culled++;
        return;
      }

      // Estela corta retro
      ctx.strokeStyle = b.owner === 'player' ? 'rgba(251, 191, 36, 0.45)' : 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.round(b.prevX), Math.round(b.prevY));
      ctx.lineTo(Math.round(b.x), Math.round(b.y));
      ctx.stroke();

      // Proyectil pixelado con contorno oscuro
      const r = Math.ceil(b.radius);
      const px = Math.round(b.x - r);
      const py = Math.round(b.y - r);
      ctx.fillStyle = '#1B1410';
      ctx.fillRect(px - 1, py - 1, r * 2 + 2, r * 2 + 2);
      ctx.fillStyle = b.color;
      ctx.fillRect(px, py, r * 2, r * 2);
    });
    return culled;
  }

  clear(): void {
    this.pool.releaseAll();
  }
}
