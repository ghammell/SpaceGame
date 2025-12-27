import { Player } from '../entities/player.js';
import { AsteroidManager } from '../managers/asteroidManager.js';
import { PowerUpManager } from '../managers/powerUpManager.js';
import { AlienManager } from '../managers/alienManager.js';
import { Starfield } from '../effects/starfield.js';
import { Explosion } from '../effects/explosion.js';
import { Bullet } from '../entities/bullet.js';
import { setTestModeConfig } from '../entities/powerUp.js';

// Desktop canvas sizing: keep the on-screen playfield at this width (or smaller), but render at higher resolution
// so entities appear smaller without introducing padding inside the canvas.
const DESKTOP_MAX_DISPLAY_WIDTH_PX = 1100;
const DESKTOP_TARGET_ASPECT_RATIO = 9 / 16;
const DESKTOP_RENDER_SCALE = 0.8;
const MOBILE_RENDER_SCALE = 0.65;

// Drives the entire game loop, state, and rendering.
export class Game {
  constructor(canvasElement, drawingContext, hudElements, assets) {
    this.canvas = canvasElement;
    this.context = drawingContext;
    this.hudElements = hudElements;
    this.summaryOverlay = assets.summaryOverlay;
    this.summaryFields = assets.summaryFields;
    this.player = new Player(this.canvas.width, this.canvas.height, assets.spacemanImage);
    this.starfield = new Starfield(this.canvas.width, this.canvas.height);
    this.asteroidManager = new AsteroidManager(this.canvas.width, this.canvas.height, assets.asteroidSprites);
    this.powerUpManager = new PowerUpManager(this.canvas.width, this.canvas.height, assets.powerUpIcons);
    this.alienManager = new AlienManager(this.canvas.width, this.canvas.height, assets.alienSprites);
    this.heartIcon = new Image();
    this.heartIcon.src = './assets/hud-heart.svg';
    this.scoreIcon = new Image();
    this.scoreIcon.src = './assets/hud-points.svg';
    this.spaceDustCloudImages = [
      this.loadImage('./assets/effects/spacedust-cloud1.svg'),
      this.loadImage('./assets/effects/spacedust-cloud2.svg'),
      this.loadImage('./assets/effects/spacedust-cloud3.svg')
    ];
    this.highScores = this.loadHighScores();
    this.lastUsedName = this.loadLastName();
    this.renderHighScores();
    this.isPaused = false;
    this.explosions = [];
    this.bullets = [];
    this.isRunning = false;
    this.isGameOver = false;
    this.livesRemaining = 3;
    this.invulnerabilitySeconds = 0;
    this.hitPauseSeconds = 0;
    this.hitFlashSeconds = 0;
    this.cloakTimer = 0;
    this.blasterTimer = 0;
    this.slowTimer = 0;
    this.multiplierTimer = 0;
    this.scoreMultiplier = 1;
    this.blackHoleTimer = 0;
    this.solarFlareTimer = 0;
    this.waveTimer = 0;
    this.waveSettings = { amplitude: 42, speed: 2.6 };
    this.durationLookup = { cloak: 0, blaster: 0, slow: 0, forceField: 0, spaceDust: 0, multiplier: 0, blackHole: 0, solarFlare: 0, wave: 0 };
    this.powerupUptime = { cloak: 0, blaster: 0, slow: 0, forceField: 0, spaceDust: 0, multiplier: 0, blackHole: 0, solarFlare: 0, wave: 0 };
    this.forceFieldTimer = 0;
    this.forceFieldPulseCooldown = 0;
    this.forceFieldPulseActive = 0;
    this.forceFieldPulseDuration = 0.25;
    this.forceFieldRadius = 230;
    this.spaceDustTimer = 0;
    this.spaceDustIntensity = 0;
    this.spaceDustParticles = [];
    this.testModeEnabled = false;
    this.testModeUsedDuringRun = false;
    this.infiniteLivesEnabled = false;
    this.testModePowerUp = null;
    this.onPauseChange = null;
    this.uiPadding = 0;
    this.viewWidth = 0;
    this.viewHeight = 0;
    this.renderScale = 1;
    this.isCountdownActive = false;
    this.countdownRemaining = 0;
    this.resetFrameTimestampNextFrame = false;
    this.hasSavedThisRun = false;
    this.testModePowerUp = null;
    this.infiniteLivesEnabled = false;
    this.ammoCount = 0;
    this.fireCooldownSeconds = 0;
    this.totalScore = 0;
    this.scoreBreakdown = { time: 0, destroyed: 0, phased: 0, negative: 0, misc: 0 };
    this.destroyedCount = 0;
    this.phasedCount = 0;
    this.timeElapsedSeconds = 0;
    this.powerupCollectedCount = 0;
    this.movementInput = { moveLeft: false, moveRight: false, moveDown: false };
    this.lastFrameTimestamp = 0;
    this.isTouchPrimaryDevice = this.detectTouchFirstDevice();

    this.gameLoop = this.gameLoop.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleResize = this.handleResize.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  // Determines whether the current device is likely touch-first or mobile using capability signals.
  detectTouchFirstDevice() {
    if (navigator.userAgentData !== undefined && navigator.userAgentData.mobile === true) {
      return true;
    }

    if (typeof navigator.maxTouchPoints === 'number') {
      if (navigator.maxTouchPoints > 0) {
        return true;
      }
    }

    if (typeof window.matchMedia === 'function') {
      const coarsePointerQuery = window.matchMedia('(any-pointer: coarse)');
      if (coarsePointerQuery !== null && coarsePointerQuery.matches === true) {
        return true;
      }
    }

    if ('ontouchstart' in window && navigator.maxTouchPoints > 0) {
      return true;
    }

    const userAgentSource = navigator.userAgent ?? navigator.vendor ?? window.opera ?? '';
    if (typeof userAgentSource === 'string') {
      if (/Mobi/i.test(userAgentSource) === true) {
        return true;
      }
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgentSource) === true) {
        return true;
      }
    }

