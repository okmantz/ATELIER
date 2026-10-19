import { hexToHsl, hexToRgb, rgbToHex } from '../engine/color-harmony';
import { ctx2d, newCanvas } from '../imaging/image-resize';

/** Simple vector silhouettes (400×500 box) used only for the optional sample wardrobe. */
type Shape = { body: string; details?: string[]; stroke?: string[] };

const TEE = 'M130 40 L90 58 L18 112 L56 168 L96 142 L96 452 L304 452 L304 142 L344 168 L382 112 L310 58 L270 40 Q200 92 130 40 Z';
const LONG = 'M130 40 L90 56 L38 124 L8 346 L56 356 L96 196 L96 452 L304 452 L304 196 L344 356 L392 346 L362 124 L310 56 L270 40 Q200 88 130 40 Z';
const COAT = 'M128 30 L84 50 L30 120 L2 440 L56 448 L92 210 L92 492 L308 492 L308 210 L344 448 L398 440 L370 120 L316 50 L272 30 Q200 70 128 30 Z';

export const SHAPES: Record<string, Shape> = {
  tee: { body: TEE },
  polo: { body: TEE, details: ['M170 42 L200 100 L230 42', 'M200 100 L200 190'] },
  shirt: { body: LONG, details: ['M160 40 L200 96 L240 40', 'M200 96 L200 452', 'M168 40 L184 70 L160 74', 'M232 40 L216 70 L240 74'] },
  sweater: { body: LONG, details: ['M96 420 L304 420', 'M150 44 Q200 80 250 44'] },
  cardigan: { body: LONG, details: ['M200 70 L200 452', 'M96 420 L304 420', 'M200 150 L204 150', 'M200 230 L204 230', 'M200 310 L204 310'] },
  hoodie: { body: LONG, details: ['M130 40 Q200 -10 270 40 Q200 100 130 40', 'M150 330 L250 330 L262 392 L138 392 Z'] },
  turtle: { body: LONG, details: ['M150 40 L150 12 L250 12 L250 40', 'M96 420 L304 420'] },
  waistcoat: { body: 'M128 30 L96 60 L96 450 L304 450 L304 60 L272 30 L200 120 Z', details: ['M200 120 L200 450', 'M170 190 L172 190', 'M170 270 L172 270', 'M170 350 L172 350'] },
  blazer: { body: COAT.replace(/492/g, '470').replace(/448/g, '430').replace(/440/g, '420'), details: ['M128 30 L200 230 L272 30', 'M200 230 L200 470', 'M128 30 L168 120 L150 150', 'M272 30 L232 120 L250 150'] },
  jacket: { body: LONG, details: ['M200 60 L200 452', 'M96 410 L304 410', 'M130 40 L170 110', 'M270 40 L230 110'] },
  coat: { body: COAT, details: ['M128 30 L200 250 L272 30', 'M200 250 L200 492', 'M128 30 L170 130 L146 160', 'M272 30 L230 130 L254 160', 'M172 330 L176 330', 'M172 400 L176 400'] },
  parka: { body: COAT, details: ['M128 30 Q200 -20 272 30', 'M200 60 L200 492', 'M92 340 L308 340'] },
  trousers: { body: 'M112 24 L288 24 L306 476 L214 476 L200 150 L186 476 L94 476 Z', details: ['M112 24 L288 24 L288 52 L112 52 Z', 'M200 52 L200 150'] },
  jeans: { body: 'M112 24 L288 24 L306 476 L214 476 L200 150 L186 476 L94 476 Z', details: ['M112 52 L288 52', 'M200 52 L200 150', 'M130 76 Q150 100 168 78'] },
  shorts: { body: 'M108 24 L292 24 L316 232 L214 232 L200 112 L186 232 L84 232 Z', details: ['M108 52 L292 52', 'M200 52 L200 112'] },
  skirt: { body: 'M124 24 L276 24 L352 420 L48 420 Z', details: ['M124 52 L276 52'] },
  dress: { body: 'M152 14 Q200 54 248 14 L282 40 L270 168 L364 478 L36 478 L130 168 L118 40 Z', details: ['M130 168 L270 168'] },
  jumpsuit: { body: 'M150 14 Q200 52 250 14 L286 40 L272 190 L302 486 L214 486 L200 280 L186 486 L98 486 L128 190 L114 40 Z', details: ['M128 190 L272 190'] },
  sneaker: { body: 'M30 330 L30 252 Q92 244 134 196 L172 226 Q252 270 340 298 Q384 312 384 346 L384 376 L30 376 Z', details: ['M30 350 L384 350', 'M150 236 L176 262', 'M172 250 L198 276'] },
  loafer: { body: 'M28 318 L28 246 Q120 236 196 214 Q300 236 372 300 Q392 326 384 364 L28 364 Z', details: ['M28 346 L384 346', 'M196 214 Q214 262 288 270'] },
  boot: { body: 'M118 30 L238 30 L240 252 Q338 270 372 322 L372 384 L96 384 L110 252 Z', details: ['M96 360 L372 360', 'M118 70 L238 70'] },
  heel: { body: 'M40 190 Q112 340 244 306 L356 258 L372 292 L132 372 L112 452 L84 452 L70 350 Z', details: [] },
  bag: { body: 'M70 170 L330 170 L350 440 L50 440 Z', details: ['M70 230 L330 230'], stroke: ['M130 170 Q130 70 200 70 Q270 70 270 170'] },
  watch: { body: 'M150 200 L250 200 L250 300 L150 300 Z', details: ['M200 232 L200 252 L218 262'], stroke: ['M160 200 L168 60 L232 60 L240 200', 'M160 300 L168 440 L232 440 L240 300'] },
  belt: { body: 'M20 226 L380 226 L380 276 L20 276 Z', details: ['M180 214 L226 214 L226 288 L180 288 Z', 'M60 251 L64 251', 'M90 251 L94 251', 'M120 251 L124 251'] },
  scarf: { body: 'M150 30 L250 30 L262 470 L138 470 Z', details: ['M150 440 L250 440', 'M138 470 L138 490', 'M162 470 L162 490', 'M186 470 L186 490', 'M210 470 L210 490', 'M234 470 L234 490', 'M258 470 L258 490'] },
  hat: { body: 'M70 300 Q70 130 200 130 Q330 130 330 300 Z', details: ['M20 300 L380 300 L380 334 L20 334 Z'] },
  beanie: { body: 'M80 330 Q76 120 200 112 Q324 120 320 330 Z', details: ['M72 296 L328 296 L328 340 L72 340 Z', 'M110 296 L110 340', 'M150 296 L150 340', 'M200 296 L200 340', 'M250 296 L250 340', 'M290 296 L290 340'] },
  sunglasses: { body: 'M30 200 Q30 340 120 340 Q190 340 190 230 L210 230 Q210 340 280 340 Q370 340 370 200 Z', details: ['M190 230 Q200 214 210 230'] },
  tie: { body: 'M172 30 L228 30 L216 112 L256 420 L200 480 L144 420 L184 112 Z', details: ['M172 30 L228 30 L216 112 L184 112 Z'] },
  necklace: { body: 'M180 330 L220 330 L228 376 L172 376 Z', details: [], stroke: ['M70 90 Q70 330 200 330 Q330 330 330 90'] },
  gloves: { body: 'M120 200 L280 200 L292 440 L108 440 Z', details: ['M150 200 L150 120', 'M190 200 L190 90', 'M230 200 L230 100', 'M270 200 L270 130'] },
  suit: { body: COAT.replace(/492/g, '484').replace(/448/g, '440'), details: ['M128 30 L200 240 L272 30', 'M200 240 L200 484', 'M92 330 L308 330'] },
};

