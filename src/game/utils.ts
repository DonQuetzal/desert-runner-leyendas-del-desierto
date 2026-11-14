export const WORLD_WIDTH = 640;
export const WORLD_HEIGHT = 400;

export const ARENA_BOUNDS = {
  left: 22,
  top: 52,
  right: 618,
  bottom: 380,
} as const;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Poolable {
  active: boolean;
  reset(): void;
}

/**
 * Object Pool genérico para evitar creación/recolección constante de objetos
 * (proyectiles, partículas, textos flotantes) durante oleadas intensas.
 */
export class ObjectPool<T extends Poolable> {
  private readonly items: T[] = [];
  private _activeCount = 0;

  constructor(
    private readonly factory: () => T,
    public readonly capacity: number
  ) {
    for (let i = 0; i < capacity; i++) {
      this.items.push(this.factory());
    }
  }

  acquire(): T | null {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (!item.active) {
        item.reset();
        item.active = true;
        this._activeCount++;
        return item;
      }
    }
    return null;
  }

  release(item: T): void {
    if (item.active) {
      item.active = false;
      this._activeCount = Math.max(0, this._activeCount - 1);
    }
  }

  releaseAll(): void {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].active = false;
    }
    this._activeCount = 0;
  }

  forEachActive(callback: (item: T) => void): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.active) {
        callback(item);
      }
    }
  }

  get activeCount(): number {
    return this._activeCount;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function normalize(x: number, y: number): Vec2 {
  const len = Math.hypot(x, y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, maxInclusive: number): number {
  return Math.floor(randRange(min, maxInclusive + 1));
}

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Culling: determina si una entidad con centro (x, y) y radio r es visible
 * dentro del área del viewport lógico (con margen opcional).
 */
export function isVisibleInViewport(
  x: number,
  y: number,
  radius: number,
  viewWidth: number = WORLD_WIDTH,
  viewHeight: number = WORLD_HEIGHT,
  margin: number = 16
): boolean {
  return (
    x + radius >= -margin &&
    x - radius <= viewWidth + margin &&
    y + radius >= -margin &&
    y - radius <= viewHeight + margin
  );
}
