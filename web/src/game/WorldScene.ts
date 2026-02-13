import * as Phaser from 'phaser';
import { TilemapManager, TILE_WIDTH, TILE_HEIGHT, GRID_COLS, GRID_ROWS, BIOME_NAMES } from './TilemapManager';
import { CameraController } from './CameraController';
import { BuildingManager } from './BuildingManager';
import { GuildHallManager } from './GuildHallManager';
import { ParticleManager } from './ParticleManager';
import { MinimapManager } from './MinimapManager';
import { TreeManager } from './TreeManager';
import { CinematicIntro, SKIP_INTRO } from './CinematicIntro';
import { WorldState } from '@/lib/world-state';
import { BIOME_CONFIG } from './BiomeConfig';
import { seededRng } from './noise';

/* ── Tree spritesheet frame definitions (pixel rects from 288x160 sheet) ── */
const TREE_FRAME_DEFS = [
  { name: 'tree-large-a', x: 0, y: 0, w: 108, h: 160 },  // full left tree incl. trunk
  { name: 'tree-large-b', x: 105, y: 0, w: 108, h: 160 },  // full center tree incl. trunk
  { name: 'tree-medium', x: 205, y: 0, w: 52, h: 85 },  // medium round tree
  { name: 'tree-conifer', x: 258, y: 88, w: 28, h: 62 },  // small pine/conifer
  { name: 'tree-dead', x: 258, y: 25, w: 28, h: 62 },  // bare brown trunk
  { name: 'bush-a', x: 210, y: 82, w: 34, h: 34 },  // round green bush
  { name: 'bush-b', x: 244, y: 56, w: 34, h: 34 },  // yellow-green bush
];

/* ── Per-biome building sprite keys for themed scattering ─────────── */
const BIOME_STRUCTURES: Record<string, string[]> = {
  creative:    ['bldg-herbary-empty', 'bldg-herbary-full', 'tent-pavilion', 'tent-storagetent'],
  townsquare:  ['bldg-church', 'bldg-barracks', 'bldg-signal-fire', 'bldg-firestation'],
  translation: ['tent-hunter', 'tent-storagetent', 'tent-lumberjack', 'tent-pavilion'],
  defi:        ['bldg-firestation', 'bldg-weaponsmith', 'bldg-signal-fire', 'bldg-barracks'],
  research:    ['bldg-herbary-full', 'bldg-church', 'bldg-herbary-empty', 'tent-pavilion'],
  code:        ['bldg-barracks', 'bldg-weaponsmith', 'bldg-firestation', 'bldg-signal-fire'],
};

/* DISTRICT_GRIDS removed — districts are now organic Voronoi shapes in TilemapManager */

/* seededRng imported from noise.ts */

/** Number of tile variants per biome / terrain type. */
const TILE_VARIANT_COUNT = 4;

