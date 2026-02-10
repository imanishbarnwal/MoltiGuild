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

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const ROAD_COLOR = 0x566573;
const ROAD_STROKE = 0x3d4852;

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

const GRID_SIZE = 28;

export class TilemapManager {
  private graphics: Phaser.GameObjects.Graphics;
  private hoverGraphics: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private districtZones: Phaser.GameObjects.Zone[] = [];
  private hoveredDistrict: DistrictDef | null = null;
  private offsetX: number;
  private offsetY: number;
  public worldWidth: number;
  public worldHeight: number;
  public townSquareCenterScreen: { x: number; y: number };

  constructor(private scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.hoverGraphics = scene.add.graphics();
    this.hoverGraphics.setDepth(5);

    this.offsetX = (GRID_SIZE * TILE_WIDTH) / 2 + 100;
    this.offsetY = 100;

    this.worldWidth = GRID_SIZE * TILE_WIDTH;
    this.worldHeight = GRID_SIZE * TILE_HEIGHT;

    const tcCol = TOWN_SQUARE.gridX + TOWN_SQUARE.width / 2;
    const tcRow = TOWN_SQUARE.gridY + TOWN_SQUARE.height / 2;
    this.townSquareCenterScreen = this.gridToScreen(tcCol, tcRow);

    this.render();
    this.createDistrictHitAreas();
    this.setupPointerTracking();
  }

