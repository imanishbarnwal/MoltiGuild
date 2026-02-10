import * as Phaser from 'phaser';
import { TilemapManager } from './TilemapManager';
import { CameraController } from './CameraController';
import { BuildingManager } from './BuildingManager';
import { WorldState } from '@/lib/world-state';

export class WorldScene extends Phaser.Scene {
  private tilemapManager!: TilemapManager;
  private cameraController!: CameraController;
  private buildingManager!: BuildingManager;

  constructor() {
    super({ key: 'WorldScene' });
  }

  preload(): void {
    this.load.image('creative-quarter', '/creative-quarter.png');
  }

  create(): void {
    this.tilemapManager = new TilemapManager(this);
    this.cameraController = new CameraController(
      this,
      this.tilemapManager.worldWidth,
      this.tilemapManager.worldHeight
    );
    this.buildingManager = new BuildingManager(this);

    // Place creative quarter sprite
    const creativeCenter = this.tilemapManager.getDistrictCenter('creative');
    if (creativeCenter) {
      const sprite = this.add.image(creativeCenter.x, creativeCenter.y, 'creative-quarter');
      sprite.setScale(0.5);
      sprite.setDepth(8);
    }

    // Center camera on Town Square
    const { x, y } = this.tilemapManager.townSquareCenterScreen;
    this.cameraController.centerOn(x, y);
  }

  updateWorldState(worldState: WorldState): void {
    if (!worldState) return;
    this.buildingManager.updateBuildings(worldState.guilds, worldState.agents);
  }

  shutdown(): void {
    this.cameraController?.destroy();
    this.tilemapManager?.destroy();
    this.buildingManager?.destroy();
  }
}
