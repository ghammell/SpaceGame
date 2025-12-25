import { Alien, Laser } from '../entities/alien.js';

// Manages alien spawns and their lasers.
export class AlienManager {
  constructor(canvasWidth, canvasHeight, alienSprite) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.alienSprite = alienSprite;
    this.aliens = [];
    this.lasers = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this.getNextSpawnDelay();
  }

  // Updates cached canvas size.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // Clears all state.
  reset() {
    this.aliens = [];
    this.lasers = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this.getNextSpawnDelay();
  }

  // Randomized next spawn.
  getNextSpawnDelay() {
    const baseDelay = 9 + Math.random() * 9;
    return baseDelay;
  }

  // Advances aliens and lasers, spawning when needed.
  update(deltaSeconds, speedScale = 1) {
    this.spawnTimer += deltaSeconds;
    if (this.spawnTimer >= this.nextSpawnDelay && this.aliens.length < 2) {
      this.spawnAlien();
      this.spawnTimer = 0;
      this.nextSpawnDelay = this.getNextSpawnDelay();
    }

    for (const alien of this.aliens) {
      alien.update(deltaSeconds, speedScale);
      const firedLaser = alien.tryFire();
      if (firedLaser !== null) {
        this.lasers.push(firedLaser);
      }
    }

    for (const laser of this.lasers) {
      laser.update(deltaSeconds);
    }

    this.aliens = this.aliens.filter((alien) => alien.isOffScreen() === false);
    this.lasers = this.lasers.filter((laser) => laser.isOffScreen(this.canvasWidth) === false);
  }

  // Creates and stores an alien.
  spawnAlien() {
    const alien = new Alien(this.canvasWidth, this.canvasHeight, this.alienSprite);
    this.aliens.push(alien);
  }

  // Draws all aliens and lasers.
  draw(drawingContext) {
    for (const alien of this.aliens) {
      alien.draw(drawingContext);
    }
    for (const laser of this.lasers) {
      laser.draw(drawingContext);
    }
  }
}