  private gridToScreen(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * (TILE_WIDTH / 2) + this.offsetX,
      y: (col + row) * (TILE_HEIGHT / 2) + this.offsetY,
    };
  }

  private drawTile(col: number, row: number, fillColor: number, strokeColor: number): void {
    const { x, y } = this.gridToScreen(col, row);
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    this.graphics.fillStyle(fillColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y - hh);
    this.graphics.lineTo(x + hw, y);
    this.graphics.lineTo(x, y + hh);
    this.graphics.lineTo(x - hw, y);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.lineStyle(1, strokeColor, 0.5);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y - hh);
    this.graphics.lineTo(x + hw, y);
    this.graphics.lineTo(x, y + hh);
    this.graphics.lineTo(x - hw, y);
    this.graphics.closePath();
    this.graphics.strokePath();
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

  private isInDistrict(col: number, row: number, d: DistrictDef): boolean {
    return col >= d.gridX && col < d.gridX + d.width &&
           row >= d.gridY && row < d.gridY + d.height;
  }

  private isRoad(col: number, row: number): boolean {
    const hRoad1 = row >= 9 && row <= 9 && col >= 0 && col < GRID_SIZE;
    const hRoad2 = row >= 18 && row <= 18 && col >= 0 && col < GRID_SIZE;
    const vRoad1 = col >= 9 && col <= 9 && row >= 0 && row < GRID_SIZE;
    const vRoad2 = col >= 18 && col <= 18 && row >= 0 && row < GRID_SIZE;
    const crossH = row >= 13 && row <= 14 && col >= 0 && col < GRID_SIZE;
    const crossV = col >= 13 && col <= 14 && row >= 0 && row < GRID_SIZE;
    return hRoad1 || hRoad2 || vRoad1 || vRoad2 || crossH || crossV;
  }

  /** Get the 4 corner points of a district's isometric diamond bounding shape */
  private getDistrictDiamond(d: DistrictDef): { top: {x:number,y:number}, right: {x:number,y:number}, bottom: {x:number,y:number}, left: {x:number,y:number} } {
    const topLeft = this.gridToScreen(d.gridX, d.gridY);
    const topRight = this.gridToScreen(d.gridX + d.width, d.gridY);
    const bottomRight = this.gridToScreen(d.gridX + d.width, d.gridY + d.height);
    const bottomLeft = this.gridToScreen(d.gridX, d.gridY + d.height);

    return {
      top:    { x: topLeft.x,     y: topLeft.y - TILE_HEIGHT / 2 },
      right:  { x: topRight.x + TILE_WIDTH / 2,   y: topRight.y },
      bottom: { x: bottomRight.x, y: bottomRight.y + TILE_HEIGHT / 2 },
      left:   { x: bottomLeft.x - TILE_WIDTH / 2,  y: bottomLeft.y },
    };
  }

  /** Point-in-diamond test using cross products */
  private isPointInDiamond(px: number, py: number, d: DistrictDef): boolean {
    const dm = this.getDistrictDiamond(d);
    const points = [dm.top, dm.right, dm.bottom, dm.left];

    // Winding-based point-in-polygon for convex quad
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = points[i];
      const b = points[(i + 1) % 4];
      const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
      if (cross === 0) continue;
      if (sign === 0) {
        sign = cross > 0 ? 1 : -1;
      } else if ((cross > 0 ? 1 : -1) !== sign) {
        return false;
      }
    }
    return true;
  }

  private createDistrictHitAreas(): void {
    // We don't use Phaser zones for hit detection — instead we do
    // manual point-in-diamond checks via pointer tracking (more accurate
    // for isometric shapes than rectangular zones).
  }

  private setupPointerTracking(): void {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      let found: DistrictDef | null = null;
      for (const district of ALL_DISTRICTS) {
        if (this.isPointInDiamond(worldX, worldY, district)) {
          found = district;
          break;
        }
      }

      if (found !== this.hoveredDistrict) {
        this.hoveredDistrict = found;
        this.drawHoverOverlay();
        this.scene.game.canvas.style.cursor = found ? 'pointer' : 'default';
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Only register as click if pointer didn't move much (not a drag)
      const dist = Phaser.Math.Distance.Between(
        pointer.downX, pointer.downY, pointer.upX, pointer.upY
      );
      if (dist > 8) return;

      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      for (const district of ALL_DISTRICTS) {
        if (this.isPointInDiamond(worldX, worldY, district)) {
          this.onDistrictClick(district);
          break;
        }
      }
    });
  }

  private drawHoverOverlay(): void {
    this.hoverGraphics.clear();
    if (!this.hoveredDistrict) return;

    const d = this.hoveredDistrict;
    const dm = this.getDistrictDiamond(d);

    // Draw brightened overlay on all tiles in the district
    const brightColor = this.lighten(d.color, 35);
    for (let row = d.gridY; row < d.gridY + d.height; row++) {
      for (let col = d.gridX; col < d.gridX + d.width; col++) {
        const { x, y } = this.gridToScreen(col, row);
        const hw = TILE_WIDTH / 2;
        const hh = TILE_HEIGHT / 2;

        this.hoverGraphics.fillStyle(brightColor, 0.3);
        this.hoverGraphics.beginPath();
        this.hoverGraphics.moveTo(x, y - hh);
        this.hoverGraphics.lineTo(x + hw, y);
        this.hoverGraphics.lineTo(x, y + hh);
        this.hoverGraphics.lineTo(x - hw, y);
        this.hoverGraphics.closePath();
        this.hoverGraphics.fillPath();
      }
    }

    // Draw glow border around district diamond
    this.hoverGraphics.lineStyle(2, 0xffffff, 0.8);
    this.hoverGraphics.beginPath();
    this.hoverGraphics.moveTo(dm.top.x, dm.top.y);
    this.hoverGraphics.lineTo(dm.right.x, dm.right.y);
    this.hoverGraphics.lineTo(dm.bottom.x, dm.bottom.y);
    this.hoverGraphics.lineTo(dm.left.x, dm.left.y);
    this.hoverGraphics.closePath();
    this.hoverGraphics.strokePath();
  }

  private onDistrictClick(district: DistrictDef): void {
    console.log('Clicked district:', district.name);

    this.scene.game.events.emit('district-clicked', {
      name: district.name,
      category: district.category,
    });

    // Flash/pulse effect
    this.flashDistrict(district);
  }

  private flashDistrict(district: DistrictDef): void {
    const flashGfx = this.scene.add.graphics();
    flashGfx.setDepth(6);

    // Draw a bright white overlay on district tiles
    for (let row = district.gridY; row < district.gridY + district.height; row++) {
      for (let col = district.gridX; col < district.gridX + district.width; col++) {
        const { x, y } = this.gridToScreen(col, row);
        const hw = TILE_WIDTH / 2;
        const hh = TILE_HEIGHT / 2;

        flashGfx.fillStyle(0xffffff, 1);
        flashGfx.beginPath();
        flashGfx.moveTo(x, y - hh);
        flashGfx.lineTo(x + hw, y);
        flashGfx.lineTo(x, y + hh);
        flashGfx.lineTo(x - hw, y);
        flashGfx.closePath();
        flashGfx.fillPath();
      }
    }

    // Animate flash: start at alpha 0.5, fade to 0, then destroy
    flashGfx.setAlpha(0.5);
    this.scene.tweens.add({
      targets: flashGfx,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        flashGfx.destroy();
      },
    });
  }

  private render(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.isInDistrict(col, row, TOWN_SQUARE)) {
          const isBorder = col === TOWN_SQUARE.gridX || col === TOWN_SQUARE.gridX + TOWN_SQUARE.width - 1 ||
                          row === TOWN_SQUARE.gridY || row === TOWN_SQUARE.gridY + TOWN_SQUARE.height - 1;
          const color = isBorder ? this.darken(TOWN_SQUARE.color, 25) : TOWN_SQUARE.color;
          this.drawTile(col, row, color, this.darken(TOWN_SQUARE.color, 40));
          continue;
        }

        let drawn = false;
        for (const district of DISTRICTS) {
          if (this.isInDistrict(col, row, district)) {
            this.drawTile(col, row, district.color, this.darken(district.color, 40));
            drawn = true;
            break;
          }
        }
        if (drawn) continue;

        if (this.isRoad(col, row)) {
          this.drawTile(col, row, ROAD_COLOR, ROAD_STROKE);
          continue;
        }

        this.drawTile(col, row, 0x2c3e50, 0x1a252f);
      }
    }

    for (const district of DISTRICTS) {
      this.addLabel(district);
    }
    this.addLabel(TOWN_SQUARE);
  }

  private addLabel(district: DistrictDef): void {
    const centerCol = district.gridX + district.width / 2;
    const centerRow = district.gridY + district.height / 2;
    const { x, y } = this.gridToScreen(centerCol, centerRow);

    const text = this.scene.add.text(x, y, district.label, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000',
        blur: 2,
        fill: true,
      },
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(10);
    this.labels.push(text);
  }

  getDistrictCenter(category: string): { x: number; y: number } | null {
    const district = ALL_DISTRICTS.find(d => d.category === category);
    if (!district) return null;
    const centerCol = district.gridX + district.width / 2;
    const centerRow = district.gridY + district.height / 2;
    return this.gridToScreen(centerCol, centerRow);
  }

  destroy(): void {
    this.graphics.destroy();
    this.hoverGraphics.destroy();
    for (const label of this.labels) {
      label.destroy();
    }
    for (const zone of this.districtZones) {
      zone.destroy();
    }
    this.labels = [];
    this.districtZones = [];
    this.scene.game.canvas.style.cursor = 'default';
  }
}
