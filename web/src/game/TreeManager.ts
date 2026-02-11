import * as Phaser from 'phaser';
import { TilemapManager, GRID_SIZE } from './TilemapManager';

/* ── Frame definitions for tree textures extracted from spritesheet ── */
interface TreeFrame {
  name: string;
  category: 'large' | 'medium' | 'conifer' | 'dead' | 'bush';
  weight: number;
}

const TREE_FRAMES: TreeFrame[] = [
  { name: 'tree-large-a', category: 'large',   weight: 1 },
  { name: 'tree-large-b', category: 'large',   weight: 1 },
  { name: 'tree-medium',  category: 'medium',  weight: 3 },
  { name: 'tree-conifer',  category: 'conifer', weight: 2 },
  { name: 'tree-dead',     category: 'dead',    weight: 1 },
  { name: 'bush-a',        category: 'bush',    weight: 4 },
  { name: 'bush-b',        category: 'bush',    weight: 4 },
];

/* Green tint variations for trees */
const TREE_TINTS = [0xffffff, 0xe8ffe8, 0xd8f0d8, 0xf0ffe0];

/* ── Seeded PRNG (mulberry32) ──────────────────────────────────────── */
function seededRng(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ── 2D Value Noise ────────────────────────────────────────────────── */
class ValueNoise2D {
  private grid: number[][];
  private size: number;

  constructor(size: number, seed: number) {
    this.size = size;
    const rand = seededRng(seed);
    this.grid = [];
    for (let y = 0; y <= size; y++) {
      this.grid[y] = [];
      for (let x = 0; x <= size; x++) {
        this.grid[y][x] = rand();
      }
    }
  }

  sample(x: number, y: number): number {
    const xi = Math.max(0, Math.min(Math.floor(x), this.size - 1));
    const yi = Math.max(0, Math.min(Math.floor(y), this.size - 1));
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const x1 = Math.min(xi + 1, this.size);
    const y1 = Math.min(yi + 1, this.size);

    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);

    const top = this.grid[yi][xi] * (1 - sx) + this.grid[yi][x1] * sx;
    const bot = this.grid[y1][xi] * (1 - sx) + this.grid[y1][x1] * sx;
    return top * (1 - sy) + bot * sy;
  }
}

/* ── TreeManager ───────────────────────────────────────────────────── */
export class TreeManager {
  private sprites: Phaser.GameObjects.Image[] = [];
  private shadows: Phaser.GameObjects.Image[] = [];

  private static readonly NOISE_SEED = 1337;
  private static readonly NOISE_GRID = 6;
  private static readonly BUILDING_CLEARANCE_SQ = 16; // 4-tile radius
  private static readonly DISTRICT_CLEARANCE = 2;     // 2 tiles from district border
  private static readonly TARGET_PERCENT = 0.12;      // target: 12% of total grass tiles

  constructor(
    private scene: Phaser.Scene,
    private tilemapManager: TilemapManager,
    private buildingPositions: { gx: number; gy: number }[],
  ) {}