export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const k = amount < 0 ? 0 : 255;
  const a = Math.abs(amount);
  return rgbToHex(r + (k - r) * a, g + (k - g) * a, b + (k - b) * a);
}

/** Renders a tidy silhouette illustration in the given colour to a transparent canvas. */
export function renderSilhouette(shapeKey: string, hex: string, pattern: 'solid' | 'striped' | 'checked' = 'solid'): HTMLCanvasElement {
  const shape = SHAPES[shapeKey] ?? SHAPES.tee;
  const c = newCanvas(480, 600);
  const x = ctx2d(c);
  x.translate(40, 50);
  const path = new Path2D(shape.body);
  const light = hexToHsl(hex).l > 0.78;

  x.save();
  x.shadowColor = 'rgba(0,0,0,0.18)';
  x.shadowBlur = 18;
  x.shadowOffsetY = 8;
  x.fillStyle = hex;
  x.fill(path);
  x.restore();

  const g = x.createLinearGradient(0, 0, 400, 500);
  g.addColorStop(0, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(0,0,0,0.14)');
  x.fillStyle = g;
  x.fill(path);

  if (pattern !== 'solid') {
    x.save();
    x.clip(path);
    x.strokeStyle = shade(hex, light ? -0.25 : 0.3);
    x.globalAlpha = 0.55;
    x.lineWidth = 6;
    for (let i = -500; i < 900; i += 34) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 520);
      x.stroke();
      if (pattern === 'checked') {
        x.beginPath();
        x.moveTo(0, i);
        x.lineTo(420, i);
        x.stroke();
      }
    }
    x.restore();
  }

  const line = shade(hex, light ? -0.38 : -0.42);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  x.strokeStyle = line;
  x.lineWidth = 5;
  x.stroke(path);
  x.lineWidth = 3.5;
  x.globalAlpha = 0.8;
  for (const d of shape.details ?? []) x.stroke(new Path2D(d));
  x.globalAlpha = 1;
  x.lineWidth = 12;
  x.strokeStyle = shade(hex, -0.3);
  for (const d of shape.stroke ?? []) x.stroke(new Path2D(d));
  return c;
}

