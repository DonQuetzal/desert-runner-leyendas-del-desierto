import { AudioSettings, SoundEngine } from './audio';
import { BulletSystem } from './bullet';
import { resolveCollisions } from './collision';
import { Enemy, EnemySystem } from './enemy';
import { ParticleSystem } from './particles';
import { InputState, Player } from './player';
import { PowerUpSystem } from './powerups';
import {
  SCENARIOS,
  ScenarioId,
  TimeOfDay,
  buildOffscreenTerrain,
  getTimeOfDayForWave,
} from './scenarios';
import { SpatialGrid } from './spatialGrid';
import { getSpriteAtlas } from './sprites';
import { WORLD_HEIGHT, WORLD_WIDTH, clamp } from './utils';
import { WaveManager } from './waveManager';

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface ActiveBuffSnapshot {
  shotgun: number;
  rapid: number;
  boots: number;
  sheriff: number;
}

export interface EngineMetrics {
  fps: number;
  activeBullets: number;
  bulletPoolCapacity: number;
  activeParticles: number;
  particlePoolCapacity: number;
  enemiesCount: number;
  culledObjects: number;
  gridCols: number;
  gridRows: number;
  timeOfDay: TimeOfDay;
}

export interface GameSnapshot {
  state: GameState;
  score: number;
  highScore: number;
  bestWave: number;
  wave: number;
  kills: number;
  combo: number;
  hp: number;
  maxHp: number;
  lives: number;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  buffs: ActiveBuffSnapshot;
  scenarioName: string;
  audio: AudioSettings;
  showTechOverlay: boolean;
  metrics: EngineMetrics;
}

const HIGH_SCORE_KEY = 'desert_runner_highscore_v1';
const BEST_WAVE_KEY = 'desert_runner_best_wave_v1';

/**
 * Núcleo principal de Desert Runner: Leyendas del Desierto.
 * Gestiona ciclo principal (Delta Time), máquina de estados, Double Buffering,
 * Offscreen Canvas y coordinación de subsistemas.
 */
export class DesertRunnerGame {
  private readonly frontCanvas: HTMLCanvasElement;
  private readonly frontCtx: CanvasRenderingContext2D;

  // Double Buffering: lienzo oculto donde se compone todo el cuadro antes de presentarlo
  private readonly backBuffer: HTMLCanvasElement;
  private readonly backCtx: CanvasRenderingContext2D;

  // Offscreen Canvas para terreno estático y horizonte sonorense
  private offscreenTerrain: HTMLCanvasElement;
  private cachedTimeOfDay: TimeOfDay = 'afternoon';
  private scenarioId: ScenarioId = 'desierto_abierto';

  // Subsistemas independientes
  public readonly audio = new SoundEngine();
  private readonly player = new Player();
  private readonly enemySystem = new EnemySystem();
  private readonly bulletSystem = new BulletSystem();
  private readonly particleSystem = new ParticleSystem();
  private readonly powerUpSystem = new PowerUpSystem();
  private readonly waveManager = new WaveManager();
  private readonly spatialGrid = new SpatialGrid<Enemy>(WORLD_WIDTH, WORLD_HEIGHT, 64);

  private state: GameState = 'TITLE_MENU';
  private score = 0;
  private highScore = 0;
  private bestWave = 1;
  private kills = 0;
  private combo = 1;
  private comboTimer = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;

  private showTechOverlay = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private fpsAccumulator = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private lastSnapshotTime = 0;
  private lastCulledCount = 0;

