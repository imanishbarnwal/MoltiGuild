import * as Phaser from 'phaser';
import { TilemapManager } from './TilemapManager';
import { MinimapManager } from './MinimapManager';

/** Set to true to skip the intro and go straight to gameplay. */
export const SKIP_INTRO = false;

/**
 * Toggleable cinematic overview system. Handles:
 *  - Initial zoomed-out overview with letterbox, overlay, bokeh, drift
 *  - Click-on-district to zoom in (Google Earth style)
 *  - Escape key to zoom back out to overview
 *  - Camera shake on landing, screen flash on click
 *  - Blur-to-sharp PostFX transition
 */
export class CinematicIntro {
  /* ── Tuning constants ─────────────────────────────────────────── */
  private static readonly OVERVIEW_ZOOM = 0.55;
  private static readonly DRIFT_SPEED = 1.5;          // world-px per second
  private static readonly LETTERBOX_PCT = 0.065;      // 6.5% screen height per bar
  private static readonly OVERLAY_ALPHA = 0.2;
  private static readonly ZOOM_DURATION = 2800;       // ms
  private static readonly FADE_DURATION = 800;        // ms
  private static readonly BLUR_STRENGTH = 2;
  private static readonly SHAKE_INTENSITY = 0.002;
  private static readonly SHAKE_DURATION = 200;
  private static readonly FLASH_DURATION = 300;

  /* ── Public state ─────────────────────────────────────────────── */
  public isInOverview = true;

  /* ── Internal state ───────────────────────────────────────────── */
  private isTransitioning = false;
  private driftVx = 0;
  private driftVy = 0;
  private lastEnteredCategory: string | null = null;

  /* ── Overlay game objects (created/destroyed per overview enter) ─ */
  private darkOverlay: Phaser.GameObjects.Rectangle | null = null;
  private topBar: Phaser.GameObjects.Rectangle | null = null;
  private bottomBar: Phaser.GameObjects.Rectangle | null = null;
  private bokehEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private flashRect: Phaser.GameObjects.Rectangle | null = null;

  /* ── PostFX blur (WebGL only) ─────────────────────────────────── */
  private blurFX: Phaser.FX.Blur | null = null;

  /* ── Keyboard ─────────────────────────────────────────────────── */
  private escKey: Phaser.Input.Keyboard.Key | null = null;

  constructor(
    private scene: Phaser.Scene,
    private camera: Phaser.Cameras.Scene2D.Camera,
    private tilemapManager: TilemapManager,
    private minimapManager: MinimapManager,
    private onEnterWorld: (districtCategory: string) => void,
    private onExitToOverview: () => void,
  ) {
    // Bind Escape key
    if (this.scene.input.keyboard) {
      this.escKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.ESC,
      );
      this.escKey.on('down', this.handleEscape, this);
    }

    // Ensure bokeh texture exists (shared across enter/exit cycles)
    if (!this.scene.textures.exists('particle-bokeh')) {
      const tex = this.scene.textures.createCanvas('particle-bokeh', 12, 12);
      if (tex) {
        const ctx = tex.context;
        const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
        g.addColorStop(0, 'rgba(255,245,220,0.6)');
        g.addColorStop(0.5, 'rgba(255,245,220,0.15)');
        g.addColorStop(1, 'rgba(255,245,220,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 12, 12);
        tex.refresh();
      }
    }

    // Enter overview state
    this.enterOverview(true);
  }