export const SHAPE_FOR_SUB: Record<string, string> = {
  'T-shirt': 'tee',
  Tank: 'tee',
  'Crop top': 'tee',
  Camisole: 'tee',
  Bodysuit: 'tee',
  Polo: 'polo',
  Henley: 'polo',
  'Dress shirt': 'shirt',
  'Oxford shirt': 'shirt',
  Blouse: 'shirt',
  'Long-sleeve tee': 'sweater',
  Sweater: 'sweater',
  Fleece: 'sweater',
  Sweatshirt: 'sweater',
  'Quarter-zip': 'sweater',
  Cardigan: 'cardigan',
  Hoodie: 'hoodie',
  Turtleneck: 'turtle',
  Waistcoat: 'waistcoat',
  Blazer: 'blazer',
  'Denim jacket': 'jacket',
  'Leather jacket': 'jacket',
  Bomber: 'jacket',
  Overshirt: 'jacket',
  'Trench coat': 'coat',
  Overcoat: 'coat',
  'Wool coat': 'coat',
  Peacoat: 'coat',
  Raincoat: 'coat',
  Puffer: 'parka',
  Parka: 'parka',
  Jeans: 'jeans',
  Chinos: 'trousers',
  'Dress trousers': 'trousers',
  'Wide-leg trousers': 'trousers',
  Joggers: 'trousers',
  'Cargo pants': 'trousers',
  Leggings: 'trousers',
  Shorts: 'shorts',
  Skirt: 'skirt',
  'Midi skirt': 'skirt',
  Dress: 'dress',
  Gown: 'dress',
  Romper: 'jumpsuit',
  Jumpsuit: 'jumpsuit',
  Suit: 'suit',
  Sneakers: 'sneaker',
  Sandals: 'sneaker',
  Loafers: 'loafer',
  Oxfords: 'loafer',
  Derbies: 'loafer',
  Flats: 'loafer',
  Boots: 'boot',
  'Chelsea boots': 'boot',
  'Ankle boots': 'boot',
  Heels: 'heel',
  Pumps: 'heel',
  Belt: 'belt',
  Watch: 'watch',
  Scarf: 'scarf',
  Hat: 'hat',
  Beanie: 'beanie',
  Gloves: 'gloves',
  Sunglasses: 'sunglasses',
  Bag: 'bag',
  Tie: 'tie',
  'Pocket square': 'tee',
  Necklace: 'necklace',
  Earrings: 'necklace',
  Bracelet: 'necklace',
  Ring: 'necklace',
};
