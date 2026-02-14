# MoltiGuild World Map — Asset Requirements

This document specifies all visual assets needed for the RPG-style isometric world map. The map consists of 6 biome-themed districts on a 34x22 isometric grid (64x32px diamond tiles).

## Architecture

- **Grid**: 34 columns x 22 rows, 6 districts (10x10 each), 2-tile roads between
- **Tile size**: 64x32px isometric diamond (2:1 ratio, 26.565deg)
- **Projection**: Standard isometric (gridToScreen: x = (col-row)*32 + offset, y = (col+row)*16 + offset)
- **Format**: PNG with transparency, 8-bit indexed color where possible
- **Pivot**: Bottom center (origin 0.5, 0.85 for buildings; 0.5, 0.5 for tiles)

## Current Asset Sources

| Source | Type | License |
|--------|------|---------|
| Sailor Tents Pack | 4 tent variants (hunter, lumberjack, pavilion, storage) | Free |
| Isometric Building Pack | 7 buildings (barracks, church, firestation, herbary x2, signal_fire, weaponsmith) | Free |
| Grass tileable texture | Dark grass base | Free |
| Trees & Bushes spritesheet | 5 trees + 2 bushes (288x160 sheet) | Free |

---

## Biome 1: Enchanted Meadow (Creative Quarter)

