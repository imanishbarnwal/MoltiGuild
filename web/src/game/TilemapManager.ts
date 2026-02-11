import * as Phaser from 'phaser';

interface DistrictDef {
  name: string;
  category: string;
  label: string;
  color: number;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
}

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
const ROAD_COLOR = 0x566573;

const DISTRICTS: DistrictDef[] = [
  { name: 'Creative Quarter',  category: 'creative',    label: '\u{1F3A8} Creative Quarter',  color: 0xe8a87c, gridX: 1,  gridY: 1,  width: 8, height: 8 },
  { name: 'Translation Ward',  category: 'translation', label: '\u{1F310} Translation Ward',  color: 0x85c1e9, gridX: 19, gridY: 1,  width: 8, height: 8 },
  { name: 'Code Heights',      category: 'code',        label: '\u{1F9E0} Code Heights',      color: 0x7dcea0, gridX: 19, gridY: 19, width: 8, height: 8 },
  { name: 'DeFi Docks',        category: 'defi',        label: '\u{1F4B0} DeFi Docks',        color: 0xf4d03f, gridX: 1,  gridY: 19, width: 8, height: 8 },
  { name: 'Research Fields',   category: 'research',    label: '\u{1F52C} Research Fields',   color: 0x76d7c4, gridX: 19, gridY: 10, width: 8, height: 8 },
];

const TOWN_SQUARE: DistrictDef = {
  name: 'Town Square',
  category: 'townsquare',
  label: '\u{1F4CB} Town Square',
  color: 0xd5dbdb,
  gridX: 10,
  gridY: 10,
  width: 8,
  height: 8,
};

const ALL_DISTRICTS = [...DISTRICTS, TOWN_SQUARE];

export const GRID_SIZE = 28;