export class WorldScene extends Phaser.Scene {
  private tilemapManager!: TilemapManager;
  private cameraController!: CameraController;
  private buildingManager!: BuildingManager;
  private guildHallManager!: GuildHallManager;
  private particleManager!: ParticleManager;
  private minimapManager!: MinimapManager;
  private treeManager!: TreeManager;
  private cinematicIntro: CinematicIntro | null = null;
  private buildingPositions: { gx: number; gy: number }[] = [];
  private buildingSprites: Phaser.GameObjects.Image[] = [];
  private waterSprites: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'WorldScene' });
  }

  preload(): void {
    this.load.image('creative-quarter', '/creative-quarter.png');

    // Sailor tents for DeFi Docks
    this.load.image('tent-hunter', '/sailor-tents/hunter/as_hunter0/idle/225/0.png');
    this.load.image('tent-lumberjack', '/sailor-tents/lumberjack/as_lumberjack0/idle/225/0.png');
    this.load.image('tent-pavilion', '/sailor-tents/pavilion/as_pavilion0/idle/225/0.png');
    this.load.image('tent-storagetent', '/sailor-tents/storagetent/as_storagetent0/idle/225/0.png');

    // Isometric Building Pack – all idle variants
    const bp = '/Isometric%20Building%20Pack';
    this.load.image('bldg-barracks', `${bp}/barracks/renders/idle/225/000.png`);
    this.load.image('bldg-church', `${bp}/church/renders/idle/225/000.png`);
    this.load.image('bldg-firestation', `${bp}/firestation/renders/idle/225/000.png`);
    this.load.image('bldg-herbary-empty', `${bp}/herbary/renders/idle_empty/225/000.png`);
    this.load.image('bldg-herbary-full', `${bp}/herbary/renders/idle_full/225/000.png`);
    this.load.image('bldg-signal-fire', `${bp}/signal_fire/renders/idle/225/000.png`);
    this.load.image('bldg-weaponsmith', `${bp}/weaponsmith/renders/idle/225/000.png`);

    // Grass tile texture (dark variant)
    this.load.image('grass-dark', '/grass/tilable-IMG_0044-dark.png');

    // Trees & bushes spritesheet
    this.load.image('trees-sheet', '/trees_and_bushes_pack/trees_and_bushes_pack/trees-and-bushes.png');
  }

  create(): void {
    // Create programmatic textures
    this.createGrassTileTextures();
    this.createBiomeTileTextures();
    this.createWaterTileTextures();
    this.createRoadTileTextures();
    this.createShadowTexture();

    // Background gradient (depth -10, fixed to camera)
    this.createBackgroundGradient();

    this.tilemapManager = new TilemapManager(this);
    this.cameraController = new CameraController(
      this,
      this.tilemapManager.worldWidth,
      this.tilemapManager.worldHeight
    );
    this.buildingManager = new BuildingManager(this);
    this.particleManager = new ParticleManager(this);

    // Lay terrain tiles per biome (depth 0, below district color overlay)
    this.placeTerrainTiles();

    // Scatter random tent/building structures across all districts
    this.scatterStructures();

    // Extract tree frames from spritesheet and scatter trees
    this.extractTreeFrames();
    this.treeManager = new TreeManager(this, this.tilemapManager, this.buildingPositions);
    this.treeManager.scatter();

    // Wire building manager dependencies for tier footprint system
    this.buildingManager.setDependencies(this.tilemapManager, this.treeManager);

    // Guild hall manager — places 1 building per guild in the world
    this.guildHallManager = new GuildHallManager(this);
    this.guildHallManager.setDependencies(this.tilemapManager, this.treeManager);

    // Place natural feature decorations per biome
    this.placeNaturalFeatures();

    // Ambient dust particles across the world center
    const worldCenterX = this.tilemapManager.townSquareCenterScreen.x;
    const worldCenterY = this.tilemapManager.townSquareCenterScreen.y;
    this.particleManager.createDustEmitter(worldCenterX, worldCenterY);

    // Biome-specific particles
    this.particleManager.createBiomeEmitters(this.tilemapManager);

    // Minimap (pass building positions for dot markers)
    this.minimapManager = new MinimapManager(this, this.tilemapManager, this.buildingPositions);

    // Wire minimap bounds as drag exclusion zone
    const mb = this.minimapManager.screenBounds;
    this.cameraController.setExclusionZone(mb.x, mb.y, mb.w, mb.h);
    this.scale.on('resize', () => {
      const b = this.minimapManager.screenBounds;
      this.cameraController.setExclusionZone(b.x, b.y, b.w, b.h);
    });

    // Camera PostFX (vignette + warm color tint)
    this.setupPostFX();

    // Center camera on Town Square
    const { x, y } = this.tilemapManager.townSquareCenterScreen;
    this.cameraController.centerOn(x, y);

    // Cinematic intro — zoomed-out overview, click a district to dive in
    if (!SKIP_INTRO) {
      this.cameraController.disable();
      this.cinematicIntro = new CinematicIntro(
        this, this.cameras.main, this.tilemapManager, this.minimapManager,
        (districtCategory) => {
          this.cameraController.enable();
          this.setBuildingsInteractive(true);
          console.log('Entered district:', districtCategory);
        },
        () => {
          this.cameraController.disable();
          this.setBuildingsInteractive(false);
          console.log('Returned to overview');
        },
      );
    }

    // Signal to React bridge that scene is fully created and ready for worldState
    this.game.events.emit('scene-created');
  }

  update(_time: number, delta: number): void {
    this.cinematicIntro?.update(_time, delta);
  }

  /**
   * Create diamond-clipped grass tile textures from the dark grass image.
   * Used as fallback for non-district, non-road tiles.
   */
  private createGrassTileTextures(): void {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;
    const src = this.textures.get('grass-dark').getSourceImage() as HTMLImageElement;
    const srcW = src.width;
    const srcH = src.height;
    const sampleW = 192;
    const sampleH = 96;

    for (let vi = 0; vi < TILE_VARIANT_COUNT; vi++) {
      const texKey = `grass-tile-${vi}`;
      const canvasTex = this.textures.createCanvas(texKey, TILE_WIDTH, TILE_HEIGHT);
      if (!canvasTex) continue;

      const ctx = canvasTex.context;
      ctx.beginPath();
      ctx.moveTo(hw, 0);
      ctx.lineTo(TILE_WIDTH, hh);
      ctx.lineTo(hw, TILE_HEIGHT);
      ctx.lineTo(0, hh);
      ctx.closePath();
      ctx.clip();

      const ox = (vi % 2) * Math.floor(srcW / 3);
      const oy = Math.floor(vi / 2) * Math.floor(srcH / 3);
      ctx.drawImage(src, ox, oy, sampleW, sampleH, 0, 0, TILE_WIDTH, TILE_HEIGHT);
      canvasTex.refresh();
    }
  }

  /** Create programmatic biome terrain tile textures (4 variants per biome). */
  private createBiomeTileTextures(): void {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;
    const rand = seededRng(1337);

    for (const biomeName of BIOME_NAMES) {
      const biome = BIOME_CONFIG[biomeName];
      if (!biome) continue;

      for (let vi = 0; vi < TILE_VARIANT_COUNT; vi++) {
        const texKey = `biome-${biomeName}-${vi}`;
        const canvasTex = this.textures.createCanvas(texKey, TILE_WIDTH, TILE_HEIGHT);
        if (!canvasTex) continue;

        const ctx = canvasTex.context;

        // Clip to isometric diamond
        ctx.beginPath();
        ctx.moveTo(hw, 0);
        ctx.lineTo(TILE_WIDTH, hh);
        ctx.lineTo(hw, TILE_HEIGHT);
        ctx.lineTo(0, hh);
        ctx.closePath();
        ctx.clip();

        // Fill base color
        ctx.fillStyle = biome.primaryColors[vi % biome.primaryColors.length];
        ctx.fillRect(0, 0, TILE_WIDTH, TILE_HEIGHT);

        // Add noise pattern — different per biome type
        const accentCount = 8 + Math.floor(rand() * 8);
        for (let i = 0; i < accentCount; i++) {
          const ax = rand() * TILE_WIDTH;
          const ay = rand() * TILE_HEIGHT;
          const color = biome.accentColors[Math.floor(rand() * biome.accentColors.length)];
          const size = 1 + rand() * 3;

          ctx.fillStyle = color;
          ctx.globalAlpha = 0.3 + rand() * 0.4;
          ctx.beginPath();
          ctx.arc(ax, ay, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Add biome-specific details
        if (biomeName === 'townsquare') {
          // Cobblestone grid lines
          ctx.strokeStyle = biome.accentColors[0];
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = 0.3;
          for (let g = 8; g < TILE_WIDTH; g += 12) {
            ctx.beginPath();
            ctx.moveTo(g, 0);
            ctx.lineTo(g, TILE_HEIGHT);
            ctx.stroke();
          }
          for (let g = 6; g < TILE_HEIGHT; g += 8) {
            ctx.beginPath();
            ctx.moveTo(0, g);
            ctx.lineTo(TILE_WIDTH, g);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        } else if (biomeName === 'defi') {
          // Lava vein crack lines
          ctx.strokeStyle = biome.accentColors[0];
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4;
          const startX = rand() * TILE_WIDTH;
          const startY = rand() * TILE_HEIGHT;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          for (let s = 0; s < 3; s++) {
            ctx.lineTo(startX + (rand() - 0.5) * 30, startY + (rand() - 0.5) * 20);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (biomeName === 'code') {
          // Snow flecks
          for (let s = 0; s < 5; s++) {
            ctx.fillStyle = biome.accentColors[Math.floor(rand() * biome.accentColors.length)];
            ctx.globalAlpha = 0.2 + rand() * 0.3;
            ctx.fillRect(rand() * TILE_WIDTH, rand() * TILE_HEIGHT, 2 + rand() * 3, 1 + rand() * 2);
          }
          ctx.globalAlpha = 1;
        } else if (biomeName === 'research') {
          // Subtle teal sparkle dots
          for (let s = 0; s < 3; s++) {
            ctx.fillStyle = biome.accentColors[1]; // teal
            ctx.globalAlpha = 0.15 + rand() * 0.2;
            const sx = rand() * TILE_WIDTH;
            const sy = rand() * TILE_HEIGHT;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        canvasTex.refresh();
      }
    }
  }

  /** Create water/liquid tile textures per biome. */
  private createWaterTileTextures(): void {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;
    const rand = seededRng(2468);

    const waterBiomes: { name: string; color: string; highlight: string }[] = [
      { name: 'translation', color: '#2868a0', highlight: '#4888c0' },
      { name: 'creative', color: '#3a7a6a', highlight: '#5aaa8a' },
      { name: 'defi', color: '#c04010', highlight: '#f08030' },
      { name: 'research', color: '#5040a0', highlight: '#7060c0' },
    ];

    for (const wb of waterBiomes) {
      for (let vi = 0; vi < TILE_VARIANT_COUNT; vi++) {
        const texKey = `water-${wb.name}-${vi}`;
        const canvasTex = this.textures.createCanvas(texKey, TILE_WIDTH, TILE_HEIGHT);
        if (!canvasTex) continue;

        const ctx = canvasTex.context;
        ctx.beginPath();
        ctx.moveTo(hw, 0);
        ctx.lineTo(TILE_WIDTH, hh);
        ctx.lineTo(hw, TILE_HEIGHT);
        ctx.lineTo(0, hh);
        ctx.closePath();
        ctx.clip();

        // Base water color
        ctx.fillStyle = wb.color;
        ctx.fillRect(0, 0, TILE_WIDTH, TILE_HEIGHT);

        // Wave highlights
        ctx.strokeStyle = wb.highlight;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3 + rand() * 0.2;
        for (let w = 0; w < 3; w++) {
          const wy = 6 + w * 10 + rand() * 4;
          ctx.beginPath();
          ctx.moveTo(5, wy);
          ctx.bezierCurveTo(20, wy - 3, 40, wy + 3, 60, wy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        canvasTex.refresh();
      }
    }
  }

  /** Create road tile textures (brown/grey cobblestone). */
  private createRoadTileTextures(): void {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;
    const rand = seededRng(5555);

    for (let vi = 0; vi < TILE_VARIANT_COUNT; vi++) {
      const texKey = `road-tile-${vi}`;
      const canvasTex = this.textures.createCanvas(texKey, TILE_WIDTH, TILE_HEIGHT);
      if (!canvasTex) continue;

      const ctx = canvasTex.context;
      ctx.beginPath();
      ctx.moveTo(hw, 0);
      ctx.lineTo(TILE_WIDTH, hh);
      ctx.lineTo(hw, TILE_HEIGHT);
      ctx.lineTo(0, hh);
      ctx.closePath();
      ctx.clip();

      // Dark road base
      const baseColors = ['#504838', '#484030', '#4c4438', '#504840'];
      ctx.fillStyle = baseColors[vi];
      ctx.fillRect(0, 0, TILE_WIDTH, TILE_HEIGHT);

      // Stone pattern
      ctx.fillStyle = '#605848';
      ctx.globalAlpha = 0.4;
      for (let s = 0; s < 6; s++) {
        const sx = rand() * TILE_WIDTH;
        const sy = rand() * TILE_HEIGHT;
        ctx.fillRect(sx, sy, 4 + rand() * 6, 3 + rand() * 4);
      }
      ctx.globalAlpha = 1;

      canvasTex.refresh();
    }
  }

  /** Create an elliptical drop-shadow canvas texture. */
  private createShadowTexture(): void {
    const w = 48;
    const h = 16;
    const tex = this.textures.createCanvas('building-shadow', w, h);
    if (!tex) return;

    const ctx = tex.context;
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.15)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  /**
   * Extract tree frames from the spritesheet and remove the grass background
   * using edge-connected flood fill. This only removes background pixels that
   * are reachable from the frame edges, so it never punches holes in canopies.
   */
  private extractTreeFrames(): void {
    const srcImage = this.textures.get('trees-sheet').getSourceImage() as HTMLImageElement;

    // Sample the grass background color from the top-left corner of the sheet
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = srcImage.width;
    sampleCanvas.height = srcImage.height;
    const sampleCtx = sampleCanvas.getContext('2d')!;
    sampleCtx.drawImage(srcImage, 0, 0);
    const cornerPixel = sampleCtx.getImageData(0, 0, 1, 1).data;
    const bgR = cornerPixel[0], bgG = cornerPixel[1], bgB = cornerPixel[2];

    for (const frame of TREE_FRAME_DEFS) {
      const canvasTex = this.textures.createCanvas(frame.name, frame.w, frame.h);
      if (!canvasTex) continue;

      const ctx = canvasTex.context;
      ctx.drawImage(srcImage, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);

      const imageData = ctx.getImageData(0, 0, frame.w, frame.h);
      const data = imageData.data;
      const w = frame.w;
      const h = frame.h;

      // Check if a pixel looks like the grass background (color distance)
      const isBackground = (idx: number): boolean => {
        const r = data[idx * 4];
        const g = data[idx * 4 + 1];
        const b = data[idx * 4 + 2];
        // Color distance from sampled background
        const dr = r - bgR, dg = g - bgG, db = b - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        return dist < 55; // tolerance for grass texture variation
      };

      // Flood fill from all edge pixels
      const transparent = new Uint8Array(w * h);
      const queue: number[] = [];

      // Seed edges
      for (let x = 0; x < w; x++) {
        queue.push(x);                // top
        queue.push((h - 1) * w + x);  // bottom
      }
      for (let y = 1; y < h - 1; y++) {
        queue.push(y * w);            // left
        queue.push(y * w + (w - 1));  // right
      }

      let qi = 0;
      while (qi < queue.length) {
        const idx = queue[qi++];
        if (idx < 0 || idx >= w * h || transparent[idx]) continue;

        if (!isBackground(idx)) continue;

        transparent[idx] = 1;
        data[idx * 4 + 3] = 0; // set alpha to 0

        const x = idx % w;
        const y = (idx - x) / w;
        if (x > 0) queue.push(idx - 1);
        if (x < w - 1) queue.push(idx + 1);
        if (y > 0) queue.push(idx - w);
        if (y < h - 1) queue.push(idx + w);
      }

      // Soften edges: partially transparent border pixels next to removed ones
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (transparent[idx]) continue; // already removed
          // Check if any neighbor was removed
          const hasTransparentNeighbor =
            (x > 0 && transparent[idx - 1]) ||
            (x < w - 1 && transparent[idx + 1]) ||
            (y > 0 && transparent[idx - w]) ||
            (y < h - 1 && transparent[idx + w]);
          if (hasTransparentNeighbor) {
            data[idx * 4 + 3] = Math.floor(data[idx * 4 + 3] * 0.5);
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      canvasTex.refresh();
    }
  }

  /** Background is handled by Phaser config backgroundColor — no overlay needed. */
  private createBackgroundGradient(): void {
    // Intentionally empty — the Phaser canvas backgroundColor (#1a1a2a)
    // provides a clean flat dark background behind the isometric map.
    // A previous radial gradient overlay created a visible "box" artifact.
  }

  /** Set up camera PostFX: vignette + warm golden tint (WebGL only). */
  private setupPostFX(): void {
    const cam = this.cameras.main;
    if (!cam.postFX) return; // Canvas renderer — skip GPU effects

    // Extremely subtle vignette — barely visible for better initial visibility
    cam.postFX.addVignette(0.5, 0.5, 0.95, 0.01);

    // Brighter scene with warm tint — improved visibility on load
    const colorMatrix = cam.postFX.addColorMatrix();
    colorMatrix.brightness(1.15);
    // Minimal warm shift: keep greens vibrant
    const m = colorMatrix.getData();
    m[0] += 0.05;   // R → R slight warmth
    m[6] += 0.03;   // G → G tiny boost
    m[12] -= 0.01;  // B → B slight reduction
    colorMatrix.set(m);
  }

  /** Place biome-appropriate terrain tiles across the entire world. */
  private placeTerrainTiles(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        // Skip tiles outside the organic world boundary
        if (!this.tilemapManager.isInWorld(col, row)) continue;

        const pos = this.tilemapManager.gridToScreen(col, row);
        const vi = (col + row * 3) % TILE_VARIANT_COUNT;

        const biome = this.tilemapManager.getDistrictBiome(col, row);
        let texKey: string;

        if (biome && this.tilemapManager.isWater(col, row)) {
          // Water/lava tile
          texKey = `water-${biome}-${vi}`;
          // Fallback if this biome has no water textures
          if (!this.textures.exists(texKey)) texKey = `biome-${biome}-${vi}`;

          const sprite = this.add.image(pos.x, pos.y, texKey);
          sprite.setOrigin(0.5, 0.5);
          sprite.setDepth(0);
          this.waterSprites.push(sprite);
        } else if (biome) {
          // Biome terrain tile
          texKey = `biome-${biome}-${vi}`;
          const sprite = this.add.image(pos.x, pos.y, texKey);
          sprite.setOrigin(0.5, 0.5);
          sprite.setDepth(0);
        } else if (this.tilemapManager.isRoad(col, row)) {
          // Road tile
          texKey = `road-tile-${vi}`;
          const sprite = this.add.image(pos.x, pos.y, texKey);
          sprite.setOrigin(0.5, 0.5);
          sprite.setDepth(0);
        } else {
          // Default grass for non-district, non-road tiles
          texKey = `grass-tile-${vi}`;
          const sprite = this.add.image(pos.x, pos.y, texKey);
          sprite.setOrigin(0.5, 0.5);
          sprite.setDepth(0);
        }
      }
    }

    // Water shimmer animation
    if (this.waterSprites.length > 0) {
      this.tweens.add({
        targets: this.waterSprites,
        alpha: { from: 1.0, to: 0.8 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Place biome-specific natural feature decorations using organic tile sets. */
  private placeNaturalFeatures(): void {
    const rand = seededRng(9999);

    /** Pick N random tiles from a district's tile set. */
    const pickTiles = (category: string, count: number): { col: number; row: number }[] => {
      const tiles = this.tilemapManager.getDistrictTiles(category);
      if (!tiles || tiles.size === 0) return [];
      const arr = Array.from(tiles).map(k => {
        const [c, r] = k.split(',').map(Number);
        return { col: c, row: r };
      });
      const result: { col: number; row: number }[] = [];
      for (let i = 0; i < count && arr.length > 0; i++) {
        const idx = Math.floor(rand() * arr.length);
        result.push(arr[idx]);
        arr.splice(idx, 1);
      }
      return result;
    };

    for (const category of BIOME_NAMES) {
      switch (category) {
        case 'code': {
          this.createMountainTexture();
          const bounds = this.tilemapManager.getDistrictBounds('code');
          if (!bounds) break;
          // Pick tiles near the top (low row) of the district for mountain peaks
          const tiles = pickTiles('code', 12).filter(t => t.row <= bounds.centerRow - 1);
          for (const t of tiles.slice(0, 4)) {
            const pos = this.tilemapManager.gridToScreen(t.col, t.row);
            const sprite = this.add.image(pos.x, pos.y - 10, 'feature-mountain');
            sprite.setOrigin(0.5, 0.8);
            sprite.setScale(0.6 + rand() * 0.3);
            sprite.setDepth(5 + (t.col + t.row) * 0.01);
            sprite.setAlpha(0.8);
          }
          break;
        }
        case 'research': {
          this.createCrystalTexture();
          for (const t of pickTiles('research', 6)) {
            if (this.tilemapManager.isWater(t.col, t.row)) continue;
            const pos = this.tilemapManager.gridToScreen(t.col, t.row);
            const sprite = this.add.image(pos.x, pos.y, 'feature-crystal');
            sprite.setOrigin(0.5, 0.8);
            sprite.setScale(0.5 + rand() * 0.4);
            sprite.setDepth(6 + (t.col + t.row) * 0.01);
            sprite.setAlpha(0.7 + rand() * 0.3);
          }
          break;
        }
        case 'townsquare': {
          this.createFountainTexture();
          const center = this.tilemapManager.getDistrictCenter('townsquare');
          if (!center) break;
          const sprite = this.add.image(center.x, center.y, 'feature-fountain');
          sprite.setOrigin(0.5, 0.7);
          sprite.setScale(0.7);
          const bounds = this.tilemapManager.getDistrictBounds('townsquare');
          const depth = bounds ? 6 + (bounds.centerCol + bounds.centerRow) * 0.01 : 6;
          sprite.setDepth(depth);
          break;
        }
        case 'creative': {
          this.createFlowerTexture();
          for (const t of pickTiles('creative', 12)) {
            if (this.tilemapManager.isWater(t.col, t.row)) continue;
            const pos = this.tilemapManager.gridToScreen(t.col, t.row);
            const sprite = this.add.image(pos.x + (rand() - 0.5) * 20, pos.y + (rand() - 0.5) * 10, 'feature-flower');
            sprite.setOrigin(0.5, 0.5);
            sprite.setScale(0.3 + rand() * 0.3);
            sprite.setDepth(0.5);
            sprite.setAlpha(0.7 + rand() * 0.3);
          }
          break;
        }
      }
    }
  }

  private createMountainTexture(): void {
    if (this.textures.exists('feature-mountain')) return;
    const w = 64, h = 48;
    const tex = this.textures.createCanvas('feature-mountain', w, h);
    if (!tex) return;
    const ctx = tex.context;
    // Grey mountain peak with snow cap
    ctx.fillStyle = '#707880';
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w - 8, h);
    ctx.lineTo(8, h);
    ctx.closePath();
    ctx.fill();
    // Snow cap
    ctx.fillStyle = '#e0e8f0';
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w / 2 + 12, 18);
    ctx.lineTo(w / 2 - 12, 18);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }

  private createCrystalTexture(): void {
    if (this.textures.exists('feature-crystal')) return;
    const w = 24, h = 36;
    const tex = this.textures.createCanvas('feature-crystal', w, h);
    if (!tex) return;
    const ctx = tex.context;
    // Purple crystal
    ctx.fillStyle = '#8a60c0';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w - 2, h * 0.6);
    ctx.lineTo(w / 2, h);
    ctx.lineTo(2, h * 0.6);
    ctx.closePath();
    ctx.fill();
    // Highlight facet
    ctx.fillStyle = '#b090e0';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 + 6, h * 0.4);
    ctx.lineTo(w / 2, h * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    tex.refresh();
  }

  private createFountainTexture(): void {
    if (this.textures.exists('feature-fountain')) return;
    const w = 32, h = 32;
    const tex = this.textures.createCanvas('feature-fountain', w, h);
    if (!tex) return;
    const ctx = tex.context;
    // Stone base
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.7, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Water
    ctx.fillStyle = '#4088c0';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.65, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Center pillar
    ctx.fillStyle = '#999999';
    ctx.fillRect(w / 2 - 2, h * 0.3, 4, h * 0.4);
    tex.refresh();
  }

  private createFlowerTexture(): void {
    if (this.textures.exists('feature-flower')) return;
    const w = 10, h = 10;
    const tex = this.textures.createCanvas('feature-flower', w, h);
    if (!tex) return;
    const ctx = tex.context;
    const colors = ['#e88cb0', '#f0d060', '#ff9090', '#ffa0d0'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(2 + (i % 2) * 6, 2 + Math.floor(i / 2) * 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    tex.refresh();
  }

  /**
   * Randomly scatter tent / building structures across every district.
   * Uses organic tile sets from TilemapManager for placement.
   */
  private scatterStructures(): void {
    const rand = seededRng(42);
    const AMBIENT_PER_DISTRICT = 5;  // reduced — guild halls are the main buildings now
    const MIN_DIST_SQ = 3.0 * 3.0;   // min distance² between ambient structures

    for (const category of BIOME_NAMES) {
      const tileSet = this.tilemapManager.getDistrictTiles(category);
      if (!tileSet || tileSet.size === 0) continue;

      const tileArr = Array.from(tileSet).map(k => {
        const [c, r] = k.split(',').map(Number);
        return { col: c, row: r };
      });

      const placed: { gx: number; gy: number }[] = [];
      let attempts = 0;

      while (placed.length < AMBIENT_PER_DISTRICT && attempts < 60) {
        attempts++;

        const tile = tileArr[Math.floor(rand() * tileArr.length)];
        const gx = tile.col + (rand() - 0.5) * 0.6;
        const gy = tile.row + (rand() - 0.5) * 0.6;

        const tooClose = placed.some(
          p => (p.gx - gx) ** 2 + (p.gy - gy) ** 2 < MIN_DIST_SQ,
        );
        if (tooClose) continue;

        placed.push({ gx, gy });
        this.buildingPositions.push({ gx, gy });

        if (this.tilemapManager.isWater(tile.col, tile.row)) continue;

        const pos = this.tilemapManager.gridToScreen(gx, gy);
        const biomeKeys = BIOME_STRUCTURES[category] ?? Object.values(BIOME_STRUCTURES).flat();
        const key = biomeKeys[Math.floor(rand() * biomeKeys.length)];
        const scale = 0.35 + rand() * 0.1;

        // Drop shadow
        const shadow = this.add.image(pos.x + 4, pos.y + 6, 'building-shadow');
        shadow.setOrigin(0.5, 0.5);
        shadow.setScale(scale * 1.8, scale * 1.2);
        shadow.setDepth(0.5);

        // Ambient building sprite (non-interactive decoration)
        const sprite = this.add.image(pos.x, pos.y, key);
        sprite.setOrigin(0.5, 0.85);
        sprite.setScale(scale);
        sprite.setDepth(7 + (gx + gy) * 0.01);
        sprite.setAlpha(0.7); // dimmed to distinguish from guild halls
        this.buildingSprites.push(sprite);

        // Chimney smoke for eligible buildings
        this.particleManager.addSmokeIfEligible(key, pos.x, pos.y);
      }
    }
  }

  /** Enable/disable building hover + click interactivity (district view only). */
  setBuildingsInteractive(enabled: boolean): void {
    // Guild halls are the main interactive buildings
    this.guildHallManager?.setInteractive(enabled);
  }

  /** Public method for React UI to trigger return to world view. */
  exitToOverview(): void {
    this.cinematicIntro?.exitToOverview();
  }

  updateWorldState(worldState: WorldState): void {
    if (!worldState) return;
    // Guard: managers aren't ready until create() completes
    if (!this.guildHallManager || !this.buildingManager) return;
    // Place/update guild hall buildings (1 per guild)
    this.guildHallManager.updateGuildHalls(worldState.guilds);
    // Place/update per-agent buildings (tier-based)
    this.buildingManager.updateBuildings(worldState.guilds, worldState.agents);
  }

  shutdown(): void {
    this.cinematicIntro?.destroy();
    this.cameraController?.destroy();
    this.tilemapManager?.destroy();
    this.buildingManager?.destroy();
    this.guildHallManager?.destroy();
    this.particleManager?.destroy();
    this.minimapManager?.destroy();
    this.treeManager?.destroy();
  }
}
