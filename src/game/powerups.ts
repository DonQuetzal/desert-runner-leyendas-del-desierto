import { getSpriteAtlas } from './sprites';
import { isVisibleInViewport, randRange } from './utils';

export type PowerUpType =
  | 'coin'
  | 'shotgun'
  | 'rapid'
  | 'boots'
  | 'sheriff'
  | 'canteen'
  | 'life';

export interface PowerUpItem {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: PowerUpType;
  life: number;
  maxLife: number;
  bobPhase: number;
}

export const POWERUP_LABELS: Record<PowerUpType, { title: string; color: string }> = {
  coin: { title: '+50 PTS', color: '#FACC15' },
  shotgun: { title: 'ESCOPETA', color: '#FB923C' },
  rapid: { title: 'ABANICO RÁPIDO', color: '#FDE047' },
  boots: { title: 'ESPUELAS', color: '#60A5FA' },
  sheriff: { title: 'ESTRELLA SHERIFF', color: '#FBBF24' },
  canteen: { title: '+35 SALUD', color: '#38BDF8' },
  life: { title: '+1 VIDA', color: '#4ADE80' },
};

export class PowerUpSystem {
  public items: PowerUpItem[] = [];
  private nextId = 1;

  spawnRandomDrop(x: number, y: number, guaranteed: boolean = false): void {
    const roll = Math.random();
    if (!guaranteed && roll > 0.34) return;

    const pickRoll = Math.random();
    let type: PowerUpType = 'coin';
    if (pickRoll < 0.36) type = 'coin';
    else if (pickRoll < 0.52) type = 'canteen';
    else if (pickRoll < 0.68) type = 'shotgun';
    else if (pickRoll < 0.82) type = 'rapid';
    else if (pickRoll < 0.92) type = 'boots';
    else if (pickRoll < 0.97) type = 'sheriff';
    else type = 'life';

    this.items.push({
      id: this.nextId++,
      x,
      y,
      radius: 10,
      type,
      life: 11,
      maxLife: 11,
      bobPhase: randRange(0, Math.PI * 2),
    });
  }

  spawnSpecific(x: number, y: number, type: PowerUpType): void {
    this.items.push({
      id: this.nextId++,
      x,
      y,
      radius: 10,
      type,
      life: 13,
      maxLife: 13,
      bobPhase: randRange(0, Math.PI * 2),
    });
  }

  update(dt: number, playerX: number, playerY: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      item.bobPhase += dt * 4.5;

      // Imán suave cuando el vaquero está cerca
      const dx = playerX - item.x;
      const dy = playerY - item.y;
      const d = Math.hypot(dx, dy);
      if (d < 56 && d > 1) {
        item.x += (dx / d) * 85 * dt;
        item.y += (dy / d) * 85 * dt;
      }

      if (item.life <= 0) {
        this.items.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): number {
    const atlas = getSpriteAtlas();
    let culled = 0;

    for (const item of this.items) {
      if (!isVisibleInViewport(item.x, item.y, 16)) {
        culled++;
        continue;
      }

      // Parpadeo de advertencia antes de desaparecer
      if (item.life < 2.5 && Math.floor(item.life * 10) % 2 === 0) {
        continue;
      }

      const bobOffset = Math.sin(item.bobPhase) * 2.2;
      const sprite = atlas.pickups[item.type];
      const drawW = sprite.width * 1.35;
      const drawH = sprite.height * 1.35;

      // Halo cálido sutil
      ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
      ctx.beginPath();
      ctx.arc(Math.round(item.x), Math.round(item.y + 2), 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(
        sprite,
        Math.round(item.x - drawW / 2),
        Math.round(item.y - drawH / 2 + bobOffset),
        Math.round(drawW),
        Math.round(drawH)
      );
    }

    return culled;
  }

  clear(): void {
    this.items.length = 0;
  }
}