/** Seeded PRNG (mulberry32) for deterministic irregular shapes. */
function seededRng(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class TilemapManager {
  private graphics: Phaser.GameObjects.Graphics;
  private hoverGraphics: Phaser.GameObjects.Graphics;
  private cursorGraphics: Phaser.GameObjects.Graphics;
  private gridOverlay: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Container[] = [];
  private hoveredDistrict: DistrictDef | null = null;
  private highlightedCell: { col: number; row: number } | null = null;
  private gridVisible = false;
  private offsetX: number;
  private offsetY: number;
  public worldWidth: number;
  public worldHeight: number;
  public townSquareCenterScreen: { x: number; y: number };

  /** Per-district set of "col,row" keys defining the irregular shape. */
  private districtTiles: Map<string, Set<string>> = new Map();
  /** Reverse lookup: "col,row" → DistrictDef for fast hover/click. */
  private tileLookup: Map<string, DistrictDef> = new Map();

  constructor(private scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1);
    this.hoverGraphics = scene.add.graphics();
    this.hoverGraphics.setDepth(5);

    // Cursor tile highlight (depth 4)
    this.cursorGraphics = scene.add.graphics();
    this.cursorGraphics.setDepth(4);

    // Grid overlay – pre-rendered, hidden by default (depth 3)
    this.gridOverlay = scene.add.graphics();
    this.gridOverlay.setDepth(3);
    this.gridOverlay.setVisible(false);

    this.offsetX = (GRID_SIZE * TILE_WIDTH) / 2 + 100;
    this.offsetY = 100;

    this.worldWidth = GRID_SIZE * TILE_WIDTH;
    this.worldHeight = GRID_SIZE * TILE_HEIGHT;

    const tcCol = TOWN_SQUARE.gridX + TOWN_SQUARE.width / 2;
    const tcRow = TOWN_SQUARE.gridY + TOWN_SQUARE.height / 2;
    this.townSquareCenterScreen = this.gridToScreen(tcCol, tcRow);

    this.generateDistrictShapes();
    this.render();
    this.drawGridLines();
    this.setupPointerTracking();
    this.setupGridToggle();
  }

  /* ── Coordinate helpers ──────────────────────────────────────────── */

  public gridToScreen(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * (TILE_WIDTH / 2) + this.offsetX,
      y: (col + row) * (TILE_HEIGHT / 2) + this.offsetY,
    };
  }

  /** Convert a world-space point to the grid cell it falls within. */
  public screenToGrid(worldX: number, worldY: number): { col: number; row: number } | null {
    const relX = worldX - this.offsetX;
    const relY = worldY - this.offsetY;

    const a = relX / (TILE_WIDTH / 2);
    const b = relY / (TILE_HEIGHT / 2);

    const colF = (a + b) / 2;
    const rowF = (b - a) / 2;

    const baseCol = Math.floor(colF);
    const baseRow = Math.floor(rowF);

    for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const c = baseCol + dc;
      const r = baseRow + dr;
      if (c < 0 || r < 0 || c >= GRID_SIZE || r >= GRID_SIZE) continue;
      if (this.isPointInTile(worldX, worldY, c, r)) {
        return { col: c, row: r };
      }
    }
    return null;
  }

  private isPointInTile(px: number, py: number, col: number, row: number): boolean {
    const { x, y } = this.gridToScreen(col, row);
    return Math.abs(px - x) / (TILE_WIDTH / 2) + Math.abs(py - y) / (TILE_HEIGHT / 2) <= 1;
  }

  /* ── Irregular district shape generation ─────────────────────────── */

  private generateDistrictShapes(): void {
    const rand = seededRng(7331);

    for (const district of ALL_DISTRICTS) {
      const tiles = new Set<string>();
      const cx = district.gridX + district.width / 2;
      const cy = district.gridY + district.height / 2;

      for (let row = district.gridY; row < district.gridY + district.height; row++) {
        for (let col = district.gridX; col < district.gridX + district.width; col++) {
          if (col < 0 || row < 0 || col >= GRID_SIZE || row >= GRID_SIZE) continue;

          const edgeDist = Math.min(
            col - district.gridX,
            district.gridX + district.width - 1 - col,
            row - district.gridY,
            district.gridY + district.height - 1 - row,
          );

          const dx = (col + 0.5 - cx) / (district.width / 2);
          const dy = (row + 0.5 - cy) / (district.height / 2);
          const centerDist = Math.sqrt(dx * dx + dy * dy);

          let include = true;
          if (edgeDist === 0) {
            include = rand() < (0.35 - centerDist * 0.1);
          } else if (edgeDist === 1) {
            include = rand() < 0.7;
          }

          if (include) {
            const key = `${col},${row}`;
            if (!this.tileLookup.has(key)) {
              tiles.add(key);
              this.tileLookup.set(key, district);
            }
          }
        }
      }

      const bulgeOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (let row = district.gridY; row < district.gridY + district.height; row++) {
        for (let col = district.gridX; col < district.gridX + district.width; col++) {
          const edgeDist = Math.min(
            col - district.gridX,
            district.gridX + district.width - 1 - col,
            row - district.gridY,
            district.gridY + district.height - 1 - row,
          );
          if (edgeDist !== 0) continue;

          for (const [dc, dr] of bulgeOffsets) {
            const nc = col + dc;
            const nr = row + dr;
            if (nc < 0 || nr < 0 || nc >= GRID_SIZE || nr >= GRID_SIZE) continue;

            const inside = nc >= district.gridX && nc < district.gridX + district.width &&
                           nr >= district.gridY && nr < district.gridY + district.height;
            if (inside) continue;

            const key = `${nc},${nr}`;
            if (this.tileLookup.has(key)) continue;
            if (this.isRoad(nc, nr)) continue;

            if (rand() < 0.2) {
              tiles.add(key);
              this.tileLookup.set(key, district);
            }
          }
        }
      }

      this.districtTiles.set(district.category, tiles);
    }
  }

  /* ── Drawing helpers ─────────────────────────────────────────────── */

  private drawTileFill(gfx: Phaser.GameObjects.Graphics, col: number, row: number, color: number, alpha: number): void {
    const { x, y } = this.gridToScreen(col, row);
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    gfx.fillStyle(color, alpha);
    gfx.beginPath();
    gfx.moveTo(x, y - hh);
    gfx.lineTo(x + hw, y);
    gfx.lineTo(x, y + hh);
    gfx.lineTo(x - hw, y);
    gfx.closePath();
    gfx.fillPath();
  }

  private drawDiamondStroke(gfx: Phaser.GameObjects.Graphics, col: number, row: number): void {
    const { x, y } = this.gridToScreen(col, row);
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    gfx.beginPath();
    gfx.moveTo(x, y - hh);
    gfx.lineTo(x + hw, y);
    gfx.lineTo(x, y + hh);
    gfx.lineTo(x - hw, y);
    gfx.closePath();
    gfx.strokePath();
  }

  private darken(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) - amount);
    const g = Math.max(0, ((color >> 8) & 0xff) - amount);
    const b = Math.max(0, (color & 0xff) - amount);
    return (r << 16) | (g << 8) | b;
  }

  private lighten(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + amount);
    const g = Math.min(255, ((color >> 8) & 0xff) + amount);
    const b = Math.min(255, (color & 0xff) + amount);
    return (r << 16) | (g << 8) | b;
  }

  public isRoad(col: number, row: number): boolean {
    const hRoad1 = row === 9 && col >= 0 && col < GRID_SIZE;
    const hRoad2 = row === 18 && col >= 0 && col < GRID_SIZE;
    const vRoad1 = col === 9 && row >= 0 && row < GRID_SIZE;
    const vRoad2 = col === 18 && row >= 0 && row < GRID_SIZE;
    const crossH = row >= 13 && row <= 14 && col >= 0 && col < GRID_SIZE;
    const crossV = col >= 13 && col <= 14 && row >= 0 && row < GRID_SIZE;
    return hRoad1 || hRoad2 || vRoad1 || vRoad2 || crossH || crossV;
  }

  /* ── Cursor tile highlight ───────────────────────────────────────── */

  private drawCursorHighlight(col: number, row: number): void {
    this.cursorGraphics.clear();
    const { x, y } = this.gridToScreen(col, row);
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    // Subtle white diamond outline
    this.cursorGraphics.lineStyle(1.5, 0xffffff, 0.5);
    this.drawDiamondStroke(this.cursorGraphics, col, row);

    // Faint fill
    this.cursorGraphics.fillStyle(0xffffff, 0.08);
    this.cursorGraphics.beginPath();
    this.cursorGraphics.moveTo(x, y - hh);
    this.cursorGraphics.lineTo(x + hw, y);
    this.cursorGraphics.lineTo(x, y + hh);
    this.cursorGraphics.lineTo(x - hw, y);
    this.cursorGraphics.closePath();
    this.cursorGraphics.fillPath();
  }

  /* ── Grid overlay (toggle with G key) ────────────────────────────── */

  private drawGridLines(): void {
    this.gridOverlay.lineStyle(0.5, 0xffffff, 0.12);
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.drawDiamondStroke(this.gridOverlay, col, row);
      }
    }
  }

  private setupGridToggle(): void {
    if (!this.scene.input.keyboard) return;
    this.scene.input.keyboard.on('keydown-G', () => {
      this.gridVisible = !this.gridVisible;
      this.gridOverlay.setVisible(this.gridVisible);
    });
  }

  /* ── Pointer tracking ────────────────────────────────────────────── */

  private setupPointerTracking(): void {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const cell = this.screenToGrid(pointer.worldX, pointer.worldY);

      // Update cursor tile highlight
      if (cell && (cell.col !== this.highlightedCell?.col || cell.row !== this.highlightedCell?.row)) {
        this.highlightedCell = cell;
        this.drawCursorHighlight(cell.col, cell.row);
      } else if (!cell && this.highlightedCell) {
        this.highlightedCell = null;
        this.cursorGraphics.clear();
      }

      // Update district hover
      let found: DistrictDef | null = null;
      if (cell) {
        const key = `${cell.col},${cell.row}`;
        found = this.tileLookup.get(key) ?? null;
      }

      if (found !== this.hoveredDistrict) {
        this.hoveredDistrict = found;
        this.drawHoverOverlay();
        this.scene.game.canvas.style.cursor = found ? 'pointer' : 'default';
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const dist = Phaser.Math.Distance.Between(
        pointer.downX, pointer.downY, pointer.upX, pointer.upY,
      );
      if (dist > 8) return;

      const cell = this.screenToGrid(pointer.worldX, pointer.worldY);
      if (!cell) return;

      const key = `${cell.col},${cell.row}`;
      const district = this.tileLookup.get(key);
      if (district) this.onDistrictClick(district);
    });
  }

  /* ── Hover overlay ───────────────────────────────────────────────── */

  private drawHoverOverlay(): void {
    this.hoverGraphics.clear();
    if (!this.hoveredDistrict) return;

    const d = this.hoveredDistrict;
    const tiles = this.districtTiles.get(d.category);
    if (!tiles) return;

    const brightColor = this.lighten(d.color, 35);

    tiles.forEach((key) => {
      const [col, row] = key.split(',').map(Number);
      this.drawTileFill(this.hoverGraphics, col, row, brightColor, 0.3);
    });
  }

  /* ── Click handling ──────────────────────────────────────────────── */

  private onDistrictClick(district: DistrictDef): void {
    console.log('Clicked district:', district.name);

    this.scene.game.events.emit('district-clicked', {
      name: district.name,
      category: district.category,
    });

    this.flashDistrict(district);
  }

  private flashDistrict(district: DistrictDef): void {
    const tiles = this.districtTiles.get(district.category);
    if (!tiles) return;

    const flashGfx = this.scene.add.graphics();
    flashGfx.setDepth(6);

    tiles.forEach((key) => {
      const [col, row] = key.split(',').map(Number);
      this.drawTileFill(flashGfx, col, row, 0xffffff, 1);
    });

    flashGfx.setAlpha(0.5);
    this.scene.tweens.add({
      targets: flashGfx,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => flashGfx.destroy(),
    });
  }

  /* ── Main render ─────────────────────────────────────────────────── */

  private render(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const key = `${col},${row}`;
        const district = this.tileLookup.get(key);

        if (district) {
          this.drawTileFill(this.graphics, col, row, district.color, 0.25);
        } else if (this.isRoad(col, row)) {
          this.drawTileFill(this.graphics, col, row, ROAD_COLOR, 0.25);
        }
        // Non-district, non-road tiles: no overlay — grass tile shows through
      }
    }

    for (const district of ALL_DISTRICTS) {
      this.addLabel(district);
    }
  }

  /* ── Styled label badges ─────────────────────────────────────────── */

  private addLabel(district: DistrictDef): void {
    const centerCol = district.gridX + district.width / 2;
    const centerRow = district.gridY + district.height / 2;
    const { x, y } = this.gridToScreen(centerCol, centerRow);

    const labelText = district.name;

    // Text element
    const text = this.scene.add.text(0, 0, labelText, {
      fontSize: '13px',
      color: '#e0e0e0',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    });
    text.setOrigin(0, 0.5);

    const paddingX = 8;
    const paddingY = 5;
    const dotRadius = 4;
    const dotGap = 6;
    const totalWidth = text.width + paddingX * 2 + dotRadius * 2 + dotGap;
    const totalHeight = text.height + paddingY * 2;

    // Rounded-rect background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.65);
    bg.fillRoundedRect(-totalWidth / 2, -totalHeight / 2, totalWidth, totalHeight, 6);
    bg.lineStyle(1, 0xffffff, 0.15);
    bg.strokeRoundedRect(-totalWidth / 2, -totalHeight / 2, totalWidth, totalHeight, 6);

    // Colored dot indicating zone type
    const dot = this.scene.add.graphics();
    dot.fillStyle(district.color, 1);
    dot.fillCircle(-totalWidth / 2 + paddingX + dotRadius, 0, dotRadius);

    // Position text after the dot
    text.setX(-totalWidth / 2 + paddingX + dotRadius * 2 + dotGap);

    // Assemble into container
    const container = this.scene.add.container(x, y, [bg, dot, text]);
    container.setDepth(10);
    container.setAlpha(0);

    // Fade-in animation
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 600,
      delay: 200,
      ease: 'Cubic.easeOut',
    });

    this.labels.push(container);
  }

  /* ── Public API ──────────────────────────────────────────────────── */

  /** Set all district label alphas immediately (used to hide during intro). */
  setLabelsAlpha(alpha: number): void {
    for (const label of this.labels) {
      this.scene.tweens.killTweensOf(label);
      label.setAlpha(alpha);
    }
  }

  /** Fade in district labels with staggered timing (100ms apart). */
  fadeInLabelsStaggered(duration = 400, startDelay = 0): void {
    this.labels.forEach((label, i) => {
      label.setAlpha(0);
      this.scene.tweens.add({
        targets: label,
        alpha: 1,
        duration,
        delay: startDelay + i * 100,
        ease: 'Cubic.easeOut',
      });
    });
  }

  getDistrictCenter(category: string): { x: number; y: number } | null {
    const district = ALL_DISTRICTS.find(d => d.category === category);
    if (!district) return null;
    const centerCol = district.gridX + district.width / 2;
    const centerRow = district.gridY + district.height / 2;
    return this.gridToScreen(centerCol, centerRow);
  }

  getDistrictTiles(category: string): Set<string> | undefined {
    return this.districtTiles.get(category);
  }

  getTileDistrict(col: number, row: number): string | undefined {
    return this.tileLookup.get(`${col},${row}`)?.category;
  }

  destroy(): void {
    this.graphics.destroy();
    this.hoverGraphics.destroy();
    this.cursorGraphics.destroy();
    this.gridOverlay.destroy();
    for (const label of this.labels) label.destroy(true);
    this.labels = [];
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown-G');
    }
    this.scene.game.canvas.style.cursor = 'default';
  }
}