  private readonly input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    shooting: false,
    mouseX: WORLD_WIDTH / 2 + 40,
    mouseY: WORLD_HEIGHT / 2,
  };

  private readonly onSnapshot: (snapshot: GameSnapshot) => void;

  // Listeners vinculados para limpieza segura
  private readonly handleKeyDownBound: (e: KeyboardEvent) => void;
  private readonly handleKeyUpBound: (e: KeyboardEvent) => void;
  private readonly handleMouseMoveBound: (e: MouseEvent) => void;
  private readonly handleMouseDownBound: (e: MouseEvent) => void;
  private readonly handleMouseUpBound: () => void;

  constructor(canvas: HTMLCanvasElement, onSnapshot: (snapshot: GameSnapshot) => void) {
    this.frontCanvas = canvas;
    this.frontCanvas.width = WORLD_WIDTH;
    this.frontCanvas.height = WORLD_HEIGHT;
    const fCtx = this.frontCanvas.getContext('2d');
    if (!fCtx) throw new Error('No se pudo inicializar el contexto 2D de Canvas.');
    this.frontCtx = fCtx;
    this.frontCtx.imageSmoothingEnabled = false;

    this.backBuffer = document.createElement('canvas');
    this.backBuffer.width = WORLD_WIDTH;
    this.backBuffer.height = WORLD_HEIGHT;
    this.backCtx = this.backBuffer.getContext('2d')!;
    this.backCtx.imageSmoothingEnabled = false;

    this.onSnapshot = onSnapshot;
    this.loadRecords();

    const scenario = SCENARIOS[this.scenarioId];
    this.offscreenTerrain = buildOffscreenTerrain(scenario, this.cachedTimeOfDay);

    this.handleKeyDownBound = (e) => this.onKeyDown(e);
    this.handleKeyUpBound = (e) => this.onKeyUp(e);
    this.handleMouseMoveBound = (e) => this.onMouseMove(e);
    this.handleMouseDownBound = (e) => this.onMouseDown(e);
    this.handleMouseUpBound = () => {
      this.input.shooting = false;
    };

    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    this.frontCanvas.addEventListener('mousemove', this.handleMouseMoveBound);
    this.frontCanvas.addEventListener('mousedown', this.handleMouseDownBound);
    window.addEventListener('mouseup', this.handleMouseUpBound);
  }

  private loadRecords(): void {
    try {
      const hs = localStorage.getItem(HIGH_SCORE_KEY);
      const bw = localStorage.getItem(BEST_WAVE_KEY);
      if (hs) this.highScore = Math.max(0, parseInt(hs, 10) || 0);
      if (bw) this.bestWave = Math.max(1, parseInt(bw, 10) || 1);
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  private saveRecords(): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
      localStorage.setItem(BEST_WAVE_KEY, String(this.bestWave));
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  startLoop(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    this.emitSnapshot(true);

    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      // Delta Time acotado para evitar saltos físicos al cambiar de pestaña
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      this.fpsAccumulator += rawDt;
      this.fpsFrames++;
      if (this.fpsAccumulator >= 0.5) {
        this.currentFps = Math.round(this.fpsFrames / this.fpsAccumulator);
        this.fpsAccumulator = 0;
        this.fpsFrames = 0;
      }

      if (this.state === 'PLAYING') {
        this.update(dt);
      }

      this.render();

      if (now - this.lastSnapshotTime > 85) {
        this.emitSnapshot(false);
        this.lastSnapshotTime = now;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.audio.stopMusic();
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    this.frontCanvas.removeEventListener('mousemove', this.handleMouseMoveBound);
    this.frontCanvas.removeEventListener('mousedown', this.handleMouseDownBound);
    window.removeEventListener('mouseup', this.handleMouseUpBound);
  }

  startNewGame(): void {
    this.audio.unlock();
    this.player.reset();
    this.enemySystem.clear();
    this.bulletSystem.clear();
    this.particleSystem.clear();
    this.powerUpSystem.clear();
    this.waveManager.reset();

    this.score = 0;
    this.kills = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.shakeTimer = 0;
    this.input.shooting = false;

    this.ensureTerrainForWave(1);
    this.state = 'PLAYING';
    this.waveManager.startWave(1, this.audio);
    this.emitSnapshot(true);
  }

  togglePause(): void {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.input.shooting = false;
      this.emitSnapshot(true);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTimestamp = performance.now();
      this.emitSnapshot(true);
    }
  }

  returnToTitle(): void {
    this.state = 'TITLE_MENU';
    this.input.shooting = false;
    this.emitSnapshot(true);
  }

  toggleSfx(): void {
    const next = !this.audio.getSettings().sfxEnabled;
    this.audio.setSfxEnabled(next);
    this.emitSnapshot(true);
  }

  toggleMusic(): void {
    this.audio.unlock();
    const next = !this.audio.getSettings().musicEnabled;
    this.audio.setMusicEnabled(next);
    this.emitSnapshot(true);
  }

  toggleTechOverlay(): void {
    this.showTechOverlay = !this.showTechOverlay;
    this.emitSnapshot(true);
  }

  private ensureTerrainForWave(wave: number): void {
    const targetTod = getTimeOfDayForWave(wave);
    if (targetTod !== this.cachedTimeOfDay) {
      this.cachedTimeOfDay = targetTod;
      this.offscreenTerrain = buildOffscreenTerrain(SCENARIOS[this.scenarioId], targetTod);
    }
  }

  private addScore(points: number): void {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveRecords();
    }
  }

  private update(dt: number): void {
    const scenario = SCENARIOS[this.scenarioId];

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
      }
    }

    this.player.update(
      dt,
      this.input,
      scenario.obstacles,
      this.bulletSystem,
      this.particleSystem,
      this.audio
    );

    this.enemySystem.update(
      dt,
      this.player.x,
      this.player.y,
      this.waveManager.wave,
      scenario.obstacles,
      this.bulletSystem,
      this.particleSystem,
      this.audio
    );

    this.bulletSystem.update(dt);
    this.powerUpSystem.update(dt, this.player.x, this.player.y);
    this.particleSystem.update(dt);

    resolveCollisions({
      player: this.player,
      enemySystem: this.enemySystem,
      bulletSystem: this.bulletSystem,
      powerUpSystem: this.powerUpSystem,
      particleSystem: this.particleSystem,
      audio: this.audio,
      obstacles: scenario.obstacles,
      grid: this.spatialGrid,
      callbacks: {
        onEnemyKilled: (enemy) => {
          this.kills++;
          const pts = Math.round(enemy.scoreValue * this.combo);
          this.addScore(pts);
          this.particleSystem.spawnText(enemy.x, enemy.y - 10, `+${pts}`, '#FEF08A');
          this.combo = Math.min(4, this.combo + 0.25);
          this.comboTimer = 2.6;
          if (enemy.type === 'boss') {
            this.triggerShake(0.28, 3);
          }
        },
        onScoreAdd: (pts) => {
          this.addScore(pts);
        },
        onPlayerLifeLost: () => {
          this.triggerShake(0.25, 3);
          this.combo = 1;
          this.emitSnapshot(true);
        },
        onGameOver: () => {
          this.triggerShake(0.35, 4);
          this.state = 'GAME_OVER';
          this.input.shooting = false;
          if (this.waveManager.wave > this.bestWave) {
            this.bestWave = this.waveManager.wave;
          }
          this.saveRecords();
          this.emitSnapshot(true);
        },
      },
    });

    if (this.state !== 'PLAYING') return;

    this.waveManager.update(dt, this.enemySystem, this.audio, (completedWave) => {
      const bonus = completedWave * 100;
      this.addScore(bonus);
      const nextWave = completedWave + 1;
      if (nextWave > this.bestWave) {
        this.bestWave = nextWave;
        this.saveRecords();
      }
      this.ensureTerrainForWave(nextWave);
    });
  }

  private triggerShake(duration: number, intensity: number): void {
    this.shakeTimer = duration;
    this.shakeIntensity = intensity;
  }

  private render(): void {
    const ctx = this.backCtx;
    const scenario = SCENARIOS[this.scenarioId];
    const atlas = getSpriteAtlas();

    ctx.save();
    if (this.shakeTimer > 0 && this.state === 'PLAYING') {
      const ox = Math.round((Math.random() * 2 - 1) * this.shakeIntensity);
      const oy = Math.round((Math.random() * 2 - 1) * this.shakeIntensity);
      ctx.translate(ox, oy);
    }

    // 1. Blit único del terreno estático desde el Offscreen Canvas
    ctx.drawImage(this.offscreenTerrain, 0, 0);

    // 2. Obstáculos sólidos ordenados por Y para profundidad 2D
    for (const obs of scenario.obstacles) {
      if (!obs.solid) continue;
      if (obs.kind === 'sahuaro') {
        ctx.drawImage(atlas.sahuaro, Math.round(obs.x - 12), Math.round(obs.y - 22), 24, 32);
      } else if (obs.kind === 'rock') {
        ctx.drawImage(atlas.rock, Math.round(obs.x - 12), Math.round(obs.y - 9), 24, 18);
      }
    }

    // 3. Potenciadores, jugador, enemigos, balas y partículas (con Culling)
    let culled = 0;
    culled += this.powerUpSystem.render(ctx);
    this.player.render(ctx);
    culled += this.enemySystem.render(ctx);
    culled += this.bulletSystem.render(ctx);
    culled += this.particleSystem.render(ctx);
    this.lastCulledCount = culled;

    // 4. Iluminación nocturna sutil a partir de la oleada 5
    if (this.cachedTimeOfDay === 'night') {
      const grad = ctx.createRadialGradient(
        this.player.x,
        this.player.y,
        48,
        this.player.x,
        this.player.y,
        360
      );
      grad.addColorStop(0, 'rgba(255, 220, 150, 0)');
      grad.addColorStop(1, 'rgba(10, 12, 28, 0.36)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    // 5. Barra de salud del Jefe activo
    const boss = this.enemySystem.getActiveBoss();
    if (boss && this.state === 'PLAYING') {
      const barW = 240;
      const bx = Math.round((WORLD_WIDTH - barW) / 2);
      const by = 58;
      ctx.fillStyle = 'rgba(20, 15, 12, 0.85)';
      ctx.fillRect(bx - 4, by - 13, barW + 8, 22);
      ctx.font = 'bold 8px "Silkscreen", monospace';
      ctx.fillStyle = '#FDBA74';
      ctx.textAlign = 'center';
      ctx.fillText(boss.bossName ?? 'Jefe del Desierto', WORLD_WIDTH / 2, by - 4);
      ctx.fillStyle = '#3B1D19';
      ctx.fillRect(bx, by, barW, 5);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(bx, by, Math.max(0, Math.round(barW * (boss.hp / boss.maxHp))), 5);
    }

    // 6. Anuncio breve de oleada dentro del lienzo
    if (this.waveManager.bannerTimer > 0 && this.state === 'PLAYING') {
      const alpha = Math.min(1, this.waveManager.bannerTimer * 1.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(20, 15, 12, 0.82)';
      ctx.fillRect(WORLD_WIDTH / 2 - 145, 86, 290, 38);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1;
      ctx.strokeRect(WORLD_WIDTH / 2 - 145, 86, 290, 38);
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px "Silkscreen", monospace';
      ctx.fillStyle = '#FDE68A';
      ctx.fillText(this.waveManager.bannerTitle, WORLD_WIDTH / 2, 103);
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#E5D3B3';
      ctx.fillText(this.waveManager.bannerSubtitle, WORLD_WIDTH / 2, 117);
      ctx.restore();
    }

    // 7. Visualización académica opcional del Spatial Grid
    if (this.showTechOverlay) {
      this.renderSpatialGridDebug(ctx);
    }

    // 8. Mira de puntería pixel art en modo juego
    if (this.state === 'PLAYING') {
      const mx = Math.round(this.input.mouseX);
      const my = Math.round(this.input.mouseY);
      ctx.fillStyle = '#1B1410';
      ctx.fillRect(mx - 6, my - 1, 4, 3);
      ctx.fillRect(mx + 3, my - 1, 4, 3);
      ctx.fillRect(mx - 1, my - 6, 3, 4);
      ctx.fillRect(mx - 1, my + 3, 3, 4);

      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(mx - 5, my, 3, 1);
      ctx.fillRect(mx + 3, my, 3, 1);
      ctx.fillRect(mx, my - 5, 1, 3);
      ctx.fillRect(mx, my + 3, 1, 3);
    }

    ctx.restore();

    // Double Buffering: presentación atómica del backBuffer al canvas visible
    this.frontCtx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.frontCtx.drawImage(this.backBuffer, 0, 0);
  }

  private renderSpatialGridDebug(ctx: CanvasRenderingContext2D): void {
    const cs = this.spatialGrid.cellSize;
    const counts = this.spatialGrid.getOccupiedCellCounts();
    ctx.save();
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    for (let r = 0; r < this.spatialGrid.rows; r++) {
      for (let c = 0; c < this.spatialGrid.cols; c++) {
        const count = counts[r * this.spatialGrid.cols + c];
        if (count > 0) {
          ctx.fillStyle = 'rgba(217, 107, 39, 0.22)';
          ctx.fillRect(c * cs, r * cs, cs, cs);
          ctx.fillStyle = '#FDE047';
          ctx.fillText(String(count), c * cs + 4, r * cs + 11);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * cs, r * cs, cs, cs);
      }
    }
    ctx.restore();
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      if (this.state === 'PLAYING') {
        e.preventDefault();
      }
    }

    if (key === 'w' || e.key === 'ArrowUp') this.input.up = true;
    if (key === 's' || e.key === 'ArrowDown') this.input.down = true;
    if (key === 'a' || e.key === 'ArrowLeft') this.input.left = true;
    if (key === 'd' || e.key === 'ArrowRight') this.input.right = true;

    if (key === 'r' && this.state === 'PLAYING') {
      this.player.triggerReload(this.audio, this.particleSystem);
    }

    if ((key === 'p' || e.key === 'Escape') && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
      this.togglePause();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'w' || e.key === 'ArrowUp') this.input.up = false;
    if (key === 's' || e.key === 'ArrowDown') this.input.down = false;
    if (key === 'a' || e.key === 'ArrowLeft') this.input.left = false;
    if (key === 'd' || e.key === 'ArrowRight') this.input.right = false;
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.frontCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.input.mouseX = clamp(((e.clientX - rect.left) / rect.width) * WORLD_WIDTH, 0, WORLD_WIDTH);
    this.input.mouseY = clamp(((e.clientY - rect.top) / rect.height) * WORLD_HEIGHT, 0, WORLD_HEIGHT);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.audio.unlock();
    this.onMouseMove(e);
    if (this.state === 'PLAYING') {
      this.input.shooting = true;
    }
  }

  private emitSnapshot(force: boolean): void {
    if (force) {
      this.lastSnapshotTime = performance.now();
    }
    this.onSnapshot({
      state: this.state,
      score: this.score,
      highScore: this.highScore,
      bestWave: this.bestWave,
      wave: this.waveManager.wave,
      kills: this.kills,
      combo: Number(this.combo.toFixed(2)),
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      lives: this.player.lives,
      ammo: this.player.ammo,
      maxAmmo: this.player.maxAmmo,
      reloading: this.player.reloadTimer > 0,
      buffs: {
        shotgun: Math.max(0, Math.ceil(this.player.shotgunTimer)),
        rapid: Math.max(0, Math.ceil(this.player.rapidTimer)),
        boots: Math.max(0, Math.ceil(this.player.bootsTimer)),
        sheriff: Math.max(0, Math.ceil(this.player.sheriffTimer)),
      },
      scenarioName: SCENARIOS[this.scenarioId].name,
      audio: this.audio.getSettings(),
      showTechOverlay: this.showTechOverlay,
      metrics: {
        fps: this.currentFps,
        activeBullets: this.bulletSystem.pool.activeCount,
        bulletPoolCapacity: this.bulletSystem.pool.capacity,
        activeParticles: this.particleSystem.particlePool.activeCount,
        particlePoolCapacity: this.particleSystem.particlePool.capacity,
        enemiesCount: this.enemySystem.enemies.length,
        culledObjects: this.lastCulledCount,
        gridCols: this.spatialGrid.cols,
        gridRows: this.spatialGrid.rows,
        timeOfDay: this.cachedTimeOfDay,
      },
    });
  }
}
