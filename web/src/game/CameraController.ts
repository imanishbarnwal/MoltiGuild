import * as Phaser from 'phaser';

export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private minZoom = 0.5;
  private maxZoom = 2;

  constructor(private scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.camera = scene.cameras.main;

    // Set camera bounds to world size
    this.camera.setBounds(
      -worldWidth / 2,
      -100,
      worldWidth * 1.5,
      worldHeight * 1.5
    );

    this.setupDragPan();
    this.setupScrollZoom();
  }

  private setupDragPan(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartX = pointer.worldX;
      this.dragStartY = pointer.worldY;
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.isDragging) return;

      const dx = this.dragStartX - pointer.worldX;
      const dy = this.dragStartY - pointer.worldY;

      this.camera.scrollX += dx;
      this.camera.scrollY += dy;
    });

    this.scene.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  private setupScrollZoom(): void {
    this.scene.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number,
    ) => {
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Phaser.Math.Clamp(
        this.camera.zoom * zoomFactor,
        this.minZoom,
        this.maxZoom
      );
      this.camera.zoom = newZoom;
    });
  }

  centerOn(x: number, y: number): void {
    this.camera.centerOn(x, y);
  }

  destroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    this.scene.input.off('wheel');
  }
}
