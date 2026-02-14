import * as Phaser from 'phaser';
import { TilemapManager } from './TilemapManager';
import { TreeManager } from './TreeManager';
import type { GuildVisual } from '@/lib/world-state';
import { categoryToDistrict } from '@/lib/world-state';

/* ── Guild tier → building visual config ─────────────────────────── */

const GUILD_TIER_CONFIG: Record<string, {
  sprites: string[];
  scale: number;
  footprint: number;
  tint: number | null;
  glowColor: number | null;
}> = {
  bronze: {
    sprites: ['guild-bronze'],
    scale: 0.55,
    footprint: 1,
    tint: null,
    glowColor: null,
  },
  silver: {
    sprites: ['guild-silver'],
    scale: 0.60,
    footprint: 1,
    tint: null,
    glowColor: null,
  },
  gold: {
    sprites: ['guild-gold'],
    scale: 0.50,
    footprint: 2,
    tint: null,
    glowColor: 0xffe080,
  },
  diamond: {
    sprites: ['guild-diamond'],
    scale: 0.50,
    footprint: 2,
    tint: null,
    glowColor: 0x80d0ff,
  },
};

/* ── Placed guild hall ───────────────────────────────────────────── */

interface PlacedGuildHall {
  guildId: number;
  tier: string;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text | null;
  aura: Phaser.GameObjects.Particles.ParticleEmitter | null;
  col: number;
  row: number;
  footprint: number;
}

/* ── Simple seeded RNG for deterministic placement ───────────────── */

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/* ── GuildHallManager ────────────────────────────────────────────── */

export class GuildHallManager {
  private halls: PlacedGuildHall[] = [];
  private tilemapManager: TilemapManager | null = null;
  private treeManager: TreeManager | null = null;

  constructor(private scene: Phaser.Scene) {}

  setDependencies(tilemapManager: TilemapManager, treeManager: TreeManager): void {
    this.tilemapManager = tilemapManager;
    this.treeManager = treeManager;
  }

  /**
   * Sync guild halls with live guild data.
   * Adds new guilds, upgrades tiers, removes dissolved guilds.
   */
  updateGuildHalls(guilds: GuildVisual[]): void {
    if (!this.tilemapManager) return;

    const activeIds = new Set(guilds.map(g => g.guildId));

    // Remove halls for guilds no longer present
    this.halls = this.halls.filter(h => {
      if (activeIds.has(h.guildId)) return true;
      this.removeHall(h);
      return false;
    });

    // Place or upgrade halls for each guild
    for (const guild of guilds) {
      const existing = this.halls.find(h => h.guildId === guild.guildId);

      if (existing) {
        // Upgrade if tier changed
        if (existing.tier !== guild.tier) {
          this.removeHall(existing);
          this.halls = this.halls.filter(h => h !== existing);
          this.placeHall(guild);
        }
      } else {
        this.placeHall(guild);
      }
    }
  }

