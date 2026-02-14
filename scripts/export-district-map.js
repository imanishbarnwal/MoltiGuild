#!/usr/bin/env node
/**
 * export-district-map.js
 *
 * Replicates TilemapManager's deterministic Voronoi + noise world generation
 * server-side (no Phaser dependency). Outputs data/district-map.json with:
 *   - roads, water, worldMask tile keys
 *   - districts: { category → ["col,row", ...] }
 *   - districtBounds: { category → { minCol, maxCol, ... } }
 *
 * Uses the same seeds (7331, 4242, 9999, 8888, 5555, 6666, 7777) and
 * algorithms as the Phaser client so both produce identical tile maps.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

/* ── PRNG (mulberry32) — identical to web/src/game/noise.ts ──────────── */

function seededRng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── ValueNoise2D — identical to web/src/game/noise.ts ───────────────── */

class ValueNoise2D {
  constructor(size, seed) {
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

  sample(x, y) {
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

/* ── District definitions — identical to TilemapManager.ts ───────────── */

const GRID_COLS = 56;
const GRID_ROWS = 56;
const ROAD_THRESHOLD = 1.0;

const ALL_DISTRICTS = [
  { name: 'Town Square',      category: 'townsquare',  seedCol: 28, seedRow: 28, noiseAmplitude: 2.5, noiseFrequency: 0.55, radialBias: 0.7,  sizeWeight: 0.78 },
  { name: 'Creative Quarter', category: 'creative',    seedCol: 19, seedRow: 19, noiseAmplitude: 3.5, noiseFrequency: 0.60, radialBias: 0.45, sizeWeight: 1.0  },
  { name: 'Translation Ward', category: 'translation', seedCol: 34, seedRow: 17, noiseAmplitude: 3.2, noiseFrequency: 0.65, radialBias: 0.25, sizeWeight: 1.0  },
  { name: 'Code Heights',     category: 'code',        seedCol: 40, seedRow: 30, noiseAmplitude: 3.0, noiseFrequency: 0.55, radialBias: 0.55, sizeWeight: 1.0  },
  { name: 'Research Fields',  category: 'research',    seedCol: 30, seedRow: 40, noiseAmplitude: 3.8, noiseFrequency: 0.60, radialBias: 0.35, sizeWeight: 1.0  },
  { name: 'DeFi Docks',       category: 'defi',        seedCol: 17, seedRow: 34, noiseAmplitude: 4.5, noiseFrequency: 0.70, radialBias: 0.15, sizeWeight: 1.0  },
];

/* ── shouldBeWater — identical to BiomeConfig.ts ─────────────────────── */

function shouldBeWater(col, row, biome, centroidCol, centroidRow, extentCol, extentRow) {
  const nx = (col - centroidCol) / Math.max(1, extentCol);
  const ny = (row - centroidRow) / Math.max(1, extentRow);

  switch (biome) {
    case 'translation':
      return nx > 0.6;
    case 'creative':
      return nx * nx + ny * ny < 0.06;
    case 'defi':
      return Math.abs(nx - ny) < 0.05;
    case 'research':
      return Math.sin(col * 3.7) * Math.cos(row * 2.3) > 0.85;
    default:
      return false;
  }
}

/* ── World mask generation — identical to TilemapManager.generateWorldMask() */

function generateWorldMask() {
  const mask = new Set();
  const cx = GRID_COLS / 2;
  const cy = GRID_ROWS / 2;
  const boundaryNoise  = new ValueNoise2D(24, 5555);
  const boundaryNoise2 = new ValueNoise2D(32, 6666);
  const boundaryNoise3 = new ValueNoise2D(48, 7777);

  const screenCenterX = cx - cy;
  const screenCenterY = cx + cy;
  const rx = (GRID_COLS + GRID_ROWS) * 0.38;
  const ry = (GRID_COLS + GRID_ROWS) * 0.36;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const sx = (col - row) - screenCenterX;
      const sy = (col + row) - screenCenterY;
      const nx = sx / rx;
      const ny = sy / ry;

      const dist = nx * nx + ny * ny;

      const n1 = boundaryNoise.sample(col * 0.18 + 50, row * 0.18 + 50);
      const n2 = boundaryNoise2.sample(col * 0.4 + 70, row * 0.4 + 70);
      const n3 = boundaryNoise3.sample(col * 0.8 + 30, row * 0.8 + 30);
      const n = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
      const threshold = 1.0 + (n - 0.5) * 0.8;

      if (dist < threshold) {
        mask.add(`${col},${row}`);
      }
    }
  }
  return mask;
}

/* ── District shape generation — identical to TilemapManager.generateDistrictShapes() */

function generateDistrictShapes(worldMask) {
  const rand = seededRng(7331);
  const noise  = new ValueNoise2D(32, 7331);
  const noise2 = new ValueNoise2D(48, 4242);
  const roadNoise  = new ValueNoise2D(24, 9999);
  const roadNoise2 = new ValueNoise2D(36, 8888);

  const noiseOffsets = new Map();
  for (const d of ALL_DISTRICTS) {
    noiseOffsets.set(d.category, { ox: rand() * 100, oy: rand() * 100 });
  }

  const districtTiles = new Map();  // category → Set<"col,row">
  const tileLookup = new Map();     // "col,row" → district
  const roadTiles = new Set();

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!worldMask.has(`${col},${row}`)) continue;

      const distances = [];

