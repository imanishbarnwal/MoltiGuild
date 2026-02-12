import * as Phaser from 'phaser';

/** Buildings that emit chimney smoke. */
const SMOKE_BUILDINGS = new Set([
  'bldg-firestation',
  'bldg-weaponsmith',
  'bldg-signal-fire',
]);

export class ParticleManager {
  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private smokeEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(private scene: Phaser.Scene) {
    this.createParticleTextures();
  }

  /* ── Programmatic particle textures ──────────────────────────────── */

  private createParticleTextures(): void {
    // Dust mote: 6x6 soft warm circle
    const dust = this.scene.textures.createCanvas('particle-dust', 6, 6);
    if (dust) {
      const ctx = dust.context;
      const g = ctx.createRadialGradient(3, 3, 0, 3, 3, 3);
      g.addColorStop(0, 'rgba(255,245,200,0.9)');
      g.addColorStop(1, 'rgba(255,245,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 6, 6);
      dust.refresh();
    }

    // Smoke puff: 10x10 soft gray circle
    const smoke = this.scene.textures.createCanvas('particle-smoke', 10, 10);
    if (smoke) {
      const ctx = smoke.context;
      const g = ctx.createRadialGradient(5, 5, 0, 5, 5, 5);
      g.addColorStop(0, 'rgba(180,180,180,0.5)');
      g.addColorStop(1, 'rgba(120,120,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 10, 10);
      smoke.refresh();
    }
  }

  /* ── Ambient dust motes across the world ─────────────────────────── */

  createDustEmitter(worldCenterX: number, worldCenterY: number): void {
    this.dustEmitter = this.scene.add.particles(0, 0, 'particle-dust', {
      x: { min: worldCenterX - 900, max: worldCenterX + 900 },
      y: { min: worldCenterY - 500, max: worldCenterY + 500 },
      lifespan: { min: 4000, max: 8000 },
      speed: { min: 2, max: 8 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 },
      frequency: 200,
      maxAliveParticles: 40,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.dustEmitter.setDepth(8);
  }

  /* ── Chimney smoke on specific buildings ─────────────────────────── */

  addSmokeIfEligible(buildingKey: string, worldX: number, worldY: number): void {
    if (!SMOKE_BUILDINGS.has(buildingKey)) return;

    const emitter = this.scene.add.particles(worldX, worldY - 25, 'particle-smoke', {
      lifespan: { min: 2000, max: 4000 },
      speed: { min: 3, max: 8 },
      angle: { min: 260, max: 280 },
      scale: { start: 0.3, end: 1.5 },
      alpha: { start: 0.35, end: 0 },
      frequency: 600,
      maxAliveParticles: 6,
      gravityY: -10,
    });
    emitter.setDepth(9);
    this.smokeEmitters.push(emitter);
  }

  /* ── Cleanup ─────────────────────────────────────────────────────── */

  destroy(): void {
    this.dustEmitter?.destroy();
    for (const e of this.smokeEmitters) e.destroy();
    this.smokeEmitters = [];
  }
}
