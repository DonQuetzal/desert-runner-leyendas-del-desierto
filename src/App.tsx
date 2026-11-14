import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Grid,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';
import { DesertRunnerGame, GameSnapshot, mountDesertRunner } from './game/main';
import { SCENARIOS } from './game/scenarios';

const INITIAL_SNAPSHOT: GameSnapshot = {
  state: 'TITLE_MENU',
  score: 0,
  highScore: 0,
  bestWave: 1,
  wave: 1,
  kills: 0,
  combo: 1,
  hp: 100,
  maxHp: 100,
  lives: 3,
  ammo: 6,
  maxAmmo: 6,
  reloading: false,
  buffs: { shotgun: 0, rapid: 0, boots: 0, sheriff: 0 },
  scenarioName: SCENARIOS.desierto_abierto.name,
  audio: { sfxEnabled: true, musicEnabled: true, volume: 0.45 },
  showTechOverlay: false,
  metrics: {
    fps: 60,
    activeBullets: 0,
    bulletPoolCapacity: 180,
    activeParticles: 0,
    particlePoolCapacity: 260,
    enemiesCount: 0,
    culledObjects: 0,
    gridCols: 10,
    gridRows: 7,
    timeOfDay: 'afternoon',
  },
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<DesertRunnerGame | null>(null);
  const [snap, setSnap] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const instance = mountDesertRunner(canvas, (next) => {
      setSnap(next);
    });
    gameRef.current = instance;
    return () => {
      instance.destroy();
      gameRef.current = null;
    };
  }, []);

  const handleStart = () => {
    setShowInstructions(false);
    gameRef.current?.startNewGame();
  };

  const handlePauseToggle = () => {
    gameRef.current?.togglePause();
  };

  const handleReturnTitle = () => {
    setShowInstructions(false);
    gameRef.current?.returnToTitle();
  };

  const activeBuffText = [
    snap.buffs.shotgun > 0 ? `Escopeta ${snap.buffs.shotgun}s` : '',
    snap.buffs.rapid > 0 ? `Abanico ${snap.buffs.rapid}s` : '',
    snap.buffs.boots > 0 ? `Espuelas ${snap.buffs.boots}s` : '',
    snap.buffs.sheriff > 0 ? `Sheriff ${snap.buffs.sheriff}s` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const isNewRecord = snap.state === 'GAME_OVER' && snap.score > 0 && snap.score >= snap.highScore;

  return (
    <div className="min-h-screen bg-[#140F0C] text-[#F5EAD8] flex flex-col">
      {/* Barra superior de 3 zonas */}
      <header className="border-b border-[#E8C184]/15 bg-[#1B1410]">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={handleReturnTitle}
            className="font-pixel text-base sm:text-lg tracking-tight text-[#F6D399] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Desert Runner
          </button>

          <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-[#D6C3A5]">
            <button
              type="button"
              onClick={() => {
                if (snap.state === 'PLAYING') {
                  gameRef.current?.togglePause();
                }
                setShowInstructions((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Instrucciones</span>
            </button>

            <button
              type="button"
              onClick={() => gameRef.current?.toggleSfx()}
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                snap.audio.sfxEnabled ? 'text-[#F5EAD8] hover:text-white' : 'text-[#8C7A64] hover:text-[#D6C3A5]'
              }`}
              title="Activar o silenciar efectos de sonido"
            >
              {snap.audio.sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">Efectos</span>
            </button>

            <button
              type="button"
              onClick={() => gameRef.current?.toggleMusic()}
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                snap.audio.musicEnabled ? 'text-[#F5EAD8] hover:text-white' : 'text-[#8C7A64] hover:text-[#D6C3A5]'
              }`}
              title="Activar o silenciar música western"
            >
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline">Música</span>
            </button>

            <button
              type="button"
              onClick={() => gameRef.current?.toggleTechOverlay()}
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                snap.showTechOverlay ? 'text-[#F59E0B]' : 'text-[#A6937C] hover:text-white'
              }`}
              title="Mostrar malla espacial y métricas de optimización"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden md:inline">Malla espacial</span>
            </button>
          </nav>

          <div className="shrink-0">
            {snap.state === 'PLAYING' || snap.state === 'PAUSED' ? (
              <button
                type="button"
                onClick={handlePauseToggle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#2E221A] border border-[#E8C184]/25 text-xs font-semibold text-[#F5EAD8] hover:bg-[#3A2B21] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {snap.state === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{snap.state === 'PAUSED' ? 'Reanudar' : 'Pausa'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#D96B27] hover:bg-[#E07A38] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jugar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Área principal del juego */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-5">
        <div className="w-full max-w-[1040px] flex flex-col gap-3">
          {/* HUD durante la partida (y vista previa limpia) */}
          <section
            aria-label="Marcador de la partida"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-2.5 rounded-lg bg-[#1F1712] border border-[#E8C184]/15"
          >
            <div className="flex flex-col">
              <span className="text-[11px] text-[#B39F86]">Puntuación · Récord</span>
              <div className="flex items-baseline gap-2 font-mono-tabular">
                <span className="text-lg font-bold text-[#FACC15]">{snap.score}</span>
                <span className="text-xs text-[#9E8B74]">/ {snap.highScore}</span>
                {snap.combo > 1 && (
                  <span className="text-xs font-semibold text-[#FB923C]">x{snap.combo}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] text-[#B39F86]">Oleada · Bajas</span>
              <div className="flex items-baseline gap-2 font-mono-tabular">
                <span className="text-lg font-bold text-[#F5EAD8]">#{snap.wave}</span>
                <span className="text-xs text-[#9E8B74]">· {snap.kills} bajas</span>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#B39F86]">Salud ({snap.hp}/{snap.maxHp})</span>
                <span className="inline-flex items-center gap-1 text-[#F5EAD8] font-mono-tabular">
                  {Array.from({ length: snap.lives }).map((_, idx) => (
                    <Heart key={idx} className="w-3.5 h-3.5 fill-[#DC2626] text-[#DC2626]" />
                  ))}
                  {snap.lives === 0 && <span className="text-[#EF4444]">0 vidas</span>}
                </span>
              </div>
              <div className="h-2 w-full rounded-sm bg-[#33261E] overflow-hidden">
                <div
                  className="h-full bg-[#DC2626] transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, (snap.hp / snap.maxHp) * 100))}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-[11px] text-[#B39F86]">
                {snap.reloading ? 'Recargando revólver...' : 'Tambor · Mejora'}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1" aria-label={`Munición ${snap.ammo} de ${snap.maxAmmo}`}>
                  {Array.from({ length: snap.maxAmmo }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-3 rounded-[1px] ${
                        i < snap.ammo ? 'bg-[#FACC15]' : 'bg-[#3D2E24]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-[#FDBA74] truncate">
                  {activeBuffText || 'Revólver .45'}
                </span>
              </div>
            </div>
          </section>

          {/* Lienzo principal del videojuego 16:10 */}
          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-[#E8C184]/25 bg-[#1B1410] shadow-2xl">
            <canvas
              ref={canvasRef}
              className={`w-full h-full block pixelated ${
                snap.state === 'PLAYING' ? 'cursor-none' : 'cursor-default'
              }`}
            />

            {/* Pantalla de inicio */}
            {snap.state === 'TITLE_MENU' && !showInstructions && (
              <div className="absolute inset-0 bg-gradient-to-t from-[#140F0C]/92 via-[#140F0C]/75 to-[#140F0C]/65 flex items-center justify-center p-6">
                <div className="max-w-lg w-full text-center flex flex-col items-center gap-5">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-[#E8C184]">
                      Sonora, México · Arcade 16 bits
                    </p>
                    <h1 className="font-pixel text-3xl sm:text-4xl text-[#FDE68A] tracking-tight leading-tight text-balance">
                      DESERT RUNNER
                    </h1>
                    <p className="font-pixel text-sm sm:text-base text-[#D96B27]">
                      Leyendas del Desierto
                    </p>
                  </div>

                  <p className="text-sm text-[#E2D3BE] leading-relaxed max-w-md">
                    Encarna a un vaquero sonorense y resiste oleadas de bandidos, coyotes,
                    jabalíes y serpientes de cascabel bajo el sol y las estrellas de Sonora.
                  </p>

                  {/* Escenario activo + arquitectura preparada */}
                  <div className="w-full max-w-md border-y border-[#E8C184]/20 py-3 text-left text-xs text-[#CBB79B] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F5EAD8]">
                        1. {SCENARIOS.desierto_abierto.name}
                      </span>
                      <span className="text-[#F59E0B]">Escenario activo</span>
                    </div>
                    <div className="flex items-center justify-between text-[#8F7C66]">
                      <span>2. {SCENARIOS.pueblo_abandonado.name}</span>
                      <span>En arquitectura</span>
                    </div>
                    <div className="flex items-center justify-between text-[#8F7C66]">
                      <span>3. {SCENARIOS.canon_rocoso.name}</span>
                      <span>En arquitectura</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleStart}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#D96B27] hover:bg-[#E67B35] text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                      <span>Jugar ahora</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowInstructions(true)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[#2A1F18] hover:bg-[#382920] border border-[#E8C184]/25 text-sm font-medium text-[#F5EAD8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Controles y reglas</span>
                    </button>
                  </div>

                  <div className="text-xs text-[#B39F86] font-mono-tabular">
                    Récord actual: {snap.highScore} pts · Mejor oleada: #{snap.bestWave}
                  </div>
                </div>
              </div>
            )}

            {/* Pantalla de instrucciones y controles */}
            {showInstructions && (
              <div className="absolute inset-0 bg-[#140F0C]/92 flex items-center justify-center p-5 overflow-y-auto">
                <div className="max-w-xl w-full bg-[#1F1712] border border-[#E8C184]/25 rounded-lg p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[#E8C184]/15 pb-3">
                    <h2 className="font-pixel text-lg text-[#FDE68A]">
                      Instrucciones y Controles
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowInstructions(false)}
                      className="px-3 py-1.5 rounded bg-[#2E221A] hover:bg-[#3B2C22] text-xs font-medium text-[#F5EAD8] cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-[#DFCDBA]">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-[#F6D399]">Controles del Vaquero</h3>
                      <p>
                        <strong className="text-white">WASD o Flechas:</strong> Movimiento en 8 direcciones.
                      </p>
                      <p>
                        <strong className="text-white">Mouse + Clic izquierdo:</strong> Apuntar y disparar el revólver.
                      </p>
                      <p>
                        <strong className="text-white">Tecla R:</strong> Recarga manual del tambor (6 tiros).
                      </p>
                      <p>
                        <strong className="text-white">Tecla P o Esc:</strong> Pausar o reanudar partida.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-[#F6D399]">Enemigos y Potenciadores</h3>
                      <p>
                        <strong className="text-white">Fauna y bandidos:</strong> Coyotes veloces, jabalíes que embisten, cascabeles venenosas, bandidos armados y Jefes cada 5 oleadas.
                      </p>
                      <p>
                        <strong className="text-white">Mejoras temporales:</strong> Escopeta de perdigones, abanico rápido, espuelas veloces y estrella de Sheriff invulnerable.
                      </p>
                      <p>
                        <strong className="text-white">Supervivencia:</strong> Cantimploras curan salud y los sombreros dorados otorgan vida extra.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-[#E8C184]/15">
                    {snap.state === 'TITLE_MENU' ? (
                      <button
                        type="button"
                        onClick={handleStart}
                        className="px-5 py-2.5 rounded-md bg-[#D96B27] hover:bg-[#E67B35] text-xs font-semibold text-white cursor-pointer"
                      >
                        Comenzar partida
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowInstructions(false);
                          if (snap.state === 'PAUSED') handlePauseToggle();
                        }}
                        className="px-5 py-2.5 rounded-md bg-[#D96B27] hover:bg-[#E67B35] text-xs font-semibold text-white cursor-pointer"
                      >
                        Volver al juego
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Menú de pausa */}
            {snap.state === 'PAUSED' && !showInstructions && (
              <div className="absolute inset-0 bg-[#140F0C]/80 flex items-center justify-center p-6">
                <div className="max-w-xs w-full bg-[#1F1712] border border-[#E8C184]/25 rounded-lg p-6 text-center flex flex-col gap-4">
                  <h2 className="font-pixel text-xl text-[#FDE68A]">Pausa</h2>
                  <p className="text-xs text-[#CBB79B]">
                    Oleada #{snap.wave} · Puntuación {snap.score}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={handlePauseToggle}
                      className="w-full py-2.5 px-4 rounded-md bg-[#D96B27] hover:bg-[#E67B35] text-sm font-semibold text-white transition-colors cursor-pointer"
                    >
                      Reanudar
                    </button>
                    <button
                      type="button"
                      onClick={handleStart}
                      className="w-full py-2.5 px-4 rounded-md bg-[#2E221A] hover:bg-[#3B2C22] border border-[#E8C184]/20 text-sm font-medium text-[#F5EAD8] transition-colors cursor-pointer"
                    >
                      Reiniciar partida
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnTitle}
                      className="w-full py-2 px-4 text-xs font-medium text-[#B39F86] hover:text-white transition-colors cursor-pointer"
                    >
                      Volver al menú principal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pantalla de Game Over */}
            {snap.state === 'GAME_OVER' && !showInstructions && (
              <div className="absolute inset-0 bg-[#140F0C]/88 flex items-center justify-center p-6">
                <div className="max-w-sm w-full bg-[#1F1712] border border-[#E8C184]/30 rounded-lg p-6 text-center flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-pixel text-2xl text-[#F87171]">Fin de la Partida</h2>
                    {isNewRecord && (
                      <p className="text-xs font-semibold text-[#FACC15]">
                        ¡Nuevo récord del desierto!
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#E8C184]/15 text-left font-mono-tabular">
                    <div>
                      <span className="block text-[11px] text-[#B39F86]">Puntuación final</span>
                      <span className="text-lg font-bold text-[#FACC15]">{snap.score}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#B39F86]">Récord histórico</span>
                      <span className="text-lg font-bold text-[#F5EAD8]">{snap.highScore}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#B39F86]">Oleada alcanzada</span>
                      <span className="text-base font-semibold text-[#F5EAD8]">#{snap.wave}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#B39F86]">Enemigos derrotados</span>
                      <span className="text-base font-semibold text-[#F5EAD8]">{snap.kills}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={handleStart}
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md bg-[#D96B27] hover:bg-[#E67B35] text-sm font-semibold text-white transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reiniciar partida</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnTitle}
                      className="w-full py-2 px-4 text-xs font-medium text-[#B39F86] hover:text-white transition-colors cursor-pointer"
                    >
                      Menú principal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Barra académica opcional activada sólo con "Malla espacial" */}
          {snap.showTechOverlay && (
            <div className="px-4 py-2.5 rounded-lg bg-[#1B1410] border border-[#E8C184]/20 flex flex-wrap items-center justify-between gap-4 text-xs font-mono-tabular text-[#D6C3A5]">
              <span>FPS: {snap.metrics.fps}</span>
              <span>
                Spatial Grid: {snap.metrics.gridCols}×{snap.metrics.gridRows} celdas
              </span>
              <span>
                Pool Balas: {snap.metrics.activeBullets}/{snap.metrics.bulletPoolCapacity}
              </span>
              <span>
                Pool Partículas: {snap.metrics.activeParticles}/{snap.metrics.particlePoolCapacity}
              </span>
              <span>Enemigos: {snap.metrics.enemiesCount}</span>
              <span>Culling omitidos: {snap.metrics.culledObjects}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
