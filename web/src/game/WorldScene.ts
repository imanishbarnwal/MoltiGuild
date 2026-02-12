import * as Phaser from 'phaser';
import { TilemapManager, TILE_WIDTH, TILE_HEIGHT, GRID_SIZE } from './TilemapManager';
import { CameraController } from './CameraController';
import { BuildingManager } from './BuildingManager';
import { ParticleManager } from './ParticleManager';
import { MinimapManager } from './MinimapManager';
import { TreeManager } from './TreeManager';
import { CinematicIntro, SKIP_INTRO } from './CinematicIntro';
import { WorldState } from '@/lib/world-state';

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

/* ── Tent + building sprite keys for random scattering ─────────────── */
const TENANT_KEYS = [
  'tent-hunter',
  'tent-lumberjack',
  'tent-pavilion',
  'tent-storagetent',
  'bldg-barracks',
  'bldg-church',
  'bldg-firestation',
  'bldg-herbary-empty',
  'bldg-herbary-full',
  'bldg-signal-fire',
  'bldg-weaponsmith',
];

/* ── All district regions for structure scattering ────────────────── */
const DISTRICT_GRIDS = [
  { gridX: 1, gridY: 1, width: 8, height: 8 },  // Creative Quarter
  { gridX: 19, gridY: 1, width: 8, height: 8 },  // Translation Ward
  { gridX: 19, gridY: 19, width: 8, height: 8 },  // Code Heights
  { gridX: 1, gridY: 19, width: 8, height: 8 },  // DeFi Docks
  { gridX: 19, gridY: 10, width: 8, height: 8 },  // Research Fields
  { gridX: 10, gridY: 10, width: 8, height: 8 },  // Town Square
];

/** Simple seeded PRNG (mulberry32) for deterministic random placement. */
function seededRng(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Number of grass tile variants sampled from different offsets of the texture. */
const GRASS_VARIANT_COUNT = 4;

export class WorldScene extends Phaser.Scene {
  private tilemapManager!: TilemapManager;
  private cameraController!: CameraController;
  private buildingManager!: BuildingManager;
  private particleManager!: ParticleManager;
  private minimapManager!: MinimapManager;
  private treeManager!: TreeManager;
  private cinematicIntro: CinematicIntro | null = null;
  private buildingPositions: { gx: number; gy: number }[] = [];

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

    // Lay grass ground on every tile (depth 0, below district color overlay)
    this.placeGrassTiles();

    // Scatter random tent/building structures across all districts
    this.scatterStructures();

    // Extract tree frames from spritesheet and scatter trees
    this.extractTreeFrames();
    this.treeManager = new TreeManager(this, this.tilemapManager, this.buildingPositions);
    this.treeManager.scatter();

    // Ambient dust particles across the world center
    const worldCenterX = this.tilemapManager.townSquareCenterScreen.x;
    const worldCenterY = this.tilemapManager.townSquareCenterScreen.y;
    this.particleManager.createDustEmitter(worldCenterX, worldCenterY);

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
          console.log('Entered district:', districtCategory);
        },
        () => {
          this.cameraController.disable();
          console.log('Returned to overview');
        },
      );
    }
  }

  update(_time: number, delta: number): void {
    this.cinematicIntro?.update(_time, delta);
  }

  /**
   * Create diamond-clipped grass tile textures from the dark grass image.
   * Samples from different offsets in the tileable texture for subtle variety.
   */
  private createGrassTileTextures(): void {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;
    const src = this.textures.get('grass-dark').getSourceImage() as HTMLImageElement;
    const srcW = src.width;
    const srcH = src.height;

    // Sample region in source texture — scale down for natural grass look
    const sampleW = 192;
    const sampleH = 96;

    for (let vi = 0; vi < GRASS_VARIANT_COUNT; vi++) {
      const texKey = `grass-tile-${vi}`;
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

      // Sample from different offset in the tileable source for each variant
      const ox = (vi % 2) * Math.floor(srcW / 3);
      const oy = Math.floor(vi / 2) * Math.floor(srcH / 3);

      ctx.drawImage(src, ox, oy, sampleW, sampleH, 0, 0, TILE_WIDTH, TILE_HEIGHT);
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

  /** Place dark grass on every tile — uniform texture across the entire land. */
  private placeGrassTiles(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const pos = this.tilemapManager.gridToScreen(col, row);

        // Pick variant based on tile position for subtle variety
        const vi = (col + row * 3) % GRASS_VARIANT_COUNT;
        const texKey = `grass-tile-${vi}`;

        const sprite = this.add.image(pos.x, pos.y, texKey);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(0);
      }
    }
  }

  /**
   * Randomly scatter tent / building structures across every district.
   * Uses a seeded PRNG so the layout is deterministic between reloads.
   */
  private scatterStructures(): void {
    const rand = seededRng(42);
    const STRUCTURES_PER_DISTRICT = 10;
    const MIN_DIST_SQ = 2.5 * 2.5;  // min distance² between structures (in grid units)

    for (const district of DISTRICT_GRIDS) {
      const placed: { gx: number; gy: number }[] = [];

      let attempts = 0;
      while (placed.length < STRUCTURES_PER_DISTRICT && attempts < 80) {
        attempts++;

        // Random position within the district (with 0.5-tile inset to avoid edges)
        const gx = district.gridX + 0.5 + rand() * (district.width - 1);
        const gy = district.gridY + 0.5 + rand() * (district.height - 1);

        // Check minimum spacing against already-placed structures
        const tooClose = placed.some(
          p => (p.gx - gx) ** 2 + (p.gy - gy) ** 2 < MIN_DIST_SQ,
        );
        if (tooClose) continue;

        placed.push({ gx, gy });
        this.buildingPositions.push({ gx, gy });

        const pos = this.tilemapManager.gridToScreen(gx, gy);
        const key = TENANT_KEYS[Math.floor(rand() * TENANT_KEYS.length)];
        const scale = 0.4 + rand() * 0.15;

        // Drop shadow beneath building
        const shadow = this.add.image(pos.x + 4, pos.y + 6, 'building-shadow');
        shadow.setOrigin(0.5, 0.5);
        shadow.setScale(scale * 1.8, scale * 1.2);
        shadow.setDepth(0.5);

        // Building sprite
        const sprite = this.add.image(pos.x, pos.y, key);
        sprite.setOrigin(0.5, 0.85);
        sprite.setScale(scale);
        sprite.setDepth(7 + (gx + gy) * 0.01);

        // Chimney smoke for eligible buildings
        this.particleManager.addSmokeIfEligible(key, pos.x, pos.y);
      }
    }
  }

  updateWorldState(worldState: WorldState): void {
    if (!worldState) return;
    this.buildingManager.updateBuildings(worldState.guilds, worldState.agents);
  }

  shutdown(): void {
    this.cinematicIntro?.destroy();
    this.cameraController?.destroy();
    this.tilemapManager?.destroy();
    this.buildingManager?.destroy();
    this.particleManager?.destroy();
    this.minimapManager?.destroy();
    this.treeManager?.destroy();
  }
}
