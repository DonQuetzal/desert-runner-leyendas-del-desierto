/**
 * Caché de sprites pixel art 16-bit pre-renderizados en Offscreen Canvas
 * para dibujar cientos de entidades por fotograma con costo mínimo.
 */

type Palette = Record<string, string>;

const PALETTE: Palette = {
  '.': '', // Transparente
  K: '#1B1410', // Contorno oscuro
  H: '#D7A86E', // Sombrero paja / ala ancha
  h: '#9E6F3A', // Sombra de sombrero
  B: '#4A2C18', // Cinta de sombrero / botas
  S: '#F0C097', // Piel cálida
  W: '#F7EFE2', // Camisa clara / blanco hueso
  w: '#D9CDBB', // Sombra camisa
  R: '#C93A2B', // Paliacate rojo / detalle carmesí
  r: '#8A2319', // Rojo oscuro
  D: '#3A5A8C', // Pantalón mezclilla
  d: '#273D61', // Sombra mezclilla
  G: '#EAB308', // Dorado / hebilla / moneda
  g: '#A16207', // Oro oscuro
  M: '#94A3B8', // Acero / revólver
  m: '#475569', // Acero oscuro
  P: '#2C2320', // Poncho bandido oscuro
  p: '#4A3933', // Poncho bandido sombra
  C: '#C8A377', // Pelaje coyote claro
  c: '#8C6B46', // Pelaje coyote oscuro
  J: '#5C4033', // Pelaje jabalí
  j: '#3B2820', // Jabalí oscuro
  T: '#EAE2D6', // Colmillo / hueso
  V: '#8E9C5C', // Serpiente oliva
  v: '#5A6636', // Serpiente patrón oscuro
  E: '#FDE047', // Ojo / brillo amarillo
  X: '#3E7B42', // Sahuaro verde
  x: '#26542B', // Sahuaro sombra
  L: '#5EA252', // Sahuaro luz
  O: '#8C6E58', // Roca desértica
  o: '#5E493A', // Roca sombra
  Q: '#B8977D', // Roca luz
  Z: '#708C45', // Mezquite / nopal
  z: '#485E2B', // Mezquite sombra
  U: '#38BDF8', // Agua cantimplora
  u: '#0284C7', // Agua sombra
};