    return false;
  }

  // Lightweight image loader for overlay assets.
  loadImage(sourceUrl) {
    const img = new Image();
    img.src = sourceUrl;
    return img;
  }

  // Starts or restarts the game.
  start(countdownSeconds = 3) {
    this.resetWorld();
    this.isCountdownActive = true;
    this.countdownRemaining = countdownSeconds;
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTimestamp = 0;
    this.animationFrameId = window.requestAnimationFrame(this.gameLoop);
  }

  // Enables a single-powerup test mode.
  enterTestMode(powerupKey) {
    this.testModePowerUp = powerupKey;
    setTestModeConfig(true, powerupKey !== null ? [powerupKey] : null);
    this.updateStatus(`Test mode: ${powerupKey ?? 'all'}`);
  }

  // Exits test mode, returning to normal random powerups.
  exitTestMode() {
    this.testModePowerUp = null;
    setTestModeConfig(false, null);
    this.updateStatus('Test mode off');
  }

  // Applies test mode settings from UI.
  applyTestModeConfig(config) {
    const { enabled, allowedPowerups, infiniteLives } = config;
    setTestModeConfig(enabled, allowedPowerups ?? null);
    this.testModePowerUp = enabled === true && Array.isArray(allowedPowerups) && allowedPowerups.length === 1 ? allowedPowerups[0] : null;
    this.infiniteLivesEnabled = Boolean(infiniteLives);
    this.testModeEnabled = Boolean(enabled);
    if (this.testModeEnabled === true) {
      this.testModeUsedDuringRun = true;
    }
    if (this.infiniteLivesEnabled === true) {
      this.livesRemaining = Infinity;
    }
    this.updateHud();
  }

  // Resets the world state and HUD values.
  resetWorld() {
    this.livesRemaining = 3;
    this.isGameOver = false;
    this.isPaused = false;
    this.invulnerabilitySeconds = 0;
    this.hitPauseSeconds = 0;
    this.hitFlashSeconds = 0;
    this.cloakTimer = 0;
    this.blasterTimer = 0;
    this.slowTimer = 0;
    this.multiplierTimer = 0;
    this.scoreMultiplier = 1;
    this.blackHoleTimer = 0;
    this.solarFlareTimer = 0;
    this.waveTimer = 0;
    this.forceFieldTimer = 0;
    this.forceFieldPulseCooldown = 0;
    this.forceFieldPulseActive = 0;
    this.spaceDustTimer = 0;
    this.spaceDustIntensity = 0;
    this.spaceDustParticles = [];
    this.durationLookup = { cloak: 0, blaster: 0, slow: 0, forceField: 0, spaceDust: 0, multiplier: 0, blackHole: 0, solarFlare: 0, wave: 0 };
    this.powerupUptime = { cloak: 0, blaster: 0, slow: 0, forceField: 0, spaceDust: 0, multiplier: 0, blackHole: 0, solarFlare: 0, wave: 0 };
    this.isCountdownActive = false;
    this.countdownRemaining = 0;
    this.resetFrameTimestampNextFrame = false;
    this.hasSavedThisRun = false;
    this.testModePowerUp = null;
    this.ammoCount = 0;
    this.fireCooldownSeconds = 0;
    this.totalScore = 0;
    this.scoreBreakdown = { time: 0, destroyed: 0, phased: 0, negative: 0, misc: 0 };
    this.destroyedCount = 0;
    this.phasedCount = 0;
    this.timeElapsedSeconds = 0;
    this.powerupCollectedCount = 0;
    this.testModeUsedDuringRun = this.testModeEnabled === true;
    this.player.reset(this.canvas.height * 0.5);
    this.player.setAppearanceByLives(this.livesRemaining);
    this.asteroidManager.reset();
    this.powerUpManager.reset();
    this.alienManager.reset();
    this.explosions = [];
    this.bullets = [];
    this.hideSummary();
    this.updateHud();
    this.updateStatus('');
  }

  // Updates cached canvas dimensions and child systems.
  handleResize() {
    this.isTouchPrimaryDevice = this.detectTouchFirstDevice();
    const availableHeight = Math.max(window.innerHeight - this.uiPadding, 200);
    let displayWidthPixels;
    let displayHeightPixels;
    let renderScale;

    if (this.isTouchPrimaryDevice === true) {
      renderScale = MOBILE_RENDER_SCALE;
      displayWidthPixels = window.innerWidth;
      displayHeightPixels = availableHeight;
    } else {
      renderScale = DESKTOP_RENDER_SCALE;
      displayWidthPixels = Math.min(DESKTOP_MAX_DISPLAY_WIDTH_PX, window.innerWidth * 0.98);
      displayHeightPixels = displayWidthPixels * DESKTOP_TARGET_ASPECT_RATIO;
      if (displayHeightPixels > availableHeight) {
        displayHeightPixels = availableHeight;
        displayWidthPixels = displayHeightPixels * (16 / 9);
      }
    }

    const logicalWidthPixels = Math.round(displayWidthPixels / renderScale);
    const logicalHeightPixels = Math.round(displayHeightPixels / renderScale);

    this.renderScale = renderScale;
    this.viewWidth = logicalWidthPixels;
    this.viewHeight = logicalHeightPixels;

    this.canvas.width = logicalWidthPixels;
    this.canvas.height = logicalHeightPixels;
    this.canvas.style.width = `${displayWidthPixels}px`;
    this.canvas.style.height = `${displayHeightPixels}px`;

    this.player.setCanvasSize(logicalWidthPixels, logicalHeightPixels);
    this.starfield.setCanvasSize(logicalWidthPixels, logicalHeightPixels);
    this.asteroidManager.setCanvasSize(logicalWidthPixels, logicalHeightPixels);
    this.powerUpManager.setCanvasSize(logicalWidthPixels, logicalHeightPixels);
    this.alienManager.setCanvasSize(logicalWidthPixels, logicalHeightPixels);
  }

  // Handles keyboard input for movement, restart, and firing.
  handleKeyDown(event) {
    const target = event.target;
    if (target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable === true)) {
      return;
    }
    if (event.code === 'ArrowUp') {
      event.preventDefault();
      if (this.isGameOver === true || this.isCountdownActive === true) {
        return;
      }
      this.player.jump();
    }

    if (event.code === 'Space') {
      event.preventDefault();
      if (this.isCountdownActive === true) {
        this.skipCountdown();
        return;
      }
      if (this.isGameOver === true) {
        return;
      }
      this.togglePause();
    }

    if (event.code === 'ArrowLeft') {
      this.movementInput.moveLeft = true;
    }

    if (event.code === 'ArrowRight') {
      this.movementInput.moveRight = true;
    }

    if (event.code === 'ArrowDown') {
      this.movementInput.moveDown = true;
    }

    if (event.code === 'KeyF') {
      this.fireBullet();
    }
  }

  // Tracks key releases for movement.
  handleKeyUp(event) {
    if (event.code === 'ArrowLeft') {
      this.movementInput.moveLeft = false;
    }
    if (event.code === 'ArrowRight') {
      this.movementInput.moveRight = false;
    }
    if (event.code === 'ArrowDown') {
      this.movementInput.moveDown = false;
    }
  }

  // Skips the pre-run countdown.
  skipCountdown() {
    this.countdownRemaining = 0;
    this.isCountdownActive = false;
    this.resetFrameTimestampNextFrame = true;
  }

  // Updates HUD text values for lives and abilities.
  updateHud() {
    const livesDisplay = this.infiniteLivesEnabled === true ? '∞' : String(this.livesRemaining);
    this.hudElements.livesElement.textContent = livesDisplay;
    this.hudElements.cloakElement.textContent = this.cloakTimer > 0 ? `${this.cloakTimer.toFixed(1)}s` : '--';
    this.hudElements.blasterElement.textContent = this.blasterTimer > 0 ? `${this.ammoCount} ammo` : '--';
    this.hudElements.slowElement.textContent = this.slowTimer > 0 ? `${this.slowTimer.toFixed(1)}s` : '--';
    this.hudElements.multiplierElement.textContent = this.multiplierTimer > 0 ? `x${this.scoreMultiplier.toFixed(1)}` : 'x1';
    this.hudElements.totalScoreElement.textContent = Math.floor(this.totalScore).toLocaleString();
    this.hudElements.destroyedElement.textContent = `${this.destroyedCount}`;
    this.hudElements.phasedElement.textContent = `${this.phasedCount}`;
    this.hudElements.timeElement.textContent = `${Math.floor(this.timeElapsedSeconds)}s`;
    this.hudElements.powerupCountElement.textContent = `${this.powerupCollectedCount}`;

    this.hudElements.cloakElement.className = this.cloakTimer > 0 ? 'value good' : 'value';
    this.hudElements.blasterElement.className = this.blasterTimer > 0 ? 'value warn' : 'value';
    this.hudElements.slowElement.className = this.slowTimer > 0 ? 'value good' : 'value';
    this.hudElements.multiplierElement.className = this.multiplierTimer > 0 ? 'value warn' : 'value';
  }

  // Updates the status message display.
  updateStatus(message) {
    this.hudElements.statusElement.textContent = message;
  }

  // Performs per-frame updates to timers and entities.
  update(deltaSeconds) {
    if (this.isCountdownActive === true) {
      this.starfield.update(deltaSeconds);
      this.countdownRemaining -= deltaSeconds;
      if (this.countdownRemaining <= 0) {
        this.countdownRemaining = 0;
        this.isCountdownActive = false;
        this.resetFrameTimestampNextFrame = true;
      }
      return;
    }

    if (this.isPaused === true) {
      return;
    }
    this.starfield.update(deltaSeconds);
    this.updateTimers(deltaSeconds);

    if (this.isGameOver === true) {
      this.updateExplosions(deltaSeconds);
      return;
    }

    if (this.hitPauseSeconds > 0) {
      this.updateExplosions(deltaSeconds);
      return;
    }

    const asteroidSpeedScale = (this.slowTimer > 0 ? 0.55 : 1) * (this.blackHoleTimer > 0 ? 1.35 : 1);
    const hazardSizeScale = this.solarFlareTimer > 0 ? 1.3 : 1;
    const waveSettings = this.waveTimer > 0 ? this.waveSettings : undefined;

    const touchedBoundary = this.player.update(deltaSeconds, this.movementInput);
    if (touchedBoundary === true) {
      this.handleBoundaryHit();
    }
    this.asteroidManager.update(deltaSeconds, asteroidSpeedScale, hazardSizeScale, waveSettings);
    this.powerUpManager.update(deltaSeconds);
    this.alienManager.update(deltaSeconds, asteroidSpeedScale);
    this.updateBullets(deltaSeconds);
    this.updateExplosions(deltaSeconds);
    this.updateSpaceDust(deltaSeconds);
    this.updateForceField(deltaSeconds);
    this.detectCollisions();
  }

  // Reduces gameplay timers each frame.
  updateTimers(deltaSeconds) {
    const prevBlackHole = this.blackHoleTimer;
    const prevSolarFlare = this.solarFlareTimer;
    const prevWave = this.waveTimer;
    const prevMultiplier = this.multiplierTimer;
    this.timeElapsedSeconds += deltaSeconds;
    const negativeActive = this.blackHoleTimer > 0 || this.solarFlareTimer > 0 || this.waveTimer > 0;
    const timePoints = deltaSeconds * 5 * (negativeActive ? 2 : 1);
    this.addScore(timePoints, 'time');
    if (this.cloakTimer > 0) {
      this.powerupUptime.cloak += deltaSeconds;
    }
    if (this.blasterTimer > 0) {
      this.powerupUptime.blaster += deltaSeconds;
    }
    if (this.slowTimer > 0) {
      this.powerupUptime.slow += deltaSeconds;
    }
    if (this.forceFieldTimer > 0) {
      this.powerupUptime.forceField += deltaSeconds;
    }
    if (this.spaceDustTimer > 0) {
      this.powerupUptime.spaceDust += deltaSeconds;
    }
    if (this.invulnerabilitySeconds > 0) {
      this.invulnerabilitySeconds -= deltaSeconds;
      if (this.invulnerabilitySeconds < 0) {
        this.invulnerabilitySeconds = 0;
      }
    }

    if (this.hitPauseSeconds > 0) {
      this.hitPauseSeconds -= deltaSeconds;
      if (this.hitPauseSeconds < 0) {
        this.hitPauseSeconds = 0;
      }
    }

    if (this.hitFlashSeconds > 0) {
      this.hitFlashSeconds -= deltaSeconds;
      if (this.hitFlashSeconds < 0) {
        this.hitFlashSeconds = 0;
      }
    }

    if (this.cloakTimer > 0) {
      this.cloakTimer -= deltaSeconds;
      if (this.cloakTimer < 0) {
        this.cloakTimer = 0;
      }
    }

    if (this.blasterTimer > 0) {
      this.blasterTimer -= deltaSeconds;
      if (this.blasterTimer < 0) {
        this.blasterTimer = 0;
        this.ammoCount = 0;
      }
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= deltaSeconds;
      if (this.slowTimer < 0) {
        this.slowTimer = 0;
      }
    }

    if (this.forceFieldTimer > 0) {
      this.forceFieldTimer -= deltaSeconds;
      if (this.forceFieldTimer < 0) {
        this.forceFieldTimer = 0;
      }
    }

    if (this.spaceDustTimer > 0) {
      this.spaceDustTimer -= deltaSeconds;
      if (this.spaceDustTimer < 0) {
        this.spaceDustTimer = 0;
        this.spaceDustIntensity = 0;
        this.spaceDustParticles = [];
      } else {
        const ratio = this.durationLookup.spaceDust > 0 ? this.spaceDustTimer / this.durationLookup.spaceDust : 0;
        this.spaceDustIntensity = Math.max(0.25, ratio);
      }
    }

    if (this.multiplierTimer > 0) {
      this.multiplierTimer -= deltaSeconds;
      if (this.multiplierTimer < 0) {
        this.multiplierTimer = 0;
        this.scoreMultiplier = 1;
      }
    }

    if (this.blackHoleTimer > 0) {
      this.blackHoleTimer -= deltaSeconds;
      if (this.blackHoleTimer < 0) {
        this.blackHoleTimer = 0;
      }
    }

    if (this.solarFlareTimer > 0) {
      this.solarFlareTimer -= deltaSeconds;
      if (this.solarFlareTimer < 0) {
        this.solarFlareTimer = 0;
      }
    }

    if (this.waveTimer > 0) {
      this.waveTimer -= deltaSeconds;
      if (this.waveTimer < 0) {
        this.waveTimer = 0;
      }
    }

    if (prevBlackHole > 0 && this.blackHoleTimer <= 0) {
      this.addScore(200, 'negative');
    }
    if (prevSolarFlare > 0 && this.solarFlareTimer <= 0) {
      this.addScore(200, 'negative');
    }
    if (prevWave > 0 && this.waveTimer <= 0) {
      this.addScore(200, 'negative');
    }
    if (prevMultiplier > 0 && this.multiplierTimer <= 0) {
      // no bonus for multiplier ending
    }

    if (this.fireCooldownSeconds > 0) {
      this.fireCooldownSeconds -= deltaSeconds;
      if (this.fireCooldownSeconds < 0) {
        this.fireCooldownSeconds = 0;
      }
    }

    this.updateHud();
  }

  // Handles firing a bullet when the blaster is active.
  fireBullet() {
    if (this.blasterTimer <= 0) {
      return;
    }

    if (this.fireCooldownSeconds > 0) {
      return;
    }

    const spawnX = this.player.positionX + this.player.width * 0.45;
    const spawnY = this.player.positionY - this.player.height * 0.05;
    const bullet = new Bullet(spawnX, spawnY);
    this.bullets.push(bullet);
    this.fireCooldownSeconds = 0.12;
    this.updateHud();
  }

  // Updates bullet positions and resolves asteroid hits.
  updateBullets(deltaSeconds) {
    for (const bullet of this.bullets) {
      bullet.update(deltaSeconds);
    }

    const remainingBullets = [];
    for (const bullet of this.bullets) {
      let bulletHitAsteroid = false;
      let bulletHitAlien = false;
      for (let asteroidIndex = this.asteroidManager.asteroids.length - 1; asteroidIndex >= 0; asteroidIndex -= 1) {
        const asteroid = this.asteroidManager.asteroids[asteroidIndex];
        if (this.isBoundingOverlap(bullet.getBounds(), asteroid.getBounds()) === true) {
          this.asteroidManager.asteroids.splice(asteroidIndex, 1);
          bulletHitAsteroid = true;
          this.explosions.push(new Explosion(asteroid.positionX, asteroid.positionY));
          this.destroyedCount += 1;
          this.addScore(120, 'destroyed');
          break;
        }
      }

      if (bulletHitAsteroid === false) {
        for (let alienIndex = this.alienManager.aliens.length - 1; alienIndex >= 0; alienIndex -= 1) {
          const alien = this.alienManager.aliens[alienIndex];
          if (this.isBoundingOverlap(bullet.getBounds(), alien.getBounds()) === true) {
            this.alienManager.aliens.splice(alienIndex, 1);
            bulletHitAlien = true;
            this.explosions.push(new Explosion(alien.positionX, alien.positionY));
            this.destroyedCount += 1;
            this.addScore(160, 'destroyed');
            break;
          }
        }
      }

      if (bulletHitAsteroid === false && bulletHitAlien === false && bullet.isOffScreen(this.canvas.width) === false) {
        remainingBullets.push(bullet);
      }
    }

    this.bullets = remainingBullets;
    this.updateHud();
  }

  // Updates explosion animations and removes finished ones.
  updateExplosions(deltaSeconds) {
    for (const explosion of this.explosions) {
      explosion.update(deltaSeconds);
    }

    this.explosions = this.explosions.filter((explosion) => {
      if (explosion.isFinished() === true) {
        return false;
      }
      return true;
    });
  }

  // Drives force field pulses, timing, and asteroid clearing.
  updateForceField(deltaSeconds) {
    if (this.forceFieldTimer <= 0) {
      this.forceFieldPulseActive = 0;
      return;
    }

    if (this.forceFieldPulseCooldown > 0) {
      this.forceFieldPulseCooldown -= deltaSeconds;
      if (this.forceFieldPulseCooldown < 0) {
        this.forceFieldPulseCooldown = 0;
      }
    }

    if (this.forceFieldPulseActive > 0) {
      this.forceFieldPulseActive -= deltaSeconds;
      if (this.forceFieldPulseActive < 0) {
        this.forceFieldPulseActive = 0;
      } else {
        this.applyForceFieldPulse();
      }
    }

    if (this.forceFieldPulseActive <= 0 && this.forceFieldPulseCooldown <= 0) {
      this.forceFieldPulseActive = this.forceFieldPulseDuration;
      this.forceFieldPulseCooldown = 0.9;
      this.applyForceFieldPulse();
    }
  }

  // Applies the active force field pulse to nearby asteroids.
  applyForceFieldPulse() {
    if (this.forceFieldPulseActive <= 0) {
      return;
    }
    const playerX = this.player.positionX;
    const playerY = this.player.positionY;
    const radiusSquared = this.forceFieldRadius * this.forceFieldRadius;
    this.asteroidManager.asteroids = this.asteroidManager.asteroids.filter((asteroid) => {
      const bounds = asteroid.getBounds();
      const centerX = bounds.left + bounds.width * 0.5;
      const centerY = bounds.top + bounds.height * 0.5;
      const dx = centerX - playerX;
      const dy = centerY - playerY;
      const distSquared = dx * dx + dy * dy;
      if (distSquared <= radiusSquared) {
        this.destroyedCount += 1;
        this.addScore(120, 'destroyed');
        this.explosions.push(new Explosion(centerX, centerY));
        return false;
      }
      return true;
    });
  }

  // Advances space dust particle positions.
  updateSpaceDust(deltaSeconds) {
    if (this.spaceDustTimer <= 0 || this.spaceDustParticles.length === 0) {
      return;
    }
    for (const particle of this.spaceDustParticles) {
      particle.x -= particle.speed * deltaSeconds;
      particle.y += particle.drift * deltaSeconds;
      // Keep clouds on the right half; respawn to the right when they leave a small band.
      if (particle.x < this.canvas.width * 0.55) {
        particle.x = this.canvas.width * (0.7 + Math.random() * 0.3);
        particle.y = Math.random() * this.canvas.height;
      }
      if (particle.y < -60 || particle.y > this.canvas.height + 60) {
        particle.y = Math.random() * this.canvas.height;
      }
    }
  }

  buildSpaceDustParticles() {
    const count = 50;
    const particles = [];
    for (let i = 0; i < count; i += 1) {
      const startX = this.canvas.width * (0.65 + Math.random() * 0.35);
      const size = 120 + Math.random() * 160;
      particles.push({
        x: startX,
        y: Math.random() * this.canvas.height,
        size,
        alpha: 0.5 + Math.random() * 0.15,
        speed: 30 + Math.random() * 50,
        drift: (Math.random() - 0.5) * 20,
        spriteIndex: Math.floor(Math.random() * this.spaceDustCloudImages.length)
      });
    }
    return particles;
  }

  // Draws the force field pulse when active.
  drawForceFieldPulse() {
    if (this.forceFieldPulseActive <= 0) {
      return;
    }
    const playerX = this.player.positionX;
    const playerY = this.player.positionY;
    const progress = 1 - this.forceFieldPulseActive / this.forceFieldPulseDuration;
    const ringRadius = this.forceFieldRadius * (0.7 + 0.3 * progress);
    const alpha = 0.15 + 0.25 * (1 - progress);
    this.context.save();
    this.context.strokeStyle = 'rgba(96, 165, 250, 0.9)';
    this.context.lineWidth = 4;
    this.context.globalAlpha = alpha;
    this.context.beginPath();
    this.context.arc(playerX, playerY, ringRadius, 0, Math.PI * 2);
    this.context.stroke();
    this.context.restore();
  }

  // Draws the entire frame.
  draw() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    this.starfield.draw(this.context);
    this.powerUpManager.draw(this.context);
    this.asteroidManager.draw(this.context);
    this.alienManager.draw(this.context);
    this.drawBullets();
    const flashIntensity = Math.max(this.hitFlashSeconds / 0.3, 0);
    const isCloaked = this.cloakTimer > 0;
    const powerupRatios = this.getPowerupRatios();
    this.player.draw(this.context, isCloaked, flashIntensity, powerupRatios);
    this.drawExplosions();

    this.drawHitFlashOverlay();
    this.drawSpaceDustOverlay();
    this.drawForceFieldPulse();
    this.drawCountdownOverlay();
    this.drawCanvasHud();
  }

  // Draws the gradient sky background.
  drawBackground() {
    const gradient = this.context.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0f1735');
    gradient.addColorStop(1, '#0a0f28');
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Renders bullets to the canvas.
  drawBullets() {
    for (const bullet of this.bullets) {
      bullet.draw(this.context);
    }
  }

  // Draws explosion effects.
  drawExplosions() {
    for (const explosion of this.explosions) {
      explosion.draw(this.context);
    }
  }

  // Draws lightweight HUD info directly on the canvas.
  drawCanvasHud() {
    this.context.save();
    const iconSize = 20;
    const padding = 12;
    let offsetX = this.canvas.width - padding;
    const scoreY = padding + iconSize * 0.5;
    const livesY = scoreY + 22;

    if (this.scoreIcon !== undefined && this.scoreIcon.complete === true) {
      this.context.drawImage(this.scoreIcon, offsetX - iconSize, scoreY - iconSize * 0.5, iconSize, iconSize);
      this.context.fillStyle = 'rgba(255,255,255,0.9)';
      this.context.font = '16px Inter, system-ui';
      this.context.textAlign = 'right';
      this.context.fillText(`${Math.floor(this.totalScore).toLocaleString()}`, offsetX - iconSize - 6, scoreY + 5);
    }

    if (this.heartIcon.complete === true) {
      this.context.drawImage(this.heartIcon, offsetX - iconSize, livesY - iconSize * 0.5, iconSize, iconSize);
      this.context.fillStyle = 'rgba(255,255,255,0.9)';
      this.context.font = '16px Inter, system-ui';
      this.context.textAlign = 'right';
      const livesDisplay = this.infiniteLivesEnabled === true ? '∞' : String(this.livesRemaining);
      this.context.fillText(livesDisplay, offsetX - iconSize - 6, livesY + 5);
    }

    if (this.testModeEnabled === true) {
      this.context.fillStyle = '#fbbf24';
      this.context.font = '12px Inter, system-ui';
      this.context.textAlign = 'right';
      this.context.fillText('TEST MODE', this.canvas.width - padding, livesY + 22);
    }
    this.context.restore();
  }

  // Draws a brief white flash overlay after a hit.
  drawHitFlashOverlay() {
    if (this.hitFlashSeconds <= 0) {
      return;
    }

    const alpha = Math.min(this.hitFlashSeconds / 0.3, 0.6);
    this.context.save();
    this.context.globalAlpha = alpha;
    this.context.fillStyle = '#ffffff';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.restore();
  }

  // Draws obscuring overlay for space dust.
  drawSpaceDustOverlay() {
    if (this.spaceDustTimer <= 0 || this.spaceDustIntensity <= 0) {
      return;
    }
    const alpha = Math.min(this.spaceDustIntensity, 0.95);
    this.context.save();

    // Soft gradient from the right edge fading toward center.
    const grad = this.context.createLinearGradient(this.canvas.width, 0, this.canvas.width * 0.4, 0);
    grad.addColorStop(0, `rgba(15, 18, 32, ${alpha * 0.7})`);
    grad.addColorStop(0.3, `rgba(15, 18, 32, ${alpha * 0.45})`);
    grad.addColorStop(1, `rgba(15, 18, 32, 0)`);
    this.context.globalAlpha = 1;
    this.context.fillStyle = grad;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Overlay cloud sprites for extra obstruction (SVGs only).
    const intensityScale = alpha;
    if (this.spaceDustCloudImages !== undefined && this.spaceDustCloudImages.length > 0) {
      for (const particle of this.spaceDustParticles) {
        const img = this.spaceDustCloudImages[particle.spriteIndex % this.spaceDustCloudImages.length];
        if (img.complete === true) {
          const cloudWidth = particle.size;
          const cloudHeight = particle.size * 0.6;
          this.context.globalAlpha = particle.alpha * intensityScale;
          this.context.drawImage(img, particle.x - cloudWidth * 0.5, particle.y - cloudHeight * 0.5, cloudWidth, cloudHeight);
        }
      }

      // Extra dense strip on the far right.
      for (let i = 0; i < 6; i += 1) {
        const img = this.spaceDustCloudImages[i % this.spaceDustCloudImages.length];
        if (img.complete === true) {
          const cloudWidth = this.canvas.width * 0.18;
          const cloudHeight = cloudWidth * 0.6;
          const x = this.canvas.width * (0.88 + 0.02 * i);
          const y = (this.canvas.height * 0.1) + (i % 3) * (this.canvas.height * 0.3);
          this.context.globalAlpha = 0.7;
          this.context.drawImage(img, x, y, cloudWidth, cloudHeight);
        }
      }
    }

    this.context.restore();
  }

  // Draws the countdown overlay when starting a new run.
  drawCountdownOverlay() {
    if (this.isCountdownActive === false) {
      return;
    }
    const displayValue = Math.ceil(this.countdownRemaining);
    this.context.save();
    this.context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = '#e6e9ff';
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.font = '68px Inter, system-ui';
    this.context.fillText(`${displayValue}`, this.canvas.width * 0.5, this.canvas.height * 0.5);
    this.context.font = '20px Inter, system-ui';
    this.context.fillText('Press Space to start now', this.canvas.width * 0.5, this.canvas.height * 0.5 + 50);
    this.context.restore();
  }

  // Checks for collisions between player, asteroids, and power-ups.
  detectCollisions() {
    this.detectPlayerAsteroidCollision();
    this.detectPlayerPowerUpCollision();
    this.detectPlayerAlienCollision();
    this.detectPlayerLaserCollision();
  }

  // Handles collisions between the player and any asteroid.
  detectPlayerAsteroidCollision() {
    if (this.invulnerabilitySeconds > 0) {
      return;
    }

    const playerBounds = this.player.getBounds();
    for (const asteroid of this.asteroidManager.asteroids) {
      const asteroidBounds = asteroid.getBounds();
      const isOverlapping = this.isBoundingOverlap(playerBounds, asteroidBounds);
      if (isOverlapping === true) {
        if (this.cloakTimer > 0) {
          this.handlePhasedAsteroid(asteroid);
        } else {
          this.handleHit();
        }
        return;
      }
    }
  }

  // Handles collisions with alien hulls.
  detectPlayerAlienCollision() {
    if (this.invulnerabilitySeconds > 0) {
      return;
    }
    if (this.cloakTimer > 0) {
      return;
    }
    const playerBounds = this.player.getBounds();
    for (const alien of this.alienManager.aliens) {
      if (this.isBoundingOverlap(playerBounds, alien.getBounds()) === true) {
        this.handleHit();
        return;
      }
    }
  }

  // Handles collisions with lasers.
  detectPlayerLaserCollision() {
    if (this.invulnerabilitySeconds > 0) {
      return;
    }
    if (this.cloakTimer > 0) {
      return;
    }
    const playerBounds = this.player.getBounds();
    for (const laser of this.alienManager.lasers) {
      if (this.isBoundingOverlap(playerBounds, laser.getBounds()) === true) {
        this.handleHit();
        return;
      }
    }
  }

  // Handles a cloaked overlap for scoring and removal.
  handlePhasedAsteroid(asteroid) {
    this.phasedCount += 1;
    this.addScore(60, 'phased');
    const asteroidIndex = this.asteroidManager.asteroids.indexOf(asteroid);
    if (asteroidIndex >= 0) {
      this.asteroidManager.asteroids.splice(asteroidIndex, 1);
    }
    this.explosions.push(new Explosion(asteroid.positionX, asteroid.positionY));
    this.updateHud();
  }

  // Handles collisions between the player and power-ups.
  detectPlayerPowerUpCollision() {
    const playerBounds = this.player.getBounds();
    const remainingPowerUps = [];

    for (const powerUp of this.powerUpManager.powerUps) {
      const powerUpBounds = powerUp.getBounds();
      if (this.isBoundingOverlap(playerBounds, powerUpBounds) === true) {
        this.applyPowerUp(powerUp);
      } else {
        remainingPowerUps.push(powerUp);
      }
    }

    this.powerUpManager.powerUps = remainingPowerUps;
  }

  // Applies a collected power-up to the player.
  applyPowerUp(powerUp) {
    this.powerupCollectedCount += 1;
    if (powerUp.type === 'extraLife') {
      this.livesRemaining = Math.min(this.livesRemaining + 1, 5);
      this.player.setAppearanceByLives(this.livesRemaining);
      this.updateStatus('Life gained!');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'cloak') {
      this.cloakTimer = powerUp.config.durationSeconds;
      this.durationLookup.cloak = powerUp.config.durationSeconds;
      this.updateStatus('Cloak active. Fly through asteroids.');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'blaster') {
      this.blasterTimer = powerUp.config.durationSeconds;
      this.durationLookup.blaster = powerUp.config.durationSeconds;
      this.updateStatus('Blaster online! Press F to fire.');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'multiplier') {
      this.multiplierTimer = powerUp.config.durationSeconds;
      this.durationLookup.multiplier = powerUp.config.durationSeconds;
      this.scoreMultiplier = 2;
      this.updateStatus('Score multiplier engaged!');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'forceField') {
      this.forceFieldTimer = powerUp.config.durationSeconds;
      this.durationLookup.forceField = powerUp.config.durationSeconds;
      this.forceFieldPulseCooldown = 0;
      this.forceFieldPulseActive = 0;
      this.updateStatus('Force field online! Pulses will clear nearby asteroids.');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'spaceDust') {
      this.spaceDustTimer = powerUp.config.durationSeconds;
      this.durationLookup.spaceDust = powerUp.config.durationSeconds;
      this.spaceDustIntensity = 1;
      this.spaceDustParticles = this.buildSpaceDustParticles();
      this.updateStatus('Space dust! Vision obscured temporarily.');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'blackHole') {
      this.blackHoleTimer = powerUp.config.durationSeconds;
      this.durationLookup.blackHole = powerUp.config.durationSeconds;
      this.updateStatus('Black hole! Everything speeds up.');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'solarFlare') {
      this.solarFlareTimer = powerUp.config.durationSeconds;
      this.durationLookup.solarFlare = powerUp.config.durationSeconds;
      this.updateStatus('Solar flare! Hazards grow larger.');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'wave') {
      this.waveTimer = powerUp.config.durationSeconds;
      this.durationLookup.wave = powerUp.config.durationSeconds;
      this.updateStatus('Gravity ripples! Asteroids bob up and down.');
      this.updateHud();
      return;
    }

    this.slowTimer = powerUp.config.durationSeconds;
    this.durationLookup.slow = powerUp.config.durationSeconds;
    this.updateStatus('Temporal drag active. Asteroids slowed.');
    this.updateHud();
  }

  // Handles player damage and game over transitions.
  handleHit() {
    if (this.infiniteLivesEnabled === true) {
      this.updateStatus('Hit! Infinite lives active.');
      return;
    }
    if (this.invulnerabilitySeconds > 0) {
      return;
    }

    this.livesRemaining -= 1;
    this.invulnerabilitySeconds = 1.2;
    this.hitPauseSeconds = 0.35;
    this.hitFlashSeconds = 0.3;
    this.explosions.push(new Explosion(this.player.positionX, this.player.positionY));
    this.player.setAppearanceByLives(this.livesRemaining);
    this.updateHud();

    if (this.livesRemaining <= 0) {
      this.isGameOver = true;
      this.updateStatus('Game over! Press Up or R to restart.');
      this.showSummary();
      return;
    }

    this.updateStatus('Hit! Briefly invulnerable.');
  }

  // Handles collisions with the playfield boundaries.
  handleBoundaryHit() {
    if (this.invulnerabilitySeconds > 0) {
      return;
    }
    this.handleHit();
    if (this.isGameOver === false) {
      this.updateStatus('Boundary impact! Stay centered.');
    }
  }

  // Compares two rectangles for overlap.
  isBoundingOverlap(boundsA, boundsB) {
    const overlapOnX = boundsA.left < boundsB.left + boundsB.width && boundsA.left + boundsA.width > boundsB.left;
    const overlapOnY = boundsA.top < boundsB.top + boundsB.height && boundsA.top + boundsA.height > boundsB.top;

    if (overlapOnX === true && overlapOnY === true) {
      return true;
    }
    return false;
  }

  // Calculates ratios for powerup indicator arcs.
  getPowerupRatios() {
    return {
      cloak: this.durationLookup.cloak > 0 ? this.cloakTimer / this.durationLookup.cloak : 0,
      blaster: this.durationLookup.blaster > 0 ? this.blasterTimer / this.durationLookup.blaster : 0,
      slow: this.durationLookup.slow > 0 ? this.slowTimer / this.durationLookup.slow : 0,
      forceField: this.durationLookup.forceField > 0 ? this.forceFieldTimer / this.durationLookup.forceField : 0,
      spaceDust: this.durationLookup.spaceDust > 0 ? this.spaceDustTimer / this.durationLookup.spaceDust : 0,
      multiplier: this.durationLookup.multiplier > 0 ? this.multiplierTimer / this.durationLookup.multiplier : 0,
      blackHole: this.durationLookup.blackHole > 0 ? this.blackHoleTimer / this.durationLookup.blackHole : 0,
      solarFlare: this.durationLookup.solarFlare > 0 ? this.solarFlareTimer / this.durationLookup.solarFlare : 0,
      wave: this.durationLookup.wave > 0 ? this.waveTimer / this.durationLookup.wave : 0
    };
  }

  // Renders the death summary overlay.
  showSummary() {
    if (this.summaryOverlay === undefined || this.summaryFields === undefined) {
      return;
    }
    this.summaryFields.score.textContent = Math.floor(this.totalScore).toLocaleString();
    if (this.summaryFields.timeScore !== undefined) {
      this.summaryFields.timeScore.textContent = Math.floor(this.scoreBreakdown.time).toLocaleString();
    }
    if (this.summaryFields.destroyedScore !== undefined) {
      const destroyedScore = Math.floor(this.scoreBreakdown.destroyed).toLocaleString();
      this.summaryFields.destroyedScore.textContent = `${destroyedScore} · ${this.destroyedCount} destroyed`;
    }
    if (this.summaryFields.phasedScore !== undefined) {
      const phasedScore = Math.floor(this.scoreBreakdown.phased).toLocaleString();
      this.summaryFields.phasedScore.textContent = `${phasedScore} · ${this.phasedCount} phased`;
    }
    if (this.summaryFields.miscScore !== undefined) {
      this.summaryFields.miscScore.textContent = Math.floor(this.scoreBreakdown.misc).toLocaleString();
    }
    if (this.summaryFields.negativeScore !== undefined) {
      this.summaryFields.negativeScore.textContent = Math.floor(this.scoreBreakdown.negative ?? 0).toLocaleString();
    }
    if (this.summaryFields.time !== undefined && this.summaryFields.time !== null) {
      this.summaryFields.time.textContent = `${Math.floor(this.timeElapsedSeconds)}s`;
    }
    if (this.summaryFields.powerups !== undefined && this.summaryFields.powerups !== null) {
      this.summaryFields.powerups.textContent = `${this.powerupCollectedCount}`;
    }
    if (this.summaryFields.cloak !== undefined && this.summaryFields.cloak !== null) {
      this.summaryFields.cloak.textContent = `${this.powerupUptime.cloak.toFixed(1)}s`;
    }
    if (this.summaryFields.blaster !== undefined && this.summaryFields.blaster !== null) {
      this.summaryFields.blaster.textContent = `${this.powerupUptime.blaster.toFixed(1)}s`;
    }
    if (this.summaryFields.slow !== undefined && this.summaryFields.slow !== null) {
      this.summaryFields.slow.textContent = `${this.powerupUptime.slow.toFixed(1)}s`;
    }
    if (this.summaryFields.nameInput !== undefined && this.summaryFields.nameInput !== null) {
      this.summaryFields.nameInput.value = this.lastUsedName ?? '';
    }
    const savingBlocked = this.testModeUsedDuringRun === true;
    if (this.summaryFields.saveButton !== undefined && this.summaryFields.saveButton !== null) {
      this.summaryFields.saveButton.disabled = this.hasSavedThisRun || savingBlocked;
      this.summaryFields.saveButton.textContent = savingBlocked === true ? 'Unavailable in test mode' : (this.hasSavedThisRun ? 'Saved' : 'Save');
    }
    if (this.summaryFields.saveInline !== undefined && this.summaryFields.saveInline !== null) {
      this.summaryFields.saveInline.style.display = savingBlocked === true ? 'none' : '';
    }
    if (this.summaryFields.testModeNotice !== undefined && this.summaryFields.testModeNotice !== null) {
      this.summaryFields.testModeNotice.style.display = savingBlocked === true ? '' : 'none';
    }
    this.renderHighScores();
    this.summaryOverlay.classList.add('visible');
  }

  // Hides the summary overlay.
  hideSummary() {
    if (this.summaryOverlay === undefined) {
      return;
    }
    this.summaryOverlay.classList.remove('visible');
  }

  // Toggles pause state.
  togglePause(showOverlay = true) {
    if (this.isGameOver === true) {
      return;
    }
    this.isPaused = !this.isPaused;
    if (this.isPaused === true) {
      this.updateStatus('Paused (Space to resume)');
      if (typeof this.onPauseChange === 'function') {
        this.onPauseChange(true, showOverlay);
      }
    } else {
      this.updateStatus('');
      this.lastFrameTimestamp = performance.now();
      if (typeof this.onPauseChange === 'function') {
        this.onPauseChange(false, showOverlay);
      }
    }
  }

  // Pauses without toggling (used when opening overlays).
  pauseGame(showOverlay = true) {
    if (this.isGameOver === true || this.isPaused === true) {
      return;
    }
    this.isPaused = true;
    this.updateStatus('Paused (Space to resume)');
    if (typeof this.onPauseChange === 'function') {
      this.onPauseChange(true, showOverlay);
    }
  }

  // Resumes from a paused state without toggling.
  resumeGame() {
    if (this.isGameOver === true || this.isPaused === false) {
      return;
    }
    this.isPaused = false;
    this.updateStatus('');
    this.lastFrameTimestamp = performance.now();
    if (typeof this.onPauseChange === 'function') {
      this.onPauseChange(false, false);
    }
  }

  // Sets additional vertical padding to keep canvas on-screen.
  setUiPadding(pixels) {
    this.uiPadding = Math.max(0, pixels);
    this.handleResize();
  }

  // Adds score with multiplier and tracks categories.
  addScore(points, category) {
    const finalPoints = points * this.scoreMultiplier;
    this.totalScore += finalPoints;
    if (this.scoreBreakdown[category] === undefined) {
      this.scoreBreakdown.misc += finalPoints;
      return;
    }
    this.scoreBreakdown[category] += finalPoints;
  }

  // Teleports player back to anchor and clears overlapping hazards.
  snapPlayerToAnchor() {
    this.player.positionX = this.player.anchorX;
    this.player.velocityX = 0;
    this.player.velocityY = 0;
    const playerBounds = this.player.getBounds();
    this.asteroidManager.asteroids = this.asteroidManager.asteroids.filter((a) => this.isBoundingOverlap(playerBounds, a.getBounds()) === false);
    this.alienManager.aliens = this.alienManager.aliens.filter((al) => this.isBoundingOverlap(playerBounds, al.getBounds()) === false);
    this.alienManager.lasers = this.alienManager.lasers.filter((lz) => this.isBoundingOverlap(playerBounds, lz.getBounds()) === false);
  }

  // High score persistence.
  loadHighScores() {
    try {
      const stored = localStorage.getItem('orbitalHighScores');
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (error) {
      // ignore
    }
    return [];
  }

  loadLastName() {
    try {
      return localStorage.getItem('orbitalLastName') ?? '';
    } catch (error) {
      return '';
    }
  }

  saveHighScoresToStorage() {
    try {
      localStorage.setItem('orbitalHighScores', JSON.stringify(this.highScores));
    } catch (error) {
      // ignore
    }
  }

  saveLastName(name) {
    try {
      localStorage.setItem('orbitalLastName', name);
    } catch (error) {
      // ignore
    }
  }

  saveHighScore() {
    if (this.summaryFields.nameInput === undefined || this.summaryFields.highScoresList === undefined) {
      return;
    }
    if (this.testModeUsedDuringRun === true) {
      return;
    }
    if (this.hasSavedThisRun === true) {
      return;
    }
    const name = (this.summaryFields.nameInput.value || '').trim().slice(0, 18);
    if (name.length === 0) {
      return;
    }
    const entry = {
      name,
      score: Math.floor(this.totalScore),
      when: new Date().toLocaleString()
    };
    this.highScores.push(entry);
    this.highScores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    this.highScores = this.highScores.slice(0, 10);
    this.saveHighScoresToStorage();
    this.saveLastName(name);
    this.lastUsedName = name;
    this.hasSavedThisRun = true;
    if (this.summaryFields.saveButton !== undefined && this.summaryFields.saveButton !== null) {
      this.summaryFields.saveButton.disabled = true;
      this.summaryFields.saveButton.textContent = 'Saved';
    }
    this.renderHighScores();
  }

  renderHighScores() {
    const lists = [];
    if (this.summaryFields.highScoresList !== undefined && this.summaryFields.highScoresList !== null) {
      lists.push(this.summaryFields.highScoresList);
    }
    if (this.summaryFields.inlineHighScoresList !== undefined && this.summaryFields.inlineHighScoresList !== null) {
      lists.push(this.summaryFields.inlineHighScoresList);
    }
    if (lists.length === 0) {
      return;
    }
    lists.forEach((list) => {
      list.innerHTML = '';
      this.highScores.forEach((entry) => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = entry.name;
        const scoreSpan = document.createElement('span');
        scoreSpan.textContent = `${entry.score.toLocaleString()} · ${entry.when}`;
        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        list.appendChild(li);
      });
    });
  }

  // Main animation loop driven by requestAnimationFrame.
  gameLoop(timestamp) {
    if (this.isRunning === false) {
      return;
    }

    if (this.lastFrameTimestamp === 0) {
      this.lastFrameTimestamp = timestamp;
    }

    if (this.resetFrameTimestampNextFrame === true) {
      this.lastFrameTimestamp = timestamp;
      this.resetFrameTimestampNextFrame = false;
    }

    const deltaMilliseconds = timestamp - this.lastFrameTimestamp;
    this.lastFrameTimestamp = timestamp;
    let deltaSeconds = deltaMilliseconds / 1000;
    if (deltaSeconds > 0.05) {
      deltaSeconds = 0.05;
    }

    if (this.isPaused === true) {
      this.draw();
      this.animationFrameId = window.requestAnimationFrame(this.gameLoop);
      return;
    }

    this.update(deltaSeconds);
    this.draw();
    this.animationFrameId = window.requestAnimationFrame(this.gameLoop);
  }
}