  /* ══════════════════════════════════════════════════════════════════
     OVERVIEW STATE — create overlay objects, zoom out, enable drift
     ══════════════════════════════════════════════════════════════ */
  private enterOverview(isInitial: boolean): void {
    this.isInOverview = true;
    this.isTransitioning = !isInitial;

    // Camera to overview position
    const center = this.tilemapManager.townSquareCenterScreen;

    // Random drift direction
    const angle = Math.random() * Math.PI * 2;
    this.driftVx = Math.cos(angle) * CinematicIntro.DRIFT_SPEED;
    this.driftVy = Math.sin(angle) * CinematicIntro.DRIFT_SPEED;

    // Hide UI
    this.tilemapManager.setLabelsAlpha(0);
    this.minimapManager.setAlpha(0);

    // Create overlay objects
    const w = this.camera.width;
    const h = this.camera.height;

    this.darkOverlay = this.scene.add.rectangle(
      w / 2, h / 2, w * 3, h * 3, 0x000000,
      isInitial ? CinematicIntro.OVERLAY_ALPHA : 0,
    );
    this.darkOverlay.setScrollFactor(0).setDepth(2000).setOrigin(0.5, 0.5);

    const barH = Math.ceil(h * CinematicIntro.LETTERBOX_PCT);

    this.topBar = this.scene.add.rectangle(
      w / 2, isInitial ? barH / 2 : -barH, w * 3, barH, 0x000000, 1,
    );
    this.topBar.setScrollFactor(0).setDepth(2001).setOrigin(0.5, 0.5);

    this.bottomBar = this.scene.add.rectangle(
      w / 2, isInitial ? h - barH / 2 : h + barH, w * 3, barH, 0x000000, 1,
    );
    this.bottomBar.setScrollFactor(0).setDepth(2001).setOrigin(0.5, 0.5);

    // Blur PostFX
    if (this.camera.postFX) {
      this.blurFX = this.camera.postFX.addBlur(
        0,
        isInitial ? CinematicIntro.BLUR_STRENGTH : 0,
        isInitial ? CinematicIntro.BLUR_STRENGTH : 0,
        1,
      );
    }

    // Bokeh particles
    this.bokehEmitter = this.scene.add.particles(0, 0, 'particle-bokeh', {
      x: { min: 0, max: w },
      y: { min: 0, max: h },
      lifespan: { min: 3000, max: 6000 },
      speed: { min: 5, max: 15 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.3, end: 0.8 },
      alpha: { start: 0, end: 0.4 },
      frequency: 400,
      maxAliveParticles: 20,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.bokehEmitter.setScrollFactor(0).setDepth(2001);

    if (isInitial) {
      // First load — snap camera, delayed click handler
      this.camera.setZoom(CinematicIntro.OVERVIEW_ZOOM);
      this.camera.centerOn(center.x, center.y);
      this.scene.time.delayedCall(800, () => {
        if (this.isInOverview && !this.isTransitioning) {
          this.scene.input.on('pointerup', this.onPointerUp, this);
        }
      });
      this.isTransitioning = false;
    } else {
      // Reverse transition — animate zoom out
      const dur = CinematicIntro.ZOOM_DURATION;

      const targetScrollX = center.x - this.camera.width / 2;
      const targetScrollY = center.y - this.camera.height / 2;

      // Camera zoom out
      this.scene.tweens.add({
        targets: this.camera,
        zoom: CinematicIntro.OVERVIEW_ZOOM,
        scrollX: targetScrollX,
        scrollY: targetScrollY,
        duration: dur,
        ease: 'Cubic.easeInOut',
      });

      // Overlay fades in
      this.scene.tweens.add({
        targets: this.darkOverlay,
        alpha: CinematicIntro.OVERLAY_ALPHA,
        duration: dur * 0.6,
        delay: dur * 0.2,
        ease: 'Cubic.easeOut',
      });

      // Letterbox bars slide in
      this.scene.tweens.add({
        targets: this.topBar,
        y: barH / 2,
        duration: CinematicIntro.FADE_DURATION,
        delay: dur * 0.2,
        ease: 'Cubic.easeOut',
      });
      this.scene.tweens.add({
        targets: this.bottomBar,
        y: h - barH / 2,
        duration: CinematicIntro.FADE_DURATION,
        delay: dur * 0.2,
        ease: 'Cubic.easeOut',
      });

      // Blur fades in
      if (this.blurFX) {
        this.scene.tweens.add({
          targets: this.blurFX,
          x: CinematicIntro.BLUR_STRENGTH,
          y: CinematicIntro.BLUR_STRENGTH,
          duration: dur * 0.8,
          ease: 'Cubic.easeIn',
        });
      }

      // On complete — enable click handler
      this.scene.time.delayedCall(dur + 200, () => {
        this.isTransitioning = false;
        this.scene.input.on('pointerup', this.onPointerUp, this);
      });
    }

    // Resize handler
    this.scene.scale.on('resize', this.onResize, this);
  }

  /* ══════════════════════════════════════════════════════════════════
     PER-FRAME — camera drift while in overview
     ══════════════════════════════════════════════════════════════ */
  update(_time: number, delta: number): void {
    if (!this.isInOverview || this.isTransitioning) return;
    const dt = delta / 1000;
    this.camera.scrollX += this.driftVx * dt;
    this.camera.scrollY += this.driftVy * dt;
  }

  /* ══════════════════════════════════════════════════════════════════
     DISTRICT CLICK → ZOOM IN
     ══════════════════════════════════════════════════════════════ */
  private onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isInOverview || this.isTransitioning) return;

    const dist = Phaser.Math.Distance.Between(
      pointer.downX, pointer.downY, pointer.upX, pointer.upY,
    );
    if (dist > 8) return;

    const cell = this.tilemapManager.screenToGrid(pointer.worldX, pointer.worldY);
    if (!cell) return;

    const category = this.tilemapManager.getTileDistrict(cell.col, cell.row);
    if (!category) return;

    const center = this.tilemapManager.getDistrictCenter(category);
    if (!center) return;

    this.zoomIn(center.x, center.y, category);
  };