  private placeHall(guild: GuildVisual): void {
    if (!this.tilemapManager) return;

    const config = GUILD_TIER_CONFIG[guild.tier] ?? GUILD_TIER_CONFIG.bronze;
    const districtCategory = categoryToDistrict(guild.category);

    // Find spot using deterministic seed from guildId
    const spot = this.findDeterministicSpot(guild.guildId, districtCategory, config.footprint);
    if (!spot) return;

    // Occupy tiles
    for (let dy = 0; dy < config.footprint; dy++) {
      for (let dx = 0; dx < config.footprint; dx++) {
        this.tilemapManager.occupyTile(spot.col + dx, spot.row + dy, `guild-${guild.guildId}`, guild.tier);
      }
    }

    // Clear trees for 2x2 buildings
    if (config.footprint === 2 && this.treeManager) {
      this.treeManager.clearTilesForBuilding(spot.col, spot.row, config.footprint);
    }

    // Calculate screen position
    const centerCol = spot.col + (config.footprint - 1) * 0.5;
    const centerRow = spot.row + (config.footprint - 1) * 0.5;
    const pos = this.tilemapManager.gridToScreen(centerCol, centerRow);

    // Pick sprite deterministically
    const rand = seededRng(guild.guildId * 7919);
    const spriteKey = config.sprites[Math.floor(rand() * config.sprites.length)];

    // Shadow
    const shadow = this.scene.add.image(pos.x + 4, pos.y + 6, 'building-shadow');
    shadow.setOrigin(0.5, 0.5);
    shadow.setScale(
      config.scale * (config.footprint === 2 ? 2.2 : 1.8),
      config.scale * (config.footprint === 2 ? 1.4 : 1.2),
    );
    shadow.setDepth(0.5);

    // Building sprite
    const sprite = this.scene.add.image(pos.x, pos.y, spriteKey);
    sprite.setOrigin(0.5, 0.85);
    sprite.setScale(config.scale);
    sprite.setDepth(7 + (centerCol + centerRow) * 0.01);

    // Tier tint
    if (config.tint) {
      sprite.setTint(config.tint);
    }

    // Hover: show guild name label + warm tint + scale up
    const baseScale = config.scale;
    let label: Phaser.GameObjects.Text | null = null;

    sprite.setInteractive({ useHandCursor: true });

    sprite.on('pointerover', () => {
      sprite.setTint(0xffffcc);
      this.scene.tweens.add({
        targets: sprite,
        scaleX: baseScale * 1.08,
        scaleY: baseScale * 1.08,
        duration: 150,
        ease: 'Back.easeOut',
      });

      // Create name label
      if (!label) {
        label = this.scene.add.text(pos.x, pos.y - sprite.displayHeight * 0.6, guild.name, {
          fontFamily: "'Cinzel', serif",
          fontSize: '11px',
          color: '#fff5dc',
          backgroundColor: 'rgba(19,17,13,0.85)',
          padding: { x: 8, y: 4 },
          align: 'center',
        });
        label.setOrigin(0.5, 1);
        label.setDepth(20);
      }
    });

    sprite.on('pointerout', () => {
      if (config.tint) {
        sprite.setTint(config.tint);
      } else {
        sprite.clearTint();
      }
      this.scene.tweens.add({
        targets: sprite,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 150,
        ease: 'Cubic.easeOut',
      });

      // Remove label
      if (label) {
        label.destroy();
        label = null;
      }
    });

    // Click: emit guild-clicked event with real guildId
    sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const dist = Phaser.Math.Distance.Between(
        pointer.downX, pointer.downY, pointer.upX, pointer.upY,
      );
      if (dist > 8) return; // ignore drags
      this.scene.events.emit('guild-clicked', guild.guildId);
    });

    // Guild aura particles for gold/diamond
    let aura: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    if (config.glowColor) {
      const auraTexKey = `particle-guild-aura-${guild.tier}`;
      if (!this.scene.textures.exists(auraTexKey)) {
        const tex = this.scene.textures.createCanvas(auraTexKey, 8, 8);
        if (tex) {
          const ctx = tex.context;
          const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
          const r = (config.glowColor >> 16) & 0xFF;
          const gr = (config.glowColor >> 8) & 0xFF;
          const b = config.glowColor & 0xFF;
          g.addColorStop(0, `rgba(${r},${gr},${b},0.7)`);
          g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 8, 8);
          tex.refresh();
        }
      }

      aura = this.scene.add.particles(pos.x, pos.y - 10, auraTexKey, {
        lifespan: { min: 2000, max: 4000 },
        speed: { min: 1, max: 5 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.4, end: 0 },
        frequency: guild.tier === 'diamond' ? 200 : 400,
        maxAliveParticles: guild.tier === 'diamond' ? 10 : 5,
        blendMode: Phaser.BlendModes.ADD,
      });
      aura.setDepth(sprite.depth - 0.01);
    }

    this.halls.push({
      guildId: guild.guildId,
      tier: guild.tier,
      sprite,
      shadow,
      label: null,
      aura,
      col: spot.col,
      row: spot.row,
      footprint: config.footprint,
    });
  }

  private removeHall(hall: PlacedGuildHall): void {
    if (!this.tilemapManager) return;

    // Clear tile occupation
    for (let dy = 0; dy < hall.footprint; dy++) {
      for (let dx = 0; dx < hall.footprint; dx++) {
        this.tilemapManager.clearOccupation(hall.col + dx, hall.row + dy);
      }
    }

    hall.sprite.destroy();
    hall.shadow.destroy();
    hall.label?.destroy();
    hall.aura?.destroy();
  }

  /**
   * Find a spot in a district using a deterministic seed.
   * Same guildId always gets the same tile (stable across renders).
   */
  private findDeterministicSpot(
    guildId: number,
    category: string,
    footprint: number,
  ): { col: number; row: number } | null {
    if (!this.tilemapManager) return null;

    const tiles = this.tilemapManager.getDistrictTiles(category);
    if (!tiles || tiles.size === 0) return null;

    // Convert to array and sort for determinism
    const tileArr = Array.from(tiles).map(k => {
      const [c, r] = k.split(',').map(Number);
      return { col: c, row: r };
    }).sort((a, b) => a.col - b.col || a.row - b.row);

    // Use seeded shuffle based on guildId
    const rand = seededRng(guildId * 31337);
    const shuffled = [...tileArr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const tile of shuffled) {
      if (this.canPlace(tile.col, tile.row, footprint, category)) {
        return tile;
      }
    }
    return null;
  }

  private canPlace(col: number, row: number, footprint: number, category: string): boolean {
    if (!this.tilemapManager) return false;

    for (let dy = 0; dy < footprint; dy++) {
      for (let dx = 0; dx < footprint; dx++) {
        const c = col + dx;
        const r = row + dy;
        if (this.tilemapManager.isOccupied(c, r)) return false;
        if (this.tilemapManager.isRoad(c, r)) return false;
        if (this.tilemapManager.isWater(c, r)) return false;
        if (footprint > 1 && this.tilemapManager.getTileDistrict(c, r) !== category) return false;
      }
    }
    return true;
  }

  /** Enable/disable interactivity on guild buildings. */
  setInteractive(enabled: boolean): void {
    for (const hall of this.halls) {
      if (enabled) hall.sprite.setInteractive({ useHandCursor: true });
      else hall.sprite.disableInteractive();
    }
  }

  destroy(): void {
    for (const h of this.halls) {
      h.sprite.destroy();
      h.shadow.destroy();
      h.label?.destroy();
      h.aura?.destroy();
    }
    this.halls = [];
  }
}
