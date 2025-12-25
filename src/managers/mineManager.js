import { Mine } from '../entities/mine.js';

// Manages drifting mines as an additional hazard.
export class MineManager {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.mines = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this.getNextSpawnDelay();
  }

  // Updates cached canvas size.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // Clears mines and timers.
  reset() {
    this.mines = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this.getNextSpawnDelay();
  }

  // Calculates the next spawn delay.
  getNextSpawnDelay() {
    const baseDelay = 5.5 + Math.random() * 4.5;
    return baseDelay;
  }

  // Updates spawn timing and mine positions.
  update(deltaSeconds, speedScale = 1, sizeScale = 1) {
    this.spawnTimer += deltaSeconds;
    if (this.spawnTimer >= this.nextSpawnDelay && this.mines.length < 3) {
      this.spawnMine();
      this.spawnTimer = 0;
      this.nextSpawnDelay = this.getNextSpawnDelay();
    }

    for (const mine of this.mines) {
      mine.update(deltaSeconds, speedScale, sizeScale);
    }

    this.mines = this.mines.filter((mine) => mine.isOffScreen() === false);
  }

  // Creates and stores a mine.
  spawnMine() {
    const mine = new Mine(this.canvasWidth, this.canvasHeight);
    this.mines.push(mine);
  }

  // Draws all mines.
  draw(drawingContext) {
    for (const mine of this.mines) {
      mine.draw(drawingContext);
    }
  }
}