**Theme**: Lush green meadow with flower patches and a central pond
**Colors**: Greens (#4a8c3f, #54964a), pinks (#e88cb0), yellows (#f0d060)

### Terrain Tiles (P0, 64x32 isometric)
| Asset | Description | Variants |
|-------|-------------|----------|
| `meadow-grass-*.png` | Lush green grass with subtle flower specks | 4 |
| `meadow-flowers-*.png` | Dense flower patch (pink/yellow clusters) | 4 |
| `meadow-pond-*.png` | Green-blue pond water with lily pad hints | 4 |

### Transition Tiles (P1, 64x32 isometric)
| Asset | Description | Count |
|-------|-------------|-------|
| `meadow-to-road-*.png` | Grass fading into cobblestone | 4 (N/S/E/W) |
| `meadow-to-pond-*.png` | Grass shore transitioning to water | 4 (N/S/E/W) |

### Decoration Sprites (P1)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `flower-cluster-*.png` | 10x10px | Tiny flower dot groups (pink, yellow, white) |
| `garden-arch.png` | 48x64px | Vine-covered wooden archway |
| `butterfly-*.png` | 8x8px | 4-frame animated butterfly sprite |

### Vegetation (P1)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `blossom-tree.png` | 64x96px | Pink cherry blossom tree |
| `flower-bush.png` | 32x28px | Flowering shrub (pink/purple) |

### Particle Effects (P2)
| Asset | Description |
|-------|-------------|
| `petal-particle.png` | 6x6 pink/white petal drifting upward |

---

## Biome 2: Grand Plaza (Town Square)

**Theme**: Cobblestone plaza with civic architecture
**Colors**: Tans (#a89878, #b0a080), greys (#887860)

### Terrain Tiles (P0, 64x32 isometric)
| Asset | Description | Variants |
|-------|-------------|----------|
| `cobblestone-*.png` | Tan/grey stone tile with subtle grid pattern | 4 |
| `cobblestone-worn-*.png` | Weathered cobblestone with cracks | 4 |

### Transition Tiles (P1, 64x32 isometric)
| Asset | Description | Count |
|-------|-------------|-------|
| `cobble-to-road-*.png` | Plaza stone blending into road stone | 4 |

### Decoration Sprites (P0)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `fountain.png` | 32x32px | Circular stone fountain with blue water center |
| `lamp-post.png` | 16x48px | Iron street lamp with warm glow |
| `town-banner-*.png` | 12x36px | Hanging banner on iron bracket (3 colors) |
| `bench.png` | 24x16px | Stone park bench |

---

## Biome 3: Harbor Coast (Translation Ward)

**Theme**: Sandy coastline meeting deep ocean water
**Colors**: Sandy yellows (#c8b888, #d0c090), ocean blues (#2868a0, #4888c0)

### Terrain Tiles (P0, 64x32 isometric)
| Asset | Description | Variants |
|-------|-------------|----------|
| `sand-*.png` | Sandy yellow beach with grain texture | 4 |
| `ocean-*.png` | Deep blue ocean water with wave highlights | 4 (animated) |
| `shallow-water-*.png` | Lighter turquoise shallow water | 4 |

### Transition Tiles (P0, 64x32 isometric)
| Asset | Description | Count |
|-------|-------------|-------|
| `sand-to-ocean-*.png` | Beach shoreline with foam edge | 4 (N/S/E/W) |
| `sand-to-road-*.png` | Sand blending into road cobble | 4 |

### Decoration Sprites (P1)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `dock-planks.png` | 48x16px | Brown wooden dock platform |
| `fishing-boat.png` | 40x24px | Small anchored boat |
| `barrel-crate.png` | 20x24px | Stacked cargo barrels |
| `anchor.png` | 16x20px | Iron anchor decoration |
| `seaweed.png` | 12x16px | Green seaweed at water edge |

### Vegetation (P1)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `palm-tree.png` | 48x80px | Tropical palm tree |
| `beach-grass.png` | 24x20px | Tufts of dune grass |

### Particle Effects (P2)
| Asset | Description |
|-------|-------------|
| `sea-spray.png` | 4x4 blue-white mist particle |

---

## Biome 4: Volcanic Forge (DeFi Docks)

**Theme**: Dark volcanic rock with lava rivers and ember glow
**Colors**: Charcoal (#3a3030, #443838), orange-red (#c86030, #e08840)

### Terrain Tiles (P0, 64x32 isometric)
| Asset | Description | Variants |
|-------|-------------|----------|
| `dark-rock-*.png` | Charcoal volcanic stone with subtle cracks | 4 |
| `lava-*.png` | Glowing orange-red lava flow | 4 (animated) |
| `obsidian-*.png` | Smooth black volcanic glass | 4 |


### Transition Tiles (P1, 64x32 isometric)
| Asset | Description | Count |
|-------|-------------|-------|
| `rock-to-lava-*.png` | Cracked rock edge revealing lava below | 4 |
| `rock-to-road-*.png` | Dark stone blending into road | 4 |

### Decoration Sprites (P1)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `lava-crack.png` | 32x8px | Orange-yellow crack overlay on tiles |
| `forge-anvil.png` | 24x20px | Iron anvil with orange heat glow |
| `molten-pool.png` | 20x12px | Small lava puddle |
| `smoke-vent.png` | 16x24px | Volcanic steam vent |
| `ember-stone.png` | 12x12px | Glowing orange stone |

### Vegetation (P2)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `dead-tree-burnt.png` | 32x56px | Charred dead tree |
| `fire-fern.png` | 16x14px | Red/orange heat-resistant fern |

### Particle Effects (P0)
| Asset | Description |
|-------|-------------|
| `ember-spark.png` | 4x4 orange ember particle rising |

---

## Biome 5: Crystal Grotto (Research Fields)

**Theme**: Mystical dark ground with purple crystal formations
**Colors**: Dark purple (#2a2840, #342e4a), teal (#50c8b0), crystal violet (#8a70c0)

### Terrain Tiles (P0, 64x32 isometric)
| Asset | Description | Variants |
|-------|-------------|----------|
| `mystic-stone-*.png` | Dark purple-grey ground with sparkle dots | 4 |
| `mystic-pool-*.png` | Purple water with teal shimmer | 4 (animated) |
| `crystal-floor-*.png` | Translucent purple crystal ground | 4 |

### Transition Tiles (P1, 64x32 isometric)
| Asset | Description | Count |
|-------|-------------|-------|
| `mystic-to-pool-*.png` | Dark stone crumbling into mystic water | 4 |
| `mystic-to-road-*.png` | Purple-tinged stone blending into road | 4 |

### Decoration Sprites (P0)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `crystal-formation-*.png` | 24x36px | Purple elongated crystal with radial glow (3 variants) |
| `crystal-cluster-small.png` | 12x18px | Small crystal cluster |
| `rune-circle.png` | 32x20px | Glowing floor rune circle |
| `arcane-book.png` | 10x12px | Open floating spellbook |

### Vegetation (P1)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `glow-mushroom.png` | 12x16px | Bioluminescent purple mushroom |
| `crystal-vine.png` | 20x28px | Vine with crystal buds |

### Particle Effects (P0)
| Asset | Description |
|-------|-------------|
| `mystic-orb.png` | 8x8 purple/teal floating orb |

---

## Biome 6: Mountain Citadel (Code Heights)

**Theme**: Grey stone terrain with snow-capped peaks
**Colors**: Greys (#686878, #707080), whites (#c8d0e0, #e0e8f0)

### Terrain Tiles (P0, 64x32 isometric)
| Asset | Description | Variants |
|-------|-------------|----------|
| `mountain-stone-*.png` | Grey stone with white snow fleck pattern | 4 |
| `snow-*.png` | White snow-covered ground | 4 |
| `ice-*.png` | Blue-tinted icy surface | 4 |

### Transition Tiles (P1, 64x32 isometric)
| Asset | Description | Count |
|-------|-------------|-------|
| `stone-to-snow-*.png` | Grey stone with increasing snow coverage | 4 |
| `stone-to-road-*.png` | Mountain stone blending into road | 4 |

### Decoration Sprites (P0)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `mountain-peak.png` | 64x48px | Grey mountain triangle with white snow cap |
| `boulder-*.png` | 24x18px | Grey rock formations (3 variants) |
| `ice-crystal.png` | 16x24px | Clear ice spike formation |
| `flag-citadel.png` | 12x28px | Grey/blue military banner |

### Vegetation (P1)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `snow-pine.png` | 32x56px | Pine tree with snow on branches |
| `frost-bush.png` | 20x16px | White-frosted shrub |

### Particle Effects (P0)
| Asset | Description |
|-------|-------------|
| `snowflake.png` | 5x5 white snowflake falling slowly |

---

## Cross-Biome Assets

### Road Tiles (P0, 64x32 isometric)
| Asset | Description | Variants |
|-------|-------------|----------|
| `road-cobble-*.png` | Brown/grey cobblestone road | 4 |
| `road-intersection-*.png` | T-junction and crossroads | 4 |

### Bridge Sprites (P2)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `bridge-wood.png` | 64x40px | Wooden bridge over water/lava |
| `bridge-stone.png` | 64x40px | Stone bridge over water/lava |

### Gate/Checkpoint Sprites (P2)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `district-gate.png` | 48x56px | Ornate archway gate at road intersections |
| `checkpoint-post.png` | 16x32px | Guard post pillar |

### Ambient Overlays (P2)
| Asset | Dimensions | Description |
|-------|-----------|-------------|
| `fog-overlay.png` | 256x128px | Semi-transparent fog layer (for grotto/coast) |
| `heat-haze.png` | 128x64px | Wavy heat distortion (for volcanic) |
| `snow-overlay.png` | 256x128px | Falling snow overlay (for mountain) |

---

## Agent Building Tiers

Buildings upgrade visually based on agent reputation:

| Tier | Rating | Missions | Dimensions | Notes |
|------|--------|----------|-----------|-------|
| tent | New | 0 | 48x48px | Simple fabric tent |
| shack | < 3.0 | 1+ | 48x56px | Wooden lean-to |
| house | 3.0-3.4 | 5+ | 48x64px | Small stone house |
| townhouse | 3.5-3.9 | 10+ | 56x72px | Two-story townhouse |
| workshop | 4.0-4.4 | 25+ | 64x80px | Workshop with chimney |
| tower | 4.5-4.7 | 50+ | 64x96px | Tall tower with glow |
| landmark | 4.8+ | 100+ | 80x112px | Impressive landmark (AI-generated) |

## Guild Hall Tiers

| Tier | Missions | Rating | Dimensions | Notes |
|------|----------|--------|-----------|-------|
| bronze | < 10 | Any | 80x80px | Simple guild tent |
| silver | 10+ | 3.5+ | 96x96px | Stone guild hall |
| gold | 50+ | 4.0+ | 112x112px | Grand guild citadel (AI-generated) |
| diamond | 200+ | 4.5+ | 128x128px | Epic guild cathedral (AI-generated) |

---

## Animation Specifications

### Water Tiles (4 frames each, 250ms per frame)
- Frame 1: Base water color
- Frame 2: Wave highlight shifted right
- Frame 3: Wave highlight centered
- Frame 4: Wave highlight shifted left

### Lava Tiles (4 frames each, 400ms per frame)
- Frame 1: Base lava glow
- Frame 2: Bright pulse center
- Frame 3: Cooling crust pattern
- Frame 4: Return to base

### Construction Sparkles (4 frames, 150ms per frame)
- `sparkle_01.png` to `sparkle_04.png`: Yellow star burst sequence

### Firework Celebration (8 frames, 100ms per frame)
- `firework_01.png` to `firework_08.png`: Burst and fade sequence

---

## Priority Levels

- **P0** (Launch): Required for the map to look good. Currently handled by programmatic canvas textures but should be replaced with hand-crafted sprites.
- **P1** (Polish): Transitions, vegetation, decorations. Adds depth and richness.
- **P2** (Delight): Ambient overlays, bridges, gates, extra animations. Makes the world feel alive.

## Asset Checklist Summary

| Category | P0 | P1 | P2 | Total |
|----------|----|----|----|----|
| Terrain tiles (per biome) | 4-8 | 4-8 transitions | - | ~80 |
| Road tiles | 4 | 4 intersections | - | 8 |
| Decoration sprites | ~18 | ~24 | ~6 | ~48 |
| Vegetation sprites | - | ~12 | - | 12 |
| Particle textures | ~5 | - | 3 overlays | 8 |
| Building tiers | 7 | - | - | 7 |
| Guild halls | 4 | - | - | 4 |
| Bridges/gates | - | - | 4 | 4 |
| **Total** | **~38** | **~48** | **~13** | **~171** |

## Technical Notes

- All terrain tiles are currently generated programmatically via HTML5 Canvas API at runtime
- Replacing with hand-crafted sprites requires updating `WorldScene.ts` preload and texture references
- Water/lava tiles use alpha oscillation tween for shimmer effect (replace with spritesheet animation for better quality)
- The isometric diamond clip path: `moveTo(32,0) → lineTo(64,16) → lineTo(32,32) → lineTo(0,16) → close`
- Sprites must be tested at both overview zoom (~0.96x) and district zoom (~2.4x) for pixel art clarity

## License

- Free pack assets: Retain original licenses
- AI-generated assets: MIT License (same as project)
- Custom assets: MIT License
