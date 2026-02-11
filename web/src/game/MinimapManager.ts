import * as Phaser from 'phaser';
import { TilemapManager, TILE_WIDTH, TILE_HEIGHT, GRID_SIZE } from './TilemapManager';

/** District category → display color for the minimap (bright / saturated). */
const DISTRICT_COLORS: Record<string, number> = {
  creative:    0xf0b88c,
  translation: 0x6cb4e0,
  code:        0x5dbe80,
  defi:        0xf7d94e,
  research:    0x5dc8b0,
  townsquare:  0xc8cfd0,
};

export class MinimapManager {
  private container: Phaser.GameObjects.Container;
  private viewportRect: Phaser.GameObjects.Graphics;

  private readonly SIZE = 195;
  private readonly PAD = 10;
  private readonly CELL = Math.floor(195 / GRID_SIZE); // ~7px per tile

  // World-space offsets (must match TilemapManager)
  private readonly worldOffsetX = (GRID_SIZE * TILE_WIDTH) / 2 + 100;
  private readonly worldOffsetY = 100;

  /** Screen-space bounds of the minimap (updated on position/resize). */
  public screenBounds = { x: 0, y: 0, w: 0, h: 0 };

  constructor(
    private scene: Phaser.Scene,
    private tilemapManager: TilemapManager,
    buildingPositions: { gx: number; gy: number }[] = [],
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000);

    // Dark border background with clean 2px border
    const border = scene.add.graphics();
    border.fillStyle(0x000000, 0.75);
    border.fillRoundedRect(0, 0, this.SIZE + 4, this.SIZE + 4, 5);
    border.lineStyle(2, 0xffffff, 0.35);
    border.strokeRoundedRect(0, 0, this.SIZE + 4, this.SIZE + 4, 5);

    // Draw simplified tile map — green base for grass, colored for districts
    const mapGfx = scene.add.graphics();
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cat = this.tilemapManager.getTileDistrict(col, row);
        const color = cat ? (DISTRICT_COLORS[cat] ?? 0x5a9a3a) : 0x5a9a3a;
        mapGfx.fillStyle(color, 0.85);
        mapGfx.fillRect(2 + col * this.CELL, 2 + row * this.CELL, this.CELL, this.CELL);
      }
    }

    // Building dots
    const dotGfx = scene.add.graphics();
    for (const { gx, gy } of buildingPositions) {
      const mx = 2 + (gx / GRID_SIZE) * this.SIZE;
      const my = 2 + (gy / GRID_SIZE) * this.SIZE;
      dotGfx.fillStyle(0xffd700, 0.9);
      dotGfx.fillCircle(mx, my, 1.5);
    }

    // Viewport indicator rectangle
    this.viewportRect = scene.add.graphics();

    // Click-to-navigate hit zone
    const hitZone = scene.add.rectangle(
      (this.SIZE + 4) / 2,
      (this.SIZE + 4) / 2,
      this.SIZE + 4,
      this.SIZE + 4,
    );
    hitZone.setOrigin(0.5, 0.5);
    hitZone.setAlpha(0.001);
    hitZone.setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Calculate local position within the minimap
      const localX = pointer.x - this.screenBounds.x - 2;
      const localY = pointer.y - this.screenBounds.y - 2;

      // Convert minimap pixel → world coordinates
      const worldW = GRID_SIZE * TILE_WIDTH;
      const worldH = GRID_SIZE * TILE_HEIGHT;

      const worldX = (localX / this.SIZE) * worldW + (this.worldOffsetX - worldW / 2);
      const worldY = (localY / this.SIZE) * worldH + this.worldOffsetY;

      this.scene.cameras.main.centerOn(worldX, worldY);
    });

    this.container.add([border, mapGfx, dotGfx, this.viewportRect, hitZone]);
    this.positionMinimap();

    scene.events.on('update', this.updateViewport, this);
    scene.scale.on('resize', this.positionMinimap, this);
  }

  private positionMinimap(): void {
    const cam = this.scene.cameras.main;
    const x = cam.width - this.SIZE - this.PAD - 4;
    const y = cam.height - this.SIZE - this.PAD - 4;
    this.container.setPosition(x, y);

    // Update public screen bounds for drag exclusion
    this.screenBounds = { x, y, w: this.SIZE + 4, h: this.SIZE + 4 };
  }

  private updateViewport(): void {
    this.viewportRect.clear();

    const cam = this.scene.cameras.main;

    // Camera world-space bounds
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;

    // The isometric world extent in screen coords
    const worldW = GRID_SIZE * TILE_WIDTH;
    const worldH = GRID_SIZE * TILE_HEIGHT;

    // Scale factor: minimap pixels per world pixel
    const sx = this.SIZE / worldW;
    const sy = this.SIZE / worldH;

    // Camera offset relative to the world origin
    const rx = (cam.scrollX - (this.worldOffsetX - worldW / 2)) * sx;
    const ry = (cam.scrollY - this.worldOffsetY) * sy;
    const rw = viewW * sx;
    const rh = viewH * sy;

    this.viewportRect.lineStyle(1.5, 0xffffff, 0.8);
    this.viewportRect.strokeRect(
      2 + Math.max(0, rx),
      2 + Math.max(0, ry),
      Math.min(rw, this.SIZE),
      Math.min(rh, this.SIZE),
    );
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
  }

  destroy(): void {
    this.scene.events.off('update', this.updateViewport, this);
    this.scene.scale.off('resize', this.positionMinimap, this);
    this.container.destroy(true);
  }
}
