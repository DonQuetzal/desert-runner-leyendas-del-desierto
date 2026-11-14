# Desert Runner: Leyendas del Desierto

Videojuego web arcade 2D de supervivencia y disparos en vista cenital, estilo **pixel art retro de 16 bits**, ambientado en los desiertos de **Sonora, México** durante la época del viejo oeste.

---

## Concepto y Objetivos

El jugador controla a un vaquero sonorense (sombrero norteño de ala ancha, camisa clara, paliacate rojo, mezclilla, botas de cuero y revólver) que debe resistir oleadas crecientes de bandidos y fauna del desierto dentro de una llanura rodeada de sahuaros, rocas y mezquites.

**Objetivos del proyecto:**
- Ofrecer una experiencia arcade fluida, responsiva y 100% jugable en navegadores modernos.
- Implementar una arquitectura modular limpia y mantenible en módulos independientes.
- Aplicar y documentar técnicas clásicas de optimización para videojuegos 2D en HTML5 Canvas.
- Generar gráficos pixel art y efectos de audio originales sin dependencias externas protegidas por derechos de autor.

---

## Controles

| Acción | Control |
| :--- | :--- |
| Moverse (8 direcciones) | `W A S D` o Flechas del teclado |
| Apuntar | Cursor del mouse |
| Disparar revólver / arma activa | Clic izquierdo (mantener o presionar) |
| Recargar tambor (6 balas) | Tecla `R` (o automático al vaciar) |
| Pausar / Reanudar | `P` o `Escape` |
| Inspección técnica (Spatial Grid / Pools) | Botón **Malla espacial** en la barra superior |

---

## Enemigos, Mejoras y Progresión

- **Bandido del Desierto:** Persigue al vaquero; a partir de la oleada 3 los bandidos disparan proyectiles.
- **Coyote Veloz:** Poca resistencia pero gran velocidad y desplazamiento en zigzag.
- **Serpiente de Cascabel:** Se enrolla y cascabelea al acercarse el jugador antes de lanzarse o escupir veneno.
- **Jabalí del Monte (Pecarí):** Alta resistencia; telegrafía una alerta (`!`) antes de ejecutar una embestida rápida.
- **Jefes Especiales:** Aparecen cada 5 oleadas (*El Alacrán Rojo*, *El Caporal de Hierro*, *La Sombra de Sonora*) con ráfagas en abanico y barra de vida propia.
- **Potenciadores y Objetos:** Monedas de oro (`+50 pts`), Escopeta de perdigones, Abanico rápido, Espuelas de plata (velocidad y recarga), Estrella del Sheriff (invulnerabilidad), Cantimplora (`+35 Salud`) y Sombrero Dorado (`+1 Vida`).
- **Ciclo ambiental:** El horizonte y la iluminación cambian progresivamente del día cálido (oleadas 1–2) al atardecer sonorense (oleadas 3–4) y la noche estrellada (oleada 5+).

---

## Tecnologías Utilizadas

- **HTML5 & Canvas 2D API** para el renderizado de sprites y terreno pixel art.
- **CSS3 / Tailwind CSS** para la interfaz y marcadores responsivos.
- **TypeScript / JavaScript ES6+** en módulos desacoplados con Vite.
- **Web Audio API** para síntesis procedimental de efectos de sonido y música ambiental western norteña.
- **LocalStorage** para persistencia de récord histórico, mejor oleada y preferencias de audio.

---

## Arquitectura del Código (`src/game/`)

```text
src/game/
├── main.ts          # Punto de entrada del motor y montaje sobre el <canvas>
├── game.ts          # Ciclo principal (Delta Time), estados y Double Buffering
├── player.ts        # Movimiento 8D, apuntado, recarga, mejoras y salud/vidas
├── enemy.ts         # Comportamiento de bandidos, coyotes, jabalíes, cascabeles y jefes
├── bullet.ts        # Sistema de proyectiles con Object Pooling
├── waveManager.ts   # Administración de oleadas, dificultad progresiva y jefes
├── collision.ts     # Detección de colisiones asistida por Spatial Grid
├── spatialGrid.ts   # Malla espacial uniforme 2D para consultas O(1)
├── audio.ts         # Motor Web Audio API (SFX + música western procedimental)
├── scenarios.ts     # Escenario jugable + arquitectura para Pueblo y Cañón
├── sprites.ts       # Atlas de sprites pixel art 16-bit pre-renderizados
├── particles.ts     # Partículas, casquillos y textos flotantes con Object Pooling
└── utils.ts         # Funciones matemáticas, ObjectPool<T> y Viewport Culling
```

### Escenarios
1. **Desierto Abierto de Sonora:** Escenario principal completamente jugable.
2. **Pueblo Abandonado** y **Cañón Rocoso:** Estructurados en `src/game/scenarios.ts` mediante la interfaz `ScenarioConfig` para su incorporación directa.

---

## Técnicas de Optimización Implementadas

1. **Spatial Grid (`spatialGrid.ts`):** Divide el mapa de `640×400` en celdas uniformes de `64×64` px. En cada cuadro se insertan los enemigos y las balas consultan únicamente las celdas vecinas, reduciendo la detección de colisiones de $O(N \cdot M)$ a $O(1)$ promedio.
2. **Object Pooling (`utils.ts`, `bullet.ts`, `particles.ts`):** Pools pre-asignados de 180 proyectiles, 260 partículas y 48 textos flotantes que reciclan instancias inactivas para evitar pausas del *Garbage Collector*.
3. **Delta Time (`game.ts`):** El paso de simulación `dt` se calcula con `performance.now()` y se acota a `0.05s` para mantener velocidades consistentes en pantallas de 60 Hz, 120 Hz o 144 Hz.
4. **Double Buffering (`game.ts`):** Toda la escena se dibuja en un `backBuffer` oculto antes de volcarse en un único `drawImage` sobre el `<canvas>` visible.
5. **Offscreen Canvas (`scenarios.ts` y `sprites.ts`):** Tanto el suelo arenoso con cerros y mezquites como cada matriz pixel art se pre-renderizan en lienzos fuera de pantalla (*cache*).
6. **Culling (`utils.ts`):** Antes de dibujar balas, enemigos, objetos y partículas se valida su intersección con el área visible del viewport.

> Puedes visualizar en tiempo real la malla espacial, los contadores de *Object Pooling* y los objetos omitidos activando **Malla espacial** en la barra superior del juego.

---

## Instalación Local y Publicación en GitHub Pages

### Ejecución local
```bash
npm install
npm run dev
```
Abre `http://localhost:3000` en tu navegador.

### Compilación de producción
```bash
npm run build
```
Los archivos listos para distribución estática se generan en `dist/`.

### Publicación gratuita en GitHub Pages
1. Sube el repositorio a GitHub.
2. Ejecuta `npm run build` o configura un flujo de GitHub Actions que publique la carpeta `dist/` en la rama `gh-pages` (el archivo `vite.config.ts` ya utiliza `base: './'` para compatibilidad con subrutas de GitHub Pages).
3. En **Settings → Pages** del repositorio, selecciona la fuente de despliegue y abre la URL pública generada.

---

## Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [`LICENSE`](./LICENSE) para más información.
