import { SoundEngine } from './audio';
import { EnemySystem, EnemyType } from './enemy';
import { ARENA_BOUNDS, pickRandom, randRange } from './utils';

export class WaveManager {
  public wave = 1;
  public toSpawn = 0;
  public spawnTimer = 0;
  public intermissionTimer = 0;
  public bannerTitle = '';
  public bannerSubtitle = '';
  public bannerTimer = 0;
  private bossSpawnedThisWave = false;

  reset(): void {
    this.wave = 1;
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.intermissionTimer = 0;
    this.bannerTitle = '';
    this.bannerSubtitle = '';
    this.bannerTimer = 0;
    this.bossSpawnedThisWave = false;
  }

  startWave(waveNumber: number, audio: SoundEngine): void {
    this.wave = waveNumber;
    const isBoss = waveNumber % 5 === 0;
    this.toSpawn = isBoss ? 6 + waveNumber : 7 + waveNumber * 3;
    this.spawnTimer = 0.6;
    this.intermissionTimer = 0;
    this.bossSpawnedThisWave = false;

    const titles = [
      'Amanecer en Sonora',
      'Senda del Cascabel',
      'Polvo de Jabalíes',
      'Atardecer Rojo',
      'Duelo Bajo las Estrellas',
    ];
    this.bannerTitle = isBoss ? `Oleada ${waveNumber} · ¡Jefe del Desierto!` : `Oleada ${waveNumber}`;
    this.bannerSubtitle = isBoss
      ? 'Derrota al líder bandido y sus secuaces'
      : titles[Math.min(titles.length - 1, waveNumber - 1)] ?? 'Noche Estrellada en Sonora';
    this.bannerTimer = 2.6;

    audio.playWaveStart(isBoss);
  }

  update(
    dt: number,
    enemySystem: EnemySystem,
    audio: SoundEngine,
    onWaveCleared: (completedWave: number) => void
  ): void {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
    }

    if (this.intermissionTimer > 0) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) {
        this.startWave(this.wave + 1, audio);
      }
      return;
    }

    // Aparición progresiva de enemigos
    if (this.toSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const isBossWave = this.wave % 5 === 0;
        if (isBossWave && !this.bossSpawnedThisWave) {
          this.bossSpawnedThisWave = true;
          enemySystem.spawn('boss', 320, ARENA_BOUNDS.top + 8, this.wave);
          this.toSpawn--;
        } else {
          const type = this.chooseEnemyType();
          const pos = this.pickPerimeterSpawn();
          enemySystem.spawn(type, pos.x, pos.y, this.wave);
          this.toSpawn--;
        }

        const baseInterval = Math.max(0.36, 1.18 - this.wave * 0.065);
        this.spawnTimer = baseInterval * randRange(0.75, 1.15);
      }
    } else if (enemySystem.enemies.length === 0) {
      // Oleada completada
      onWaveCleared(this.wave);
      this.intermissionTimer = 2.2;
      this.bannerTitle = `¡Oleada ${this.wave} Superada!`;
      this.bannerSubtitle = `Bono de supervivencia +${this.wave * 100} pts`;
      this.bannerTimer = 2.0;
    }
  }

  private chooseEnemyType(): EnemyType {
    const pool: EnemyType[] = ['bandit', 'coyote'];
    if (this.wave >= 2) pool.push('rattlesnake');
    if (this.wave >= 3) pool.push('javelina');
    if (this.wave >= 4) pool.push('bandit', 'coyote');
    return pickRandom(pool);
  }

  private pickPerimeterSpawn(): { x: number; y: number } {
    const edge = Math.floor(Math.random() * 4);
    const pad = 6;
    switch (edge) {
      case 0: // Arriba
        return {
          x: randRange(ARENA_BOUNDS.left + 40, ARENA_BOUNDS.right - 40),
          y: ARENA_BOUNDS.top + pad,
        };
      case 1: // Abajo
        return {
          x: randRange(ARENA_BOUNDS.left + 40, ARENA_BOUNDS.right - 40),
          y: ARENA_BOUNDS.bottom - pad,
        };
      case 2: // Izquierda
        return {
          x: ARENA_BOUNDS.left + pad,
          y: randRange(ARENA_BOUNDS.top + 35, ARENA_BOUNDS.bottom - 35),
        };
      default: // Derecha
        return {
          x: ARENA_BOUNDS.right - pad,
          y: randRange(ARENA_BOUNDS.top + 35, ARENA_BOUNDS.bottom - 35),
        };
    }
  }
}
