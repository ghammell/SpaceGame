import { PowerUp, getRandomPowerUpType } from '../entities/powerUp.js';

// Manages spawning and lifecycle of collectible power-ups.
export class PowerUpManager {
  constructor(canvasWidth, canvasHeight, iconMap) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.iconMap = iconMap;
    this.powerUps = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this.getNextSpawnDelay();
  }

  // Updates cached canvas sizes.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // Clears power-ups and resets timers.
  reset() {
    this.powerUps = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this.getNextSpawnDelay();
  }

  // Determines the next randomized spawn delay.
  getNextSpawnDelay() {
    const baseDelay = 5 + Math.random() * 3.5;
    return baseDelay;
  }

  // Advances timers, spawns power-ups, and prunes off-screen items.
  update(deltaSeconds) {
    this.spawnTimer += deltaSeconds;
    if (this.spawnTimer >= this.nextSpawnDelay && this.powerUps.length < 2) {
      this.spawnPowerUp();
      this.spawnTimer = 0;
      this.nextSpawnDelay = this.getNextSpawnDelay();
    }

    for (const powerUp of this.powerUps) {
      powerUp.update(deltaSeconds);
    }

    this.powerUps = this.powerUps.filter((powerUp) => {
      if (powerUp.isOffScreen() === true) {
        return false;
      }
      return true;
    });
  }

  // Creates and stores a new power-up of a random type.
  spawnPowerUp() {
    const powerUpType = getRandomPowerUpType();
    const powerUp = new PowerUp(this.canvasWidth, this.canvasHeight, powerUpType, this.iconMap?.[powerUpType]);
    this.powerUps.push(powerUp);
  }

  // Draws all active power-ups.
  draw(drawingContext) {
    for (const powerUp of this.powerUps) {
      powerUp.draw(drawingContext);
    }
  }
}