  private zoomIn(zoomX: number, zoomY: number, category: string): void {
    this.isTransitioning = true;
    this.lastEnteredCategory = category;
    this.scene.input.off('pointerup', this.onPointerUp, this);

    // Screen flash on click
    this.screenFlash();

    // Stop bokeh
    this.bokehEmitter?.stop();

    const dur = CinematicIntro.ZOOM_DURATION;
    const fade = CinematicIntro.FADE_DURATION;

    const targetScrollX = zoomX - this.camera.width / 2;
    const targetScrollY = zoomY - this.camera.height / 2;

    // 1. Camera zoom + pan
    this.scene.tweens.add({
      targets: this.camera,
      zoom: 1.0,
      scrollX: targetScrollX,
      scrollY: targetScrollY,
      duration: dur,
      ease: 'Cubic.easeInOut',
    });

    // 2. Blur-to-sharp
    if (this.blurFX) {
      this.scene.tweens.add({
        targets: this.blurFX,
        x: 0,
        y: 0,
        duration: dur * 0.8,
        ease: 'Cubic.easeOut',
      });
    }

    // 3. Fade out dark overlay
    if (this.darkOverlay) {
      this.scene.tweens.add({
        targets: this.darkOverlay,
        alpha: 0,
        duration: dur * 0.7,
        delay: dur * 0.1,
        ease: 'Cubic.easeIn',
      });
    }

    // 4. Slide letterbox bars away
    if (this.topBar) {
      this.scene.tweens.add({
        targets: this.topBar,
        y: -this.topBar.height,
        duration: fade,
        delay: dur * 0.3,
        ease: 'Cubic.easeIn',
      });
    }
    if (this.bottomBar) {
      this.scene.tweens.add({
        targets: this.bottomBar,
        y: this.camera.height + this.bottomBar.height,
        duration: fade,
        delay: dur * 0.3,
        ease: 'Cubic.easeIn',
      });
    }

    // 5. Staggered UI fade-in at 70%
    const uiRevealDelay = dur * 0.7;

    this.scene.tweens.add({
      targets: this.minimapManager,
      alpha: { from: 0, to: 1 },
      duration: 500,
      delay: uiRevealDelay,
      ease: 'Cubic.easeOut',
      onUpdate: (_tween: Phaser.Tweens.Tween, target: MinimapManager, _key: string, current: number) => {
        target.setAlpha(current);
      },
    });

    this.tilemapManager.fadeInLabelsStaggered(400, uiRevealDelay + 100);

    // 6. Complete
    this.scene.time.delayedCall(dur, () => {
      // Camera shake on landing
      this.camera.shake(
        CinematicIntro.SHAKE_DURATION,
        CinematicIntro.SHAKE_INTENSITY,
      );
    });

    this.scene.time.delayedCall(dur + 200, () => {
      // Remove blur
      if (this.blurFX && this.camera.postFX) {
        this.camera.postFX.remove(this.blurFX);
        this.blurFX = null;
      }
      // Destroy overlay objects
      this.destroyOverlayObjects();
      this.isInOverview = false;
      this.isTransitioning = false;
      this.onEnterWorld(category);
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     ESCAPE → ZOOM BACK OUT TO OVERVIEW
     ══════════════════════════════════════════════════════════════ */
  private handleEscape = (): void => {
    if (this.isInOverview || this.isTransitioning) return;
    this.zoomOut();
  };

  private zoomOut(): void {
    this.isTransitioning = true;
    this.onExitToOverview();

    // Fade out UI first
    const uiFadeDur = 400;

    // Minimap fades out
    this.scene.tweens.add({
      targets: this.minimapManager,
      alpha: { from: 1, to: 0 },
      duration: uiFadeDur,
      ease: 'Cubic.easeIn',
      onUpdate: (_tween: Phaser.Tweens.Tween, target: MinimapManager, _key: string, current: number) => {
        target.setAlpha(current);
      },
    });

    // Labels fade out
    this.tilemapManager.setLabelsAlpha(0);

    // After UI fades, create overlay objects and start reverse transition
    this.scene.time.delayedCall(uiFadeDur, () => {
      this.enterOverview(false);
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     SCREEN FLASH — brief white flash on click to signal transition
     ══════════════════════════════════════════════════════════════ */
  private screenFlash(): void {
    const w = this.camera.width;
    const h = this.camera.height;

    this.flashRect = this.scene.add.rectangle(
      w / 2, h / 2, w * 3, h * 3, 0xffffff, 0,
    );
    this.flashRect.setScrollFactor(0).setDepth(2003).setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: this.flashRect,
      alpha: { from: 0, to: 0.1 },
      duration: CinematicIntro.FLASH_DURATION / 2,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.flashRect?.destroy();
        this.flashRect = null;
      },
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     RESIZE HANDLER — reposition overlay objects
     ══════════════════════════════════════════════════════════════ */
  private onResize = (): void => {
    if (!this.isInOverview) return;

    const w = this.camera.width;
    const h = this.camera.height;
    const barH = Math.ceil(h * CinematicIntro.LETTERBOX_PCT);

    if (this.topBar && !this.isTransitioning) {
      this.topBar.setPosition(w / 2, barH / 2);
      this.topBar.setSize(w * 3, barH);
    }
    if (this.bottomBar && !this.isTransitioning) {
      this.bottomBar.setPosition(w / 2, h - barH / 2);
      this.bottomBar.setSize(w * 3, barH);
    }
    if (this.darkOverlay) {
      this.darkOverlay.setPosition(w / 2, h / 2);
      this.darkOverlay.setSize(w * 3, h * 3);
    }
  };

  /* ══════════════════════════════════════════════════════════════════
     CLEANUP HELPERS
     ══════════════════════════════════════════════════════════════ */
  private destroyOverlayObjects(): void {
    this.scene.scale.off('resize', this.onResize, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);

    this.topBar?.destroy();
    this.topBar = null;
    this.bottomBar?.destroy();
    this.bottomBar = null;
    this.darkOverlay?.destroy();
    this.darkOverlay = null;
    this.bokehEmitter?.destroy();
    this.bokehEmitter = null;
    this.flashRect?.destroy();
    this.flashRect = null;

    if (this.blurFX && this.camera.postFX) {
      this.camera.postFX.remove(this.blurFX);
      this.blurFX = null;
    }
  }

  /** Full teardown (scene shutdown). */
  destroy(): void {
    this.destroyOverlayObjects();
    this.escKey?.off('down', this.handleEscape, this);
    if (this.scene.input.keyboard && this.escKey) {
      this.scene.input.keyboard.removeKey(this.escKey);
    }
    if (this.scene.textures.exists('particle-bokeh')) {
      this.scene.textures.remove('particle-bokeh');
    }
  }
}