  scatter(): void {
    const {
      NOISE_SEED, NOISE_GRID,
      BUILDING_CLEARANCE_SQ, DISTRICT_CLEARANCE, TARGET_PERCENT,
    } = TreeManager;

    const noise = new ValueNoise2D(NOISE_GRID, NOISE_SEED);
    const noise2 = new ValueNoise2D(NOISE_GRID + 2, NOISE_SEED + 99);
    const rand = seededRng(NOISE_SEED + 7);

    // Build weighted selection array
    const weighted: TreeFrame[] = [];
    for (const f of TREE_FRAMES) {
      for (let i = 0; i < f.weight; i++) weighted.push(f);
    }

    // Pass 1: collect all eligible grass tiles and score them
    const candidates: { col: number; row: number; score: number }[] = [];
    let totalGrass = 0;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // Skip road tiles
        if (this.tilemapManager.isRoad(col, row)) continue;

        // Skip district tiles themselves
        if (this.tilemapManager.getTileDistrict(col, row)) continue;

        totalGrass++;

        // Skip tiles too close to buildings (4-tile radius)
        const nearBuilding = this.buildingPositions.some(
          b => (b.gx - col) ** 2 + (b.gy - row) ** 2 < BUILDING_CLEARANCE_SQ,
        );
        if (nearBuilding) continue;

        // Skip tiles too close to any district (2-tile radius)
        if (this.isNearDistrict(col, row, DISTRICT_CLEARANCE)) continue;

        // Sample two noise octaves for organic clustering
        const nx = (col / GRID_SIZE) * NOISE_GRID;
        const ny = (row / GRID_SIZE) * NOISE_GRID;
        const n1 = noise.sample(nx, ny);
        const n2 = noise2.sample(nx * 1.5, ny * 1.5);
        let score = n1 * 0.7 + n2 * 0.3;

        // Boost edges of map (2-5 tiles from border) — natural tree line
        const edgeDist = Math.min(col, row, GRID_SIZE - 1 - col, GRID_SIZE - 1 - row);
        if (edgeDist >= 2 && edgeDist <= 5) {
          score += 0.25;
        } else if (edgeDist < 2) {
          score += 0.15; // still some trees at very edge
        }

        // Boost areas between districts (mid-ground dividers)
        const betweenDistricts = this.isBetweenDistricts(col, row);
        if (betweenDistricts) {
          score += 0.15;
        }

        // Slight reduction in dead center to keep town area open
        const cx = col / GRID_SIZE - 0.5;
        const cy = row / GRID_SIZE - 0.5;
        const centerDist = Math.sqrt(cx * cx + cy * cy) * 2;
        if (centerDist < 0.3) {
          score *= 0.5;
        }

        candidates.push({ col, row, score });
      }
    }

    // Sort by score descending — pick the top N
    candidates.sort((a, b) => b.score - a.score);

    const targetCount = Math.floor(totalGrass * TARGET_PERCENT);
    const toPlace = candidates.slice(0, targetCount);

    // Place trees
    for (const { col, row } of toPlace) {
      const jx = (rand() - 0.5) * 0.5;
      const jy = (rand() - 0.5) * 0.5;
      const pos = this.tilemapManager.gridToScreen(col + jx, row + jy);

      const frame = this.selectFrame(rand, weighted);
      const scale = this.getScale(frame.category, rand);
      const tint = TREE_TINTS[Math.floor(rand() * TREE_TINTS.length)];

      // Shadow
      const shadow = this.scene.add.image(pos.x + 3, pos.y + 4, 'building-shadow');
      shadow.setOrigin(0.5, 0.5);
      shadow.setScale(scale * 1.4, scale * 0.7);
      shadow.setDepth(0.5);
      shadow.setAlpha(0.25);
      this.shadows.push(shadow);

      // Tree sprite
      const sprite = this.scene.add.image(pos.x, pos.y, frame.name);
      sprite.setOrigin(0.5, 0.85);
      sprite.setScale(scale);
      sprite.setDepth(6.5 + (col + row) * 0.01);
      if (tint !== 0xffffff) sprite.setTint(tint);

      this.sprites.push(sprite);
    }

    // Log stats for verification
    const pct = (toPlace.length / Math.max(1, totalGrass) * 100).toFixed(1);
    console.log(
      `[TreeManager] totalGrass=${totalGrass} placed=${toPlace.length} (${pct}% of grass)`,
    );
  }

  /** Check if tile is within `radius` of any district tile. */
  private isNearDistrict(col: number, row: number, radius: number): boolean {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nc = col + dx;
        const nr = row + dy;
        if (nc < 0 || nr < 0 || nc >= GRID_SIZE || nr >= GRID_SIZE) continue;
        if (this.tilemapManager.getTileDistrict(nc, nr)) return true;
      }
    }
    return false;
  }

  /** Check if tile sits in the gap between two or more district regions. */
  private isBetweenDistricts(col: number, row: number): boolean {
    const seen = new Set<string>();
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nc = col + dx;
        const nr = row + dy;
        if (nc < 0 || nr < 0 || nc >= GRID_SIZE || nr >= GRID_SIZE) continue;
        const cat = this.tilemapManager.getTileDistrict(nc, nr);
        if (cat) seen.add(cat);
      }
    }
    return seen.size >= 2;
  }

  private selectFrame(rand: () => number, weighted: TreeFrame[]): TreeFrame {
    if (rand() < 0.10) {
      return rand() < 0.5 ? TREE_FRAMES[0] : TREE_FRAMES[1]; // large
    }
    if (rand() < 0.20) {
      return TREE_FRAMES[2]; // medium
    }
    return weighted[Math.floor(rand() * weighted.length)];
  }

  private getScale(category: string, rand: () => number): number {
    switch (category) {
      case 'large':   return 0.35 + rand() * 0.15;
      case 'medium':  return 0.28 + rand() * 0.12;
      case 'conifer': return 0.28 + rand() * 0.12;
      case 'dead':    return 0.22 + rand() * 0.10;
      case 'bush':    return 0.22 + rand() * 0.10;
      default:        return 0.28;
    }
  }

  destroy(): void {
    for (const s of this.sprites) s.destroy();
    for (const s of this.shadows) s.destroy();
    this.sprites = [];
    this.shadows = [];
  }
}