      for (const d of ALL_DISTRICTS) {
        const dx = col - d.seedCol;
        const dy = row - d.seedRow;
        let baseDist = Math.sqrt(dx * dx + dy * dy) * d.sizeWeight;

        const offset = noiseOffsets.get(d.category);
        const nSample = noise.sample(
          col * d.noiseFrequency + offset.ox,
          row * d.noiseFrequency + offset.oy,
        );
        const nDetail = noise2.sample(
          col * d.noiseFrequency * 2.5 + offset.ox + 50,
          row * d.noiseFrequency * 2.5 + offset.oy + 50,
        );
        const combined = nSample * 0.65 + nDetail * 0.35;
        const noiseTerm = (combined - 0.5) * d.noiseAmplitude * (1 - d.radialBias * 0.3);
        baseDist += noiseTerm;

        distances.push({ dist: baseDist, district: d });
      }

      distances.sort((a, b) => a.dist - b.dist);
      const gap = distances[1].dist - distances[0].dist;

      const rn1 = roadNoise.sample(col * 0.3 + 50, row * 0.3 + 50);
      const rn2 = roadNoise2.sample(col * 0.7 + 80, row * 0.7 + 80);
      const rn = rn1 * 0.6 + rn2 * 0.4;
      const effectiveThreshold = ROAD_THRESHOLD + (rn - 0.5) * 0.4;

      const key = `${col},${row}`;

      if (gap < effectiveThreshold) {
        roadTiles.add(key);
      } else {
        const closest = distances[0].district;
        if (!districtTiles.has(closest.category)) {
          districtTiles.set(closest.category, new Set());
        }
        districtTiles.get(closest.category).add(key);
        tileLookup.set(key, closest);
      }
    }
  }

  return { districtTiles, tileLookup, roadTiles };
}

/* ── Compute district bounds — identical to TilemapManager.computeDistrictBounds() */

function computeDistrictBounds(districtTiles) {
  const bounds = {};
  for (const d of ALL_DISTRICTS) {
    const tiles = districtTiles.get(d.category);
    if (!tiles || tiles.size === 0) continue;

    let minCol = GRID_COLS, maxCol = 0, minRow = GRID_ROWS, maxRow = 0;
    let sumCol = 0, sumRow = 0;

    tiles.forEach(key => {
      const [c, r] = key.split(',').map(Number);
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
      sumCol += c;
      sumRow += r;
    });

    bounds[d.category] = {
      minCol, maxCol, minRow, maxRow,
      centerCol: sumCol / tiles.size,
      centerRow: sumRow / tiles.size,
      tileCount: tiles.size,
    };
  }
  return bounds;
}

/* ── Compute water tiles using BiomeConfig rules ─────────────────────── */

function computeWaterTiles(tileLookup, districtBounds) {
  const water = new Set();
  for (const [key, district] of tileLookup) {
    const [col, row] = key.split(',').map(Number);
    const bounds = districtBounds[district.category];
    if (!bounds) continue;
    if (shouldBeWater(
      col, row, district.category,
      bounds.centerCol, bounds.centerRow,
      Math.max(1, (bounds.maxCol - bounds.minCol) / 2),
      Math.max(1, (bounds.maxRow - bounds.minRow) / 2),
    )) {
      water.add(key);
    }
  }
  return water;
}

/* ── Compute road adjacency for each non-road tile ───────────────────── */

function computeRoadAdjacency(tileLookup, roadTiles) {
  const roadAdjacent = new Set();
  const cardinalOffsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  for (const key of tileLookup.keys()) {
    const [col, row] = key.split(',').map(Number);
    for (const [dc, dr] of cardinalOffsets) {
      if (roadTiles.has(`${col + dc},${row + dr}`)) {
        roadAdjacent.add(key);
        break;
      }
    }
  }
  return roadAdjacent;
}

/* ── Main ────────────────────────────────────────────────────────────── */

console.log('Generating world map (56x56 grid, 6 districts)...');

const worldMask = generateWorldMask();
console.log(`  World mask: ${worldMask.size} tiles`);

const { districtTiles, tileLookup, roadTiles } = generateDistrictShapes(worldMask);
const districtBounds = computeDistrictBounds(districtTiles);

for (const d of ALL_DISTRICTS) {
  const tiles = districtTiles.get(d.category);
  console.log(`  ${d.category}: ${tiles?.size ?? 0} tiles`);
}
console.log(`  Roads: ${roadTiles.size} tiles`);

const waterTiles = computeWaterTiles(tileLookup, districtBounds);
console.log(`  Water: ${waterTiles.size} tiles`);

const roadAdjacent = computeRoadAdjacency(tileLookup, roadTiles);
console.log(`  Road-adjacent: ${roadAdjacent.size} tiles`);

// Build output
const districts = {};
for (const d of ALL_DISTRICTS) {
  const tiles = districtTiles.get(d.category);
  districts[d.category] = tiles ? [...tiles].sort() : [];
}

const output = {
  version: 1,
  gridCols: GRID_COLS,
  gridRows: GRID_ROWS,
  generatedAt: new Date().toISOString(),
  worldMask: [...worldMask].sort(),
  roads: [...roadTiles].sort(),
  water: [...waterTiles].sort(),
  roadAdjacent: [...roadAdjacent].sort(),
  districts,
  districtBounds,
  districtDefs: ALL_DISTRICTS.map(d => ({
    name: d.name,
    category: d.category,
    seedCol: d.seedCol,
    seedRow: d.seedRow,
  })),
};

mkdirSync(DATA_DIR, { recursive: true });
const outPath = join(DATA_DIR, 'district-map.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${outPath} (${(JSON.stringify(output).length / 1024).toFixed(1)} KB)`);
