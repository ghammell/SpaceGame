import { Asteroid } from '../entities/asteroid.js';

// Manages asteroid spawning and lifecycle.
export class AsteroidManager {
  constructor(canvasWidth, canvasHeight, asteroidSprites) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.asteroidSprites = asteroidSprites;
    this.asteroids = [];
    this.spawnTimer = 0;
    this.spawnIntervalStart = 1.8;
    this.spawnIntervalMin = 0.85;
    this.baseSpeedStart = 240;
    this.baseSpeedMax = 360;
    this.spawnIntervalSeconds = this.spawnIntervalStart;
    this.baseSpeed = this.baseSpeedStart;
    this.difficultyTimer = 0;
  }

  // Updates cached canvas dimensions.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // Clears all asteroids and timers.
  reset() {
    this.asteroids = [];
    this.spawnTimer = 0;
    this.difficultyTimer = 0;
  }

  // Updates spawn timers, difficulty scaling, and asteroid positions.
  update(deltaSeconds, speedScale, sizeScale = 1, waveSettings) {
    this.spawnTimer += deltaSeconds;
    this.difficultyTimer += deltaSeconds;

    const difficultyProgress = Math.min(this.difficultyTimer / 180, 1);
    const effectiveInterval = this.lerp(this.spawnIntervalStart, this.spawnIntervalMin, difficultyProgress);
    this.baseSpeed = this.lerp(this.baseSpeedStart, this.baseSpeedMax, difficultyProgress);
    if (this.spawnTimer >= effectiveInterval) {
      this.spawnAsteroid();
      this.spawnTimer = 0;
    }

    for (const asteroid of this.asteroids) {
      asteroid.update(deltaSeconds, speedScale, sizeScale, waveSettings);
    }

    this.asteroids = this.asteroids.filter((asteroid) => {
      if (asteroid.isOffScreen() === true) {
        return false;
      }
      return true;
    });
  }

  // Creates and stores a new asteroid.
  spawnAsteroid() {
    const chosenSprite = this.pickRandomSprite();
    if (chosenSprite === null || chosenSprite === undefined) {
      return;
    }
    const sizeScale = this.getCurrentSizeScale();
    const asteroid = new Asteroid(this.canvasWidth, this.canvasHeight, this.baseSpeed, chosenSprite, sizeScale);
    this.asteroids.push(asteroid);
  }

  // Picks a random asteroid sprite.
  pickRandomSprite() {
    if (this.asteroidSprites === undefined || this.asteroidSprites.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * this.asteroidSprites.length);
    return this.asteroidSprites[randomIndex];
  }

  // Computes current average size ramp.
  getCurrentSizeScale() {
    const progress = Math.min(this.difficultyTimer / 180, 1);
    return this.lerp(0.75, 1.25, progress);
  }

  // Linear interpolation helper.
  lerp(min, max, t) {
    return min + (max - min) * t;
  }

  // Draws all active asteroids.
  draw(drawingContext) {
    for (const asteroid of this.asteroids) {
      asteroid.draw(drawingContext);
    }
  }
}

