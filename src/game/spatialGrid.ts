import { WORLD_HEIGHT, WORLD_WIDTH, clamp } from './utils';

export interface SpatialEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
}

/**
 * Spatial Grid uniforme para acelerar consultas de proximidad y detección de colisiones
 * de O(N * M) a O(1) promedio por entidad.
 */
export class SpatialGrid<T extends SpatialEntity> {
  public readonly cellSize: number;
  public readonly cols: number;
  public readonly rows: number;
  private readonly cells: T[][];
  private queryStamp = 0;
  private readonly seenStamps = new Map<number, number>();

  constructor(
    width: number = WORLD_WIDTH,
    height: number = WORLD_HEIGHT,
    cellSize: number = 64
  ) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    const total = this.cols * this.rows;
    this.cells = Array.from({ length: total }, () => []);
  }

  clear(): void {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].length = 0;
    }
  }

  insert(entity: T): void {
    const minCol = clamp(Math.floor((entity.x - entity.radius) / this.cellSize), 0, this.cols - 1);
    const maxCol = clamp(Math.floor((entity.x + entity.radius) / this.cellSize), 0, this.cols - 1);
    const minRow = clamp(Math.floor((entity.y - entity.radius) / this.cellSize), 0, this.rows - 1);
    const maxRow = clamp(Math.floor((entity.y + entity.radius) / this.cellSize), 0, this.rows - 1);

    for (let row = minRow; row <= maxRow; row++) {
      const rowOffset = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        this.cells[rowOffset + col].push(entity);
      }
    }
  }

  queryRadius(x: number, y: number, radius: number, out: T[] = []): T[] {
    out.length = 0;
    this.queryStamp++;

    const minCol = clamp(Math.floor((x - radius) / this.cellSize), 0, this.cols - 1);
    const maxCol = clamp(Math.floor((x + radius) / this.cellSize), 0, this.cols - 1);
    const minRow = clamp(Math.floor((y - radius) / this.cellSize), 0, this.rows - 1);
    const maxRow = clamp(Math.floor((y + radius) / this.cellSize), 0, this.rows - 1);

    for (let row = minRow; row <= maxRow; row++) {
      const rowOffset = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        const bucket = this.cells[rowOffset + col];
        for (let i = 0; i < bucket.length; i++) {
          const entity = bucket[i];
          if (this.seenStamps.get(entity.id) !== this.queryStamp) {
            this.seenStamps.set(entity.id, this.queryStamp);
            out.push(entity);
          }
        }
      }
    }
    return out;
  }

  getOccupiedCellCounts(): number[] {
    return this.cells.map((c) => c.length);
  }
}