function bakeSprite(rows: string[], scale: number = 1): HTMLCanvasElement {
  const height = rows.length;
  const width = rows[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      const color = PALETTE[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  return canvas;
}

// Vaquero Sonorense (16x18): Sombrero norteño, camisa clara, paliacate rojo, mezclilla y botas
const PLAYER_FRAME_0 = [
  '....KKKKKKKK....',
  '...KHHHHHHHHK...',
  '..KHHHHHHHHHHK..',
  '.KBBBBBBBBBBBBK.',
  'KhhhhhhhhhhhhhhK',
  '..KKSSSSSSSSKK..',
  '...KKSKSSKSKK...',
  '....KSSSSSSK....',
  '...KKRRRRRRKK...',
  '..KWWWWWWWWWWK..',
  '..KWwWWWWWWwWK..',
  '..KSSWWWWWWSSK..',
  '...KKBGGGGGBKK..',
  '...KDDDDDDDDK...',
  '...KDDDKKDDDK...',
  '...KDDK..KDDK...',
  '...KBBK..KBBK...',
  '..KKKK....KKKK..',
];

const PLAYER_FRAME_1 = [
  '....KKKKKKKK....',
  '...KHHHHHHHHK...',
  '..KHHHHHHHHHHK..',
  '.KBBBBBBBBBBBBK.',
  'KhhhhhhhhhhhhhhK',
  '..KKSSSSSSSSKK..',
  '...KKSKSSKSKK...',
  '....KSSSSSSK....',
  '...KKRRRRRRKK...',
  '..KWWWWWWWWWWK..',
  '..KWwWWWWWWwWK..',
  '..KSSWWWWWWSSK..',
  '...KKBGGGGGBKK..',
  '...KDDDDDDDDK...',
  '...KDDDKKDDDK...',
  '..KDDK....KDDK..',
  '..KBBK....KBBK..',
  '.KKKK......KKKK.',
];

// Bandido del Desierto (16x18)
const BANDIT_FRAME_0 = [
  '....KKKKKKKK....',
  '...KppppppppK...',
  '..KppppppppppK..',
  '.KRRRRRRRRRRRRK.',
  'KPPPPPPPPPPPPPPK',
  '..KKSSSSSSSSKK..',
  '...KKSKSSKSKK...',
  '....KRRRRRRK....',
  '...KPPPPPPPPK...',
  '..KPPPRRRRPPPK..',
  '..KPPPPRRPPPPK..',
  '..KSSPPPPPPSSK..',
  '...KPPPPPPPPK...',
  '...KddddddddK...',
  '...KdddKKdddK...',
  '...KddK..KddK...',
  '...KBBK..KBBK...',
  '..KKKK....KKKK..',
];

const BANDIT_FRAME_1 = [
  '....KKKKKKKK....',
  '...KppppppppK...',
  '..KppppppppppK..',
  '.KRRRRRRRRRRRRK.',
  'KPPPPPPPPPPPPPPK',
  '..KKSSSSSSSSKK..',
  '...KKSKSSKSKK...',
  '....KRRRRRRK....',
  '...KPPPPPPPPK...',
  '..KPPPRRRRPPPK..',
  '..KPPPPRRPPPPK..',
  '..KSSPPPPPPSSK..',
  '...KPPPPPPPPK...',
  '...KddddddddK...',
  '...KdddKKdddK...',
  '..KddK....KddK..',
  '..KBBK....KBBK..',
  '.KKKK......KKKK.',
];

// Coyote Veloz (16x12)
const COYOTE_FRAME_0 = [
  '..KK......KK....',
  '.KCK......KCK...',
  '.KCCKKKKKKCCK...',
  'KCCCEKCCCCcCK...',
  'KCCCCCCCCCCcCK..',
  '.KKCCCCCCCCcCCKK',
  '...KCCCCCCCCcCCK',
  '...KCCcKKKKCCcK.',
  '..KCKK....KKCK..',
  '..KCK......KCK..',
  '.KKK........KKK.',
  '................',
];

const COYOTE_FRAME_1 = [
  '..KK......KK....',
  '.KCK......KCK...',
  '.KCCKKKKKKCCK...',
  'KCCCEKCCCCcCK...',
  'KCCCCCCCCCCcCK..',
  '.KKCCCCCCCCcCCKK',
  '...KCCCCCCCCcCCK',
  '...KCCcKKKKCCcK.',
  '...KCK....KCK...',
  '....KCK..KCK....',
  '....KKK..KKK....',
  '................',
];

// Jabalí del Monte / Pecarí (16x14)
const JAVELINA_FRAME_0 = [
  '.....KKKKKKK....',
  '...KKJJJJJJJKK..',
  '..KJJjJJJJJJjJK.',
  '.KJJWJJJJJJJJjJK',
  'KTJJEJJJJJJJJJjK',
  'KTTJJjWWWWJJJjJK',
  'KJJJJJWWWWJJJjJK',
  '.KKJJJJJJJJJjJKK',
  '..KJJjKKKKJJjJK.',
  '..KjjK....KjjK..',
  '..KTTK....KTTK..',
  '..KKKK....KKKK..',
];

const JAVELINA_FRAME_1 = [
  '.....KKKKKKK....',
  '...KKJJJJJJJKK..',
  '..KJJjJJJJJJjJK.',
  '.KJJWJJJJJJJJjJK',
  'KTJJEJJJJJJJJJjK',
  'KTTJJjWWWWJJJjJK',
  'KJJJJJWWWWJJJjJK',
  '.KKJJJJJJJJJjJKK',
  '..KJJjKKKKJJjJK.',
  '...KjjK..KjjK...',
  '...KTTK..KTTK...',
  '...KKKK..KKKK...',
];

// Serpiente de Cascabel (16x12)
const SNAKE_FRAME_0 = [
  '......KKKKK.....',
  '.....KVVvVVK....',
  '....KVEKVVvVK...',
  '...RKVVVVvVVk...',
  '....KKKKVVvVVK..',
  '.......KVVvVVK..',
  '..KKKKKKVVvVK...',
  '.KVVvVVVVvVKK...',
  'KHHKVVvVVKK.....',
  'KHHKKKKKK.......',
  '.KK.............',
  '................',
];

const SNAKE_FRAME_1 = [
  '......KKKKK.....',
  '.....KVVvVVK....',
  '....KVEKVVvVK...',
  '..RRKVVVVvVVk...',
  '....KKKKVVvVVK..',
  '.......KVVvVVK..',
  '...KKKKKVVvVK...',
  '..KVVvVVVVvVKK..',
  '.KHHKVVvVVKK....',
  '.KHHKKKKKK......',
  '..KK............',
  '................',
];

// Jefe Especial "El Alacrán Rojo" (20x22)
const BOSS_FRAME_0 = [
  '......KKKKKKKK......',
  '....KKppppppppKK....',
  '...KppppppppppppK...',
  '..KGGGGGGGGGGGGGGK..',
  '.KPPPPPPPPPPPPPPPPK.',
  '...KKSSSSSSSSSSKK...',
  '....KKSKKSSKKSKK....',
  '....KKSSSSSSSSKK....',
  '....KKRRRRRRRRKK....',
  '..KKRRRRRRRRRRRRKK..',
  '.KRRRRGGGGGGGGRRRRK.',
  '.KRRRRRRrRRrRRRRRRK.',
  '.KSSRRRRRRRRRRRRSSK.',
  '..KKRRRRRRRRRRRRKK..',
  '...KPPPPGGGGPPPPK...',
  '...KddddddddddddK...',
  '...KdddddKKdddddK...',
  '...KddddK..KddddK...',
  '...KBBBBK..KBBBBK...',
  '..KKKKKK....KKKKKK..',
];

const BOSS_FRAME_1 = [
  '......KKKKKKKK......',
  '....KKppppppppKK....',
  '...KppppppppppppK...',
  '..KGGGGGGGGGGGGGGK..',
  '.KPPPPPPPPPPPPPPPPK.',
  '...KKSSSSSSSSSSKK...',
  '....KKSKKSSKKSKK....',
  '....KKSSSSSSSSKK....',
  '....KKRRRRRRRRKK....',
  '..KKRRRRRRRRRRRRKK..',
  '.KRRRRGGGGGGGGRRRRK.',
  '.KRRRRRRrRRrRRRRRRK.',
  '.KSSRRRRRRRRRRRRSSK.',
  '..KKRRRRRRRRRRRRKK..',
  '...KPPPPGGGGPPPPK...',
  '...KddddddddddddK...',
  '...KdddddKKdddddK...',
  '..KddddK....KddddK..',
  '..KBBBBK....KBBBBK..',
  '.KKKKKK......KKKKKK.',
];

// Sahuaro Sonorense (16x24)
const SAHUARO_SPRITE = [
  '......KKKK......',
  '.....KLLXXK.....',
  '.....KLXXXK.....',
  '.KKK.KLXXxK.....',
  'KLXXKKLXXxK.KKK.',
  'KLXXK.LXXxKKLXXK',
  'KLXXK.LXXxK.LXXK',
  'KLXXKKLXXxK.LXXK',
  '.KXXXXXXXXKKLXXK',
  '..KKKKLXXxXXXXXK',
  '.....KLXXxKKKKK.',
  '.....KLXXxK.....',
  '.....KLXXxK.....',
  '.....KLXXxK.....',
  '.....KLXXxK.....',
  '.....KLXXxK.....',
  '.....KLXXxK.....',
  '.....KLXXxK.....',
  '.....KLXXxK.....',
  '....KKLXXxKK....',
  '...Kooooooook...',
];

// Mezquite / Nopal (16x12)
const MEZQUITE_SPRITE = [
  '....KKKKKKKK....',
  '..KKZZZZZZZZKK..',
  '.KZZZLLZZZZZZzK.',
  'KZZLLZZZLLZZZzZK',
  'KZZZZZZZRRZZZZzK',
  'KZZZzZZZZZZZZzzK',
  '.KZZzzZZZzZZzzK.',
  '..KKzzzzzzzzKK..',
  '....KKKKKKKK....',
];

// Roca desértica (16x12)
const ROCK_SPRITE = [
  '....KKKKKKKK....',
  '..KKQQQQQQQQKK..',
  '.KQQQOOOOOOQQoK.',
  'KQQOOOOOOOOOOoOK',
  'KOOOOOOOOOOOOooK',
  'KOOoOOOOOOooooOK',
  '.KooooOOOOooooK.',
  '..KKKKKKKKKKKK..',
];

// Potenciadores (12x12)
const PICKUP_COIN = [
  '...KKKKKK...',
  '..KGGGGGGK..',
  '.KGGWWGGGGK.',
  '.KGGWGgGGGK.',
  '.KGGWGgGGGK.',
  '.KGGWWGGGGK.',
  '..KGGGGGGK..',
  '...KKKKKK...',
];

const PICKUP_SHOTGUN = [
  '....KKKKKKKK',
  '...KMMMMMMMM',
  '..KBBMMMMmmK',
  '.KBBBKmKKKK.',
  'KBBBBK......',
  'KKKKK.......',
];

const PICKUP_RAPID = [
  '..KKK..KKK..',
  '.KGGK..KGGK.',
  '.KGGK..KGGK.',
  'KGGGGKKGGGGK',
  'KGGgGKKGGgGK',
  '.KKKKKKKKKK.',
];

const PICKUP_BOOTS = [
  '...KKKK.....',
  '..KBBBBK....',
  '..KBBBBK....',
  '..KBBBBKKK..',
  '.KGGGGGGGGK.',
  '.KKKKKKKKKK.',
];

const PICKUP_SHERIFF = [
  '.....KK.....',
  '....KGGK....',
  '.KKKKGGKKKK.',
  'KGGGGWWGGGGK',
  '.KKGGGGGGKK.',
  '..KGGKKGGK..',
  '.KGGK..KGGK.',
  '.KKK....KKK.',
];

const PICKUP_CANTEEN = [
  '....KKKK....',
  '....KBBK....',
  '..KKUUUUKK..',
  '.KUUWWUUUUk.',
  '.KUUUUuuuUK.',
  '.KUUUUuuuUK.',
  '..KKKKKKKK..',
];

const PICKUP_HAT_LIFE = [
  '...KKKKKK...',
  '..KGGGGGGK..',
  '.KGGGGGGGGK.',
  '.KRRRRRRRRK.',
  'KggggggggggK',
  '.KKKKKKKKKK.',
];

export interface SpriteAtlas {
  player: [HTMLCanvasElement, HTMLCanvasElement];
  bandit: [HTMLCanvasElement, HTMLCanvasElement];
  coyote: [HTMLCanvasElement, HTMLCanvasElement];
  javelina: [HTMLCanvasElement, HTMLCanvasElement];
  rattlesnake: [HTMLCanvasElement, HTMLCanvasElement];
  boss: [HTMLCanvasElement, HTMLCanvasElement];
  sahuaro: HTMLCanvasElement;
  mezquite: HTMLCanvasElement;
  rock: HTMLCanvasElement;
  pickups: {
    coin: HTMLCanvasElement;
    shotgun: HTMLCanvasElement;
    rapid: HTMLCanvasElement;
    boots: HTMLCanvasElement;
    sheriff: HTMLCanvasElement;
    canteen: HTMLCanvasElement;
    life: HTMLCanvasElement;
  };
}

let cachedAtlas: SpriteAtlas | null = null;

export function getSpriteAtlas(): SpriteAtlas {
  if (cachedAtlas) return cachedAtlas;

  cachedAtlas = {
    player: [bakeSprite(PLAYER_FRAME_0, 1), bakeSprite(PLAYER_FRAME_1, 1)],
    bandit: [bakeSprite(BANDIT_FRAME_0, 1), bakeSprite(BANDIT_FRAME_1, 1)],
    coyote: [bakeSprite(COYOTE_FRAME_0, 1), bakeSprite(COYOTE_FRAME_1, 1)],
    javelina: [bakeSprite(JAVELINA_FRAME_0, 1), bakeSprite(JAVELINA_FRAME_1, 1)],
    rattlesnake: [bakeSprite(SNAKE_FRAME_0, 1), bakeSprite(SNAKE_FRAME_1, 1)],
    boss: [bakeSprite(BOSS_FRAME_0, 1), bakeSprite(BOSS_FRAME_1, 1)],
    sahuaro: bakeSprite(SAHUARO_SPRITE, 1),
    mezquite: bakeSprite(MEZQUITE_SPRITE, 1),
    rock: bakeSprite(ROCK_SPRITE, 1),
    pickups: {
      coin: bakeSprite(PICKUP_COIN, 1),
      shotgun: bakeSprite(PICKUP_SHOTGUN, 1),
      rapid: bakeSprite(PICKUP_RAPID, 1),
      boots: bakeSprite(PICKUP_BOOTS, 1),
      sheriff: bakeSprite(PICKUP_SHERIFF, 1),
      canteen: bakeSprite(PICKUP_CANTEEN, 1),
      life: bakeSprite(PICKUP_HAT_LIFE, 1),
    },
  };
  return cachedAtlas;
}
