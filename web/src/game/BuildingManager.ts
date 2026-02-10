import * as Phaser from 'phaser';
import { GuildVisual, AgentVisual } from '@/lib/world-state';

export class BuildingManager {
  constructor(private scene: Phaser.Scene) {}

  updateBuildings(_guilds: GuildVisual[], _agents: AgentVisual[]): void {
    // Day 2: place/update building sprites based on world state
  }

  destroy(): void {
    // cleanup
  }
}
