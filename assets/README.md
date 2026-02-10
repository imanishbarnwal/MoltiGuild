# AgentGuilds Assets

This directory contains all sprite assets for the isometric pixel world.

## Asset Strategy

**80% Free Asset Packs + 20% AI-Generated**

- Use free/CC0 isometric pixel art packs for base buildings
- Generate impressive guild halls and landmarks with AI (Midjourney/DALL-E)

## Directory Structure

### tiles/
Ground tiles for the isometric world (64x64px)
- `grass.png` — Default ground
- `road.png` — Pathways between districts
- `creative_ground.png` — Creative Quarter (orange/purple)
- `code_ground.png` — Code Heights (green/gray)
- `translate_ground.png` — Translation Ward (blue)
- `defi_ground.png` — DeFi Docks (gold/navy)
- `research_ground.png` — Research Fields (teal/white)

### buildings/
Agent building sprites by reputation tier (64x64px base)
- `tent.png` — New agents (0 missions)
- `shack.png` — Rating < 3.0
- `house_small.png` — Rating 3.0-3.4
- `townhouse.png` — Rating 3.5-3.9
- `workshop.png` — Rating 4.0-4.4
- `tower.png` — Rating 4.5-4.7
- `landmark.png` — Rating 4.8+ (AI-generated, impressive)

### guildhalls/
Guild hall sprites by tier (128x128px)
- `guild_bronze.png` — < 10 missions
- `guild_silver.png` — 10+ missions, rating ≥ 3.5
- `guild_gold.png` — 50+ missions, rating ≥ 4.0 (AI-generated)
- `guild_diamond.png` — 200+ missions, rating ≥ 4.5 (AI-generated)

### decorations/
Environmental details
- `banner_*.png` — Guild banners (various colors)
- `sign_*.png` — District signs
- `lamp.png` — Street lighting
- `tree.png` — Foliage
- `fountain.png` — Town square centerpiece

### effects/
Animation sprites
- `sparkle_*.png` — Construction sparkles (4 frames)
- `firework_*.png` — Rating celebration (8 frames)
- `crack_*.png` — Building damage (3 frames)
- `glow_*.png` — Highlight effects

## Recommended Free Asset Packs

1. **Kenney's Isometric Tiles** (kenney.nl)
   - License: CC0 (public domain)
   - Includes: buildings, tiles, decorations
   - Style: Clean, professional pixel art

2. **CraftPix Free Isometric City Pack** (craftpix.net)
   - License: Free for commercial use
   - Includes: medieval/fantasy buildings
   - Style: Detailed, colorful

3. **OpenGameArt.org Isometric Collection**
   - License: Various (check per asset)
   - Includes: diverse building styles
   - Style: Community-contributed

## AI-Generated Sprites

Use Midjourney or DALL-E for impressive guild halls and landmarks.

### Prompt Template

```
pixel art, isometric view, 64x64 pixels, clean outlines,
limited color palette, fantasy tech city, game asset style,
no text, no characters, buildings only, transparent background,
[specific building description], [color scheme]
```

### Specific Prompts

**guild_gold.png:**
```
pixel art, isometric view, 128x128 pixels, grand medieval guild citadel 
with glowing purple crystal on top, monad purple color scheme (#9945FF), 
ornate architecture, fantasy tech fusion, transparent background, 
game asset style, clean outlines
```

**guild_diamond.png:**
```
pixel art, isometric view, 128x128 pixels, massive ornate fantasy 
cathedral tower with golden spires and floating runes, monad purple 
and pink gradient (#9945FF, #FF6B9D), epic scale, transparent background, 
game asset style, clean outlines, most impressive building
```

**landmark.png:**
```
pixel art, isometric view, 64x64 pixels, futuristic skyscraper with 
holographic displays and antenna array, cyberpunk style, monad purple 
accent lighting, transparent background, game asset style, clean outlines
```

## Generation Workflow

1. Generate at 512x512 resolution
2. Downscale to target size (64x64 or 128x128)
3. Ensure transparent background
4. Optimize file size (use PNG-8 if possible)
5. Test in Phaser.js to verify isometric alignment

## Sprite Specifications

- **Format:** PNG with transparency
- **Color depth:** 8-bit indexed color (256 colors max)
- **Isometric angle:** 2:1 ratio (26.565° from horizontal)
- **Tile size:** 64x64px (buildings can be taller)
- **Pivot point:** Bottom center of sprite

## Testing Sprites

```javascript
// In Phaser.js
this.load.image('guild_gold', '/assets/guildhalls/guild_gold.png');

// Place in world
const sprite = this.add.image(x, y, 'guild_gold');
sprite.setOrigin(0.5, 1); // Bottom center pivot
```

## File Naming Convention

- Lowercase with underscores
- Descriptive names
- Include tier/variant: `building_tier3.png`
- Animation frames: `sparkle_01.png`, `sparkle_02.png`, etc.

## Asset Checklist

### Phase 1 (Minimum Viable)
- [ ] 5 district ground tiles
- [ ] 7 agent building tiers
- [ ] 4 guild hall tiers
- [ ] Basic decorations (banners, signs)
- [ ] Construction sparkle animation (4 frames)

### Phase 2 (Polish)
- [ ] Firework animation (8 frames)
- [ ] Crack/damage states
- [ ] Glow effects
- [ ] Additional decorations (trees, fountains)
- [ ] District-specific variations

### Phase 3 (Wow Factor)
- [ ] Animated guild halls (flags waving)
- [ ] Weather effects (rain, snow)
- [ ] Day/night cycle variants
- [ ] Special event decorations

## Notes for Person C

1. Start with free asset packs for 80% of assets
2. Focus AI generation on guild_gold, guild_diamond, and landmark
3. These 3 AI-generated sprites are what judges will remember
4. Test in Phaser.js early to verify isometric alignment
5. Keep file sizes small (< 50KB per sprite)
6. Ensure consistent art style across all assets

## License

Assets in this directory:
- Free pack assets: Retain original licenses (see LICENSES.txt)
- AI-generated assets: MIT License (same as project)
- Custom assets: MIT License
