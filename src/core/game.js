import { Player } from '../entities/player.js';
import { AsteroidManager } from '../managers/asteroidManager.js';
import { PowerUpManager } from '../managers/powerUpManager.js';
import { AlienManager } from '../managers/alienManager.js';
import { Starfield } from '../effects/starfield.js';
import { Explosion } from '../effects/explosion.js';
import { Bullet } from '../entities/bullet.js';
import { Missile } from '../entities/missile.js';
import { HazardShootingStar } from '../entities/hazardShootingStar.js';
import { Asteroid } from '../entities/asteroid.js';
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
    const playerSpriteSource = assets.spacemanSprites ?? assets.spacemanImage;
    this.player = new Player(this.canvas.width, this.canvas.height, playerSpriteSource);
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
    this.missiles = [];
    this.hazardShootingStars = [];
    this.hazardShootingStarSpawnTimer = 0;
    this.hazardShootingStarNextSpawnDelay = this.getNextHazardShootingStarSpawnDelay();
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
    this.waveSettings = { amplitude: 78, speed: 2.6 };
    this.durationLookup = { cloak: 0, blaster: 0, slow: 0, forceField: 0, orbitalLaser: 0, seekerMissiles: 0, missileBarrage: 0, asteroidSplitter: 0, spaceDust: 0, multiplier: 0, blackHole: 0, solarFlare: 0, wave: 0 };
    this.powerupUptime = { cloak: 0, blaster: 0, slow: 0, forceField: 0, orbitalLaser: 0, seekerMissiles: 0, missileBarrage: 0, asteroidSplitter: 0, spaceDust: 0, multiplier: 0, blackHole: 0, solarFlare: 0, wave: 0 };
    this.forceFieldTimer = 0;
    this.forceFieldPulseCooldown = 0;
    this.forceFieldPulseActive = 0;
    this.forceFieldPulseDuration = 0.25;
    this.forceFieldRadius = 230;
    this.orbitalLaserTimer = 0;
    this.orbitalLaserStartAngleRadians = 0;
    this.seekerMissilesTimer = 0;
    this.seekerMissilesShotsRemaining = 0;
    this.seekerMissilesFireCooldownSeconds = 0;
    this.seekerMissilesFireIntervalSeconds = 0;
    this.missileBarrageTimer = 0;
    this.asteroidSplitterTimer = 0;
    this.spaceDustTimer = 0;
    this.spaceDustIntensity = 0;
    this.spaceDustParticles = [];
    this.testModeEnabled = false;
    this.testModeUsedDuringRun = false;
    this.infiniteLivesEnabled = false;
    this.testModePowerUp = null;
    this.testAsteroidSpeedMultiplier = 1;
    this.testAsteroidSizeMultiplier = 1;
    this.testAsteroidSpawnRateMultiplier = 1;
    this.testPowerUpSpawnRateMultiplier = 1;
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
    this.cameraShakeSecondsRemaining = 0;
    this.cameraShakeDurationSeconds = 0;
    this.cameraShakeIntensity = 0;
    this.cameraOffsetX = 0;
    this.cameraOffsetY = 0;
    this.enablePowerupScreenFx = false;
    this.enableFilmGrain = false;
    this.filmGrainCanvas = this.enableFilmGrain === true ? this.buildFilmGrainCanvas() : null;
    this.filmGrainPattern = this.filmGrainCanvas !== null ? this.context.createPattern(this.filmGrainCanvas, 'repeat') : null;
    this.filmGrainRefreshSeconds = 0;
    this.filmGrainOffsetX = 0;
    this.filmGrainOffsetY = 0;

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
    const {
      enabled,
      allowedPowerups,
      infiniteLives,
      asteroidSpeedMultiplier,
      asteroidSizeMultiplier,
      asteroidSpawnRateMultiplier,
      powerUpSpawnRateMultiplier
    } = config;
    const isEnabled = Boolean(enabled);
    setTestModeConfig(isEnabled, isEnabled === true ? (allowedPowerups ?? null) : null);
    this.testModePowerUp = isEnabled === true && Array.isArray(allowedPowerups) && allowedPowerups.length === 1 ? allowedPowerups[0] : null;
    this.testModeEnabled = isEnabled;
    this.infiniteLivesEnabled = isEnabled === true ? Boolean(infiniteLives) : false;

    if (isEnabled === true) {
      this.testAsteroidSpeedMultiplier = typeof asteroidSpeedMultiplier === 'number' && Number.isFinite(asteroidSpeedMultiplier) ? asteroidSpeedMultiplier : 1;
      this.testAsteroidSizeMultiplier = typeof asteroidSizeMultiplier === 'number' && Number.isFinite(asteroidSizeMultiplier) ? asteroidSizeMultiplier : 1;
      this.testAsteroidSpawnRateMultiplier = typeof asteroidSpawnRateMultiplier === 'number' && Number.isFinite(asteroidSpawnRateMultiplier) ? asteroidSpawnRateMultiplier : 1;
      this.testPowerUpSpawnRateMultiplier = typeof powerUpSpawnRateMultiplier === 'number' && Number.isFinite(powerUpSpawnRateMultiplier) ? powerUpSpawnRateMultiplier : 1;
      this.testAsteroidSpeedMultiplier = Math.max(0.1, Math.min(6, this.testAsteroidSpeedMultiplier));
      this.testAsteroidSizeMultiplier = Math.max(0.2, Math.min(6, this.testAsteroidSizeMultiplier));
      this.testAsteroidSpawnRateMultiplier = Math.max(0.1, Math.min(10, this.testAsteroidSpawnRateMultiplier));
      this.testPowerUpSpawnRateMultiplier = Math.max(0.1, Math.min(10, this.testPowerUpSpawnRateMultiplier));
    } else {
      this.testAsteroidSpeedMultiplier = 1;
      this.testAsteroidSizeMultiplier = 1;
      this.testAsteroidSpawnRateMultiplier = 1;
      this.testPowerUpSpawnRateMultiplier = 1;
    }

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
    this.orbitalLaserTimer = 0;
    this.seekerMissilesTimer = 0;
    this.seekerMissilesShotsRemaining = 0;
    this.seekerMissilesFireCooldownSeconds = 0;
    this.seekerMissilesFireIntervalSeconds = 0;
    this.missileBarrageTimer = 0;
    this.asteroidSplitterTimer = 0;
    this.spaceDustTimer = 0;
    this.spaceDustIntensity = 0;
    this.spaceDustParticles = [];
    this.orbitalLaserStartAngleRadians = 0;
    this.durationLookup = { cloak: 0, blaster: 0, slow: 0, forceField: 0, orbitalLaser: 0, seekerMissiles: 0, missileBarrage: 0, asteroidSplitter: 0, spaceDust: 0, multiplier: 0, blackHole: 0, solarFlare: 0, wave: 0 };
    this.powerupUptime = { cloak: 0, blaster: 0, slow: 0, forceField: 0, orbitalLaser: 0, seekerMissiles: 0, missileBarrage: 0, asteroidSplitter: 0, spaceDust: 0, multiplier: 0, blackHole: 0, solarFlare: 0, wave: 0 };
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
    this.missiles = [];
    this.hazardShootingStars = [];
    this.hazardShootingStarSpawnTimer = 0;
    this.hazardShootingStarNextSpawnDelay = this.getNextHazardShootingStarSpawnDelay();
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

    const testSpeedMultiplier = this.testModeEnabled === true ? this.testAsteroidSpeedMultiplier : 1;
    const testSizeMultiplier = this.testModeEnabled === true ? this.testAsteroidSizeMultiplier : 1;
    const testSpawnRateMultiplier = this.testModeEnabled === true ? this.testAsteroidSpawnRateMultiplier : 1;
    const testPowerUpSpawnRateMultiplier = this.testModeEnabled === true ? this.testPowerUpSpawnRateMultiplier : 1;

    const asteroidSpeedScale = ((this.slowTimer > 0 ? 0.55 : 1) * (this.blackHoleTimer > 0 ? 1.35 : 1)) * testSpeedMultiplier;
    const hazardSizeScale = (this.solarFlareTimer > 0 ? 1.5 : 1) * testSizeMultiplier;
    const waveSettings = this.waveTimer > 0 ? this.waveSettings : undefined;

    const touchedBoundary = this.player.update(deltaSeconds, this.movementInput);
    if (touchedBoundary === true) {
      this.handleBoundaryHit();
    }
    this.asteroidManager.update(deltaSeconds, asteroidSpeedScale, hazardSizeScale, waveSettings, testSpawnRateMultiplier);
    this.applyAsteroidSplitter(deltaSeconds);
    this.powerUpManager.update(deltaSeconds, testPowerUpSpawnRateMultiplier);
    this.alienManager.update(deltaSeconds, asteroidSpeedScale, this.player);
    this.applyOrbitalLaser(deltaSeconds);
    this.updateSeekerMissiles(deltaSeconds);
    this.updateBullets(deltaSeconds);
    this.updateMissiles(deltaSeconds);
    this.updateHazardShootingStars(deltaSeconds);
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
    const prevOrbitalLaser = this.orbitalLaserTimer;
    const prevSeekerMissiles = this.seekerMissilesTimer;
    const prevMissileBarrage = this.missileBarrageTimer;
    const prevAsteroidSplitter = this.asteroidSplitterTimer;
    const prevSpaceDust = this.spaceDustTimer;
    this.timeElapsedSeconds += deltaSeconds;
    const negativeActive = this.blackHoleTimer > 0
      || this.solarFlareTimer > 0
      || this.waveTimer > 0
      || this.asteroidSplitterTimer > 0
      || this.spaceDustTimer > 0;
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
    if (this.orbitalLaserTimer > 0) {
      this.powerupUptime.orbitalLaser += deltaSeconds;
    }
    if (this.seekerMissilesTimer > 0) {
      this.powerupUptime.seekerMissiles += deltaSeconds;
    }
    if (this.missileBarrageTimer > 0) {
      this.powerupUptime.missileBarrage += deltaSeconds;
    }
    if (this.asteroidSplitterTimer > 0) {
      this.powerupUptime.asteroidSplitter += deltaSeconds;
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

    if (this.orbitalLaserTimer > 0) {
      this.orbitalLaserTimer -= deltaSeconds;
      if (this.orbitalLaserTimer < 0) {
        this.orbitalLaserTimer = 0;
      }
    }

    if (this.seekerMissilesTimer > 0) {
      this.seekerMissilesTimer -= deltaSeconds;
      if (this.seekerMissilesTimer < 0) {
        this.seekerMissilesTimer = 0;
      }
    }

    if (this.missileBarrageTimer > 0) {
      this.missileBarrageTimer -= deltaSeconds;
      if (this.missileBarrageTimer < 0) {
        this.missileBarrageTimer = 0;
      }
    }

    if (this.asteroidSplitterTimer > 0) {
      this.asteroidSplitterTimer -= deltaSeconds;
      if (this.asteroidSplitterTimer < 0) {
        this.asteroidSplitterTimer = 0;
      }
    }

    if (this.spaceDustTimer > 0) {
      this.spaceDustTimer -= deltaSeconds;
      if (this.spaceDustTimer < 0) {
        this.spaceDustTimer = 0;
      }
    }

    // Keep space dust highly obscuring while active, and fade out smoothly after the timer ends.
    const hasSpaceDustActive = this.spaceDustTimer > 0;
    let spaceDustTargetIntensity = 0;
    if (hasSpaceDustActive === true) {
      spaceDustTargetIntensity = 1;
    }
    const intensitySmoothing = Math.min(1, deltaSeconds * 4);
    this.spaceDustIntensity = this.spaceDustIntensity + (spaceDustTargetIntensity - this.spaceDustIntensity) * intensitySmoothing;
    if (hasSpaceDustActive === false && this.spaceDustIntensity < 0.02) {
      this.spaceDustIntensity = 0;
      this.spaceDustParticles = [];
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
    if (prevSpaceDust > 0 && this.spaceDustTimer <= 0) {
      this.addScore(200, 'negative');
    }
    if (prevMultiplier > 0 && this.multiplierTimer <= 0) {
      // no bonus for multiplier ending
    }
    if (prevOrbitalLaser > 0 && this.orbitalLaserTimer <= 0 && this.isGameOver === false) {
      this.updateStatus('Orbital laser offline.');
    }
    if (prevSeekerMissiles > 0 && this.seekerMissilesTimer <= 0 && this.isGameOver === false) {
      this.seekerMissilesShotsRemaining = 0;
      this.updateStatus('Seeker missiles offline.');
    }
    if (prevMissileBarrage > 0 && this.missileBarrageTimer <= 0 && this.isGameOver === false) {
      this.launchMissileBarrage();
    }
    if (prevAsteroidSplitter > 0 && this.asteroidSplitterTimer <= 0 && this.isGameOver === false) {
      this.addScore(200, 'negative');
      this.updateStatus('Asteroid splitter offline.');
    }

    if (this.fireCooldownSeconds > 0) {
      this.fireCooldownSeconds -= deltaSeconds;
      if (this.fireCooldownSeconds < 0) {
        this.fireCooldownSeconds = 0;
      }
    }

    this.updateCameraShake(deltaSeconds);
    this.updateFilmGrain(deltaSeconds);
    this.updateHud();
  }

  // Starts a subtle camera shake (hit feedback).
  startCameraShake(intensity = 7, durationSeconds = 0.18) {
    const safeIntensity = Math.max(0, intensity);
    const safeDuration = Math.max(0, durationSeconds);
    if (safeIntensity <= 0 || safeDuration <= 0) {
      return;
    }
    this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, safeIntensity);
    this.cameraShakeDurationSeconds = Math.max(this.cameraShakeDurationSeconds, safeDuration);
    this.cameraShakeSecondsRemaining = Math.max(this.cameraShakeSecondsRemaining, safeDuration);
  }

  // Updates camera shake offsets with easing.
  updateCameraShake(deltaSeconds) {
    if (this.cameraShakeSecondsRemaining <= 0) {
      this.cameraShakeSecondsRemaining = 0;
      this.cameraShakeDurationSeconds = 0;
      this.cameraShakeIntensity = 0;
      this.cameraOffsetX = 0;
      this.cameraOffsetY = 0;
      return;
    }
    this.cameraShakeSecondsRemaining -= deltaSeconds;
    if (this.cameraShakeSecondsRemaining < 0) {
      this.cameraShakeSecondsRemaining = 0;
    }
    const duration = this.cameraShakeDurationSeconds > 0 ? this.cameraShakeDurationSeconds : 0.0001;
    const remainingRatio = Math.max(0, Math.min(1, this.cameraShakeSecondsRemaining / duration));
    const strength = this.cameraShakeIntensity * remainingRatio * remainingRatio;
    this.cameraOffsetX = (Math.random() * 2 - 1) * strength;
    this.cameraOffsetY = (Math.random() * 2 - 1) * strength;
  }

  // Creates a tiny noise canvas used for film grain.
  buildFilmGrainCanvas() {
    if (typeof document === 'undefined') {
      return null;
    }
    try {
      const grainCanvas = document.createElement('canvas');
      const size = 96;
      grainCanvas.width = size;
      grainCanvas.height = size;
      const grainContext = grainCanvas.getContext('2d', { willReadFrequently: true });
      if (grainContext === null) {
        return null;
      }
      this.filmGrainContext = grainContext;
      this.filmGrainSize = size;
      this.regenerateFilmGrain(grainContext, size);
      return grainCanvas;
    } catch (error) {
      return null;
    }
  }

  // Regenerates the film grain noise pixels.
  regenerateFilmGrain(grainContext, size) {
    const context = grainContext ?? this.filmGrainContext;
    if (context === undefined || context === null) {
      return;
    }
    const canvasSize = typeof size === 'number'
      ? size
      : (typeof this.filmGrainSize === 'number' ? this.filmGrainSize : 96);

    const imageData = context.createImageData(canvasSize, canvasSize);
    const data = imageData.data;
    for (let index = 0; index < data.length; index += 4) {
      const value = Math.floor(Math.random() * 256);
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 50 + Math.floor(Math.random() * 90);
    }
    context.putImageData(imageData, 0, 0);
  }

  // Updates the grain pattern occasionally and jitters its offsets.
  updateFilmGrain(deltaSeconds) {
    if (this.enableFilmGrain !== true) {
      return;
    }
    if (this.spaceDustIntensity > 0) {
      return;
    }
    if (this.filmGrainCanvas === null || this.filmGrainContext === undefined) {
      return;
    }
    this.filmGrainRefreshSeconds -= deltaSeconds;
    if (this.filmGrainRefreshSeconds <= 0) {
      this.filmGrainRefreshSeconds = 0.18 + Math.random() * 0.12;
      this.regenerateFilmGrain(this.filmGrainContext, this.filmGrainSize);
      this.filmGrainPattern = this.context.createPattern(this.filmGrainCanvas, 'repeat');
    }
    const jitterSpeed = 28;
    this.filmGrainOffsetX = (this.filmGrainOffsetX + jitterSpeed * deltaSeconds) % this.filmGrainCanvas.width;
    this.filmGrainOffsetY = (this.filmGrainOffsetY + jitterSpeed * 0.8 * deltaSeconds) % this.filmGrainCanvas.height;
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
            if (this.alienManager.lasers.length > 0) {
              this.alienManager.lasers = this.alienManager.lasers.filter((laser) => laser.owner !== alien);
            }
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

  // Updates active homing missiles and resolves detonations.
  updateMissiles(deltaSeconds) {
    if (this.missiles.length === 0) {
      return;
    }

    for (const missile of this.missiles) {
      missile.update(deltaSeconds);
    }

    const remainingMissiles = [];
    for (const missile of this.missiles) {
      if (missile.isFinished() === true) {
        this.resolveMissileDetonation(missile);
      } else {
        remainingMissiles.push(missile);
      }
    }
    this.missiles = remainingMissiles;
  }

  // Resolves a missile detonation, attempting to destroy its target asteroid.
  resolveMissileDetonation(missile) {
    const target = missile.target;
    if (target !== null && target !== undefined) {
      const asteroidIndex = this.asteroidManager.asteroids.indexOf(target);
      if (asteroidIndex >= 0) {
        this.asteroidManager.asteroids.splice(asteroidIndex, 1);
        this.destroyedCount += 1;
        this.addScore(120, 'destroyed');
        this.explosions.push(new Explosion(target.positionX, target.positionY));
        return;
      }

      const alienIndex = this.alienManager.aliens.indexOf(target);
      if (alienIndex >= 0) {
        this.alienManager.aliens.splice(alienIndex, 1);
        this.destroyedCount += 1;
        this.addScore(160, 'destroyed');
        this.explosions.push(new Explosion(target.positionX, target.positionY));
        if (this.alienManager.lasers.length > 0) {
          this.alienManager.lasers = this.alienManager.lasers.filter((laser) => laser.owner !== target);
        }
        return;
      }
    }
    // Fallback: detonate where the missile is, even if the target is already gone.
    this.explosions.push(new Explosion(missile.positionX, missile.positionY));
  }

  // Launches homing missiles toward each currently active asteroid.
  launchMissileBarrage() {
    const targets = [...this.asteroidManager.asteroids, ...this.alienManager.aliens];
    if (targets.length === 0) {
      this.updateStatus('Missile barrage ready, but no targets.');
      return;
    }

    this.startCameraShake(4, 0.18);
    const startX = this.player.positionX + this.player.width * 0.35;
    for (const asteroid of targets) {
      const startY = this.player.positionY + (Math.random() - 0.5) * this.player.height * 0.6;
      this.missiles.push(new Missile(startX, startY, asteroid));
    }
    this.updateStatus('Missile barrage launched!');
    this.updateHud();
  }

  // Randomized next spawn delay for the rare foreground shooting star hazard.
  getNextHazardShootingStarSpawnDelay() {
    return 18 + Math.random() * 28;
  }

  // Spawns a rare, intense foreground shooting star hazard.
  spawnHazardShootingStar() {
    const startX = this.canvas.width + 80;
    const speed = 1200 + Math.random() * 700;

    const preferPlayer = Math.random() < 0.55;
    let startY;
    if (preferPlayer === true) {
      startY = this.player.positionY + (Math.random() * 2 - 1) * 180;
    } else {
      startY = 60 + Math.random() * Math.max(1, this.canvas.height - 120);
    }
    startY = Math.max(60, Math.min(this.canvas.height - 60, startY));

    // Aim at the player's current position (one-time aim; does not track after launch).
    const aimX = this.player.positionX;
    const aimY = this.player.positionY;
    const deltaX = aimX - startX;
    const deltaY = aimY - startY;
    const distance = Math.hypot(deltaX, deltaY);
    const directionX = distance > 0 ? deltaX / distance : -1;
    const directionY = distance > 0 ? deltaY / distance : 0;
    const velocityX = directionX * speed;
    const velocityY = directionY * speed;

    const roll = Math.random();
    // Fiery meteor palette (warm by default).
    let color = { red: 255, green: 236, blue: 184 }; // white-hot core
    let glowColor = { red: 255, green: 179, blue: 71 }; // orange glow
    if (roll < 0.22) {
      color = { red: 252, green: 211, blue: 77 }; // gold
      glowColor = { red: 255, green: 107, blue: 107 }; // red-orange
    } else if (roll < 0.38) {
      color = { red: 255, green: 179, blue: 71 }; // orange
      glowColor = { red: 255, green: 59, blue: 59 }; // hot red
    } else if (roll < 0.5) {
      color = { red: 255, green: 107, blue: 107 }; // red
      glowColor = { red: 255, green: 179, blue: 71 }; // orange rim
    }

    const trailLength = 520 + Math.random() * 380;
    const thickness = 4 + Math.random() * 3.5;
    const shootingStar = new HazardShootingStar(startX, startY, velocityX, velocityY, {
      trailLength,
      thickness,
      lifeSeconds: 1.6 + Math.random() * 1.2,
      color,
      glowColor
    });
    this.hazardShootingStars.push(shootingStar);
  }

  // Updates foreground shooting star hazards.
  updateHazardShootingStars(deltaSeconds) {
    this.hazardShootingStarSpawnTimer += deltaSeconds;
    if (this.hazardShootingStarSpawnTimer >= this.hazardShootingStarNextSpawnDelay && this.hazardShootingStars.length < 1) {
      this.spawnHazardShootingStar();
      this.hazardShootingStarSpawnTimer = 0;
      this.hazardShootingStarNextSpawnDelay = this.getNextHazardShootingStarSpawnDelay();
    }

    if (this.hazardShootingStars.length === 0) {
      return;
    }

    for (const shootingStar of this.hazardShootingStars) {
      shootingStar.update(deltaSeconds);
    }

    this.hazardShootingStars = this.hazardShootingStars.filter((shootingStar) => {
      if (shootingStar.isExpired() === true) {
        return false;
      }
      if (shootingStar.isOffScreen(this.canvas.width, this.canvas.height) === true) {
        return false;
      }
      return true;
    });
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

  // Computes the current orbital laser beam segment (start/end points + angle).
  getOrbitalLaserBeamSegment() {
    if (this.orbitalLaserTimer <= 0) {
      return null;
    }
    const durationSeconds = this.durationLookup.orbitalLaser;
    if (durationSeconds <= 0) {
      return null;
    }

    const elapsedSeconds = Math.max(0, durationSeconds - this.orbitalLaserTimer);
    const progress = Math.max(0, Math.min(1, elapsedSeconds / durationSeconds));
    const pulseCount = 3;
    const pulseWindowSeconds = durationSeconds / pulseCount;
    const pulseIndex = Math.min(pulseCount - 1, Math.floor(elapsedSeconds / pulseWindowSeconds));
    const timeIntoWindowSeconds = elapsedSeconds - pulseIndex * pulseWindowSeconds;

    // The orbital laser only fires during a short "pulse" window, then pauses.
    const minActiveSeconds = Math.min(0.6, pulseWindowSeconds);
    const maxActiveSeconds = Math.max(minActiveSeconds, pulseWindowSeconds * 0.42);
    const desiredActiveSeconds = pulseWindowSeconds * 0.32;
    const activeSeconds = Math.max(minActiveSeconds, Math.min(maxActiveSeconds, desiredActiveSeconds));
    if (timeIntoWindowSeconds > activeSeconds) {
      return null;
    }

    const pulseProgress = Math.max(0, Math.min(1, timeIntoWindowSeconds / activeSeconds));
    const angleRadians = this.orbitalLaserStartAngleRadians + pulseIndex * Math.PI * 2 + pulseProgress * Math.PI * 2;
    const directionX = Math.cos(angleRadians);
    const directionY = Math.sin(angleRadians);

    const playerX = this.player.positionX;
    const playerY = this.player.positionY;
    const baseRadius = Math.max(this.player.width, this.player.height) * 0.58;
    const beamLength = Math.max(this.canvas.width, this.canvas.height) * 1.6;

    const startX = playerX + directionX * baseRadius;
    const startY = playerY + directionY * baseRadius;
    const endX = playerX + directionX * beamLength;
    const endY = playerY + directionY * beamLength;

    return { startX, startY, endX, endY, angleRadians, progress, pulseIndex, pulseProgress };
  }

  // Applies the orbital laser beam to hazards while it is active.
  applyOrbitalLaser(deltaSeconds) {
    if (this.orbitalLaserTimer <= 0) {
      return;
    }
    if (this.asteroidManager.asteroids.length === 0 && this.alienManager.aliens.length === 0) {
      return;
    }

    const beamSegment = this.getOrbitalLaserBeamSegment();
    if (beamSegment === null) {
      return;
    }

    const beamThickness = Math.max(10, Math.min(18, Math.max(this.player.width, this.player.height) * 0.12));
    const maxAsteroidDestroysPerFrame = 8;
    const maxAlienDestroysPerFrame = 3;
    let destroyedAsteroidsThisFrame = 0;
    let destroyedAliensThisFrame = 0;

    const remainingAsteroids = [];
    for (const asteroid of this.asteroidManager.asteroids) {
      if (destroyedAsteroidsThisFrame >= maxAsteroidDestroysPerFrame) {
        remainingAsteroids.push(asteroid);
        continue;
      }

      const bounds = asteroid.getBounds();
      const centerX = bounds.left + bounds.width * 0.5;
      const centerY = bounds.top + bounds.height * 0.5;
      const radius = Math.max(bounds.width, bounds.height) * 0.5;
      const distance = this.getDistancePointToSegment(
        centerX,
        centerY,
        beamSegment.startX,
        beamSegment.startY,
        beamSegment.endX,
        beamSegment.endY
      );
      if (distance <= radius + beamThickness) {
        destroyedAsteroidsThisFrame += 1;
        this.destroyedCount += 1;
        this.addScore(120, 'destroyed');
        this.explosions.push(new Explosion(asteroid.positionX, asteroid.positionY));
        continue;
      }
      remainingAsteroids.push(asteroid);
    }
    this.asteroidManager.asteroids = remainingAsteroids;

    if (this.alienManager.aliens.length === 0) {
      return;
    }

    const destroyedAliens = new Set();
    const remainingAliens = [];
    for (const alien of this.alienManager.aliens) {
      if (destroyedAliensThisFrame >= maxAlienDestroysPerFrame) {
        remainingAliens.push(alien);
        continue;
      }

      const bounds = alien.getBounds();
      const centerX = bounds.left + bounds.width * 0.5;
      const centerY = bounds.top + bounds.height * 0.5;
      const radius = Math.max(bounds.width, bounds.height) * 0.5;
      const distance = this.getDistancePointToSegment(
        centerX,
        centerY,
        beamSegment.startX,
        beamSegment.startY,
        beamSegment.endX,
        beamSegment.endY
      );
      if (distance <= radius + beamThickness) {
        destroyedAliensThisFrame += 1;
        destroyedAliens.add(alien);
        this.destroyedCount += 1;
        this.addScore(160, 'destroyed');
        this.explosions.push(new Explosion(alien.positionX, alien.positionY));
        continue;
      }
      remainingAliens.push(alien);
    }
    this.alienManager.aliens = remainingAliens;

    if (destroyedAliens.size > 0 && this.alienManager.lasers.length > 0) {
      this.alienManager.lasers = this.alienManager.lasers.filter((laser) => {
        if (laser.owner === null || laser.owner === undefined) {
          return true;
        }
        return destroyedAliens.has(laser.owner) === false;
      });
    }
  }

  // Auto-launches periodic seeker missiles while the powerup is active.
  updateSeekerMissiles(deltaSeconds) {
    if (this.seekerMissilesTimer <= 0) {
      return;
    }
    if (this.seekerMissilesShotsRemaining <= 0) {
      return;
    }

    this.seekerMissilesFireCooldownSeconds -= deltaSeconds;
    if (this.seekerMissilesFireCooldownSeconds > 0) {
      return;
    }

    const targets = [...this.asteroidManager.asteroids, ...this.alienManager.aliens];
    if (targets.length === 0) {
      // Don't consume a shot; just try again soon.
      this.seekerMissilesFireCooldownSeconds = 0.35;
      return;
    }

    const randomIndex = Math.floor(Math.random() * targets.length);
    const target = targets[randomIndex];
    const startX = this.player.positionX + this.player.width * 0.35;
    const startY = this.player.positionY + (Math.random() - 0.5) * this.player.height * 0.6;
    this.missiles.push(new Missile(startX, startY, target));
    this.seekerMissilesShotsRemaining -= 1;

    const jitter = 0.8 + Math.random() * 0.4;
    const interval = this.seekerMissilesFireIntervalSeconds > 0 ? this.seekerMissilesFireIntervalSeconds : 1.8;
    this.seekerMissilesFireCooldownSeconds = interval * jitter;
    this.updateHud();
  }

  // Splits asteroids into smaller fragments at random moments (before mid-screen) while splitter is active.
  applyAsteroidSplitter(deltaSeconds) {
    if (this.asteroidSplitterTimer <= 0) {
      return;
    }
    if (this.asteroidManager.asteroids.length === 0) {
      return;
    }

    const midScreenX = this.canvas.width * 0.5;
    const earliestSplitX = this.canvas.width * 0.95;
    const maxSplitsPerFrame = 3;
    let splits = 0;
    const splitRatePerSecond = 0.55;
    const splitChance = 1 - Math.exp(-splitRatePerSecond * deltaSeconds);

    const remainingAsteroids = [];
    for (const asteroid of this.asteroidManager.asteroids) {
      const splitDepth = asteroid.splitDepth ?? 0;
      const canSplit = splitDepth < 1;
      const largeEnough = (asteroid.radiusX ?? 0) > 24;
      const isPastEntry = asteroid.positionX <= earliestSplitX;
      const isBeforeMid = asteroid.positionX >= midScreenX;
      const shouldSplitThisFrame = Math.random() < splitChance;

      if (splits < maxSplitsPerFrame && canSplit === true && largeEnough === true && isPastEntry === true && isBeforeMid === true && shouldSplitThisFrame === true) {
        splits += 1;

        // Small crack pop when shattering (no score; this is a negative effect).
        this.explosions.push(new Explosion(asteroid.positionX, asteroid.positionY, { maxRadius: 30, lifeSeconds: 0.32, ringAlpha: 0.22 }));

        const fragments = [];
        const fragmentScale = 0.58;
        const baseSpeed = this.asteroidManager.baseSpeedStart ?? 240;
        const baseVerticalSpeed = 240 + Math.random() * 380;

        for (const sign of [-1, 1]) {
          const fragment = new Asteroid(this.canvas.width, this.canvas.height, baseSpeed, asteroid.spriteImage, 1);
          fragment.spriteImage = asteroid.spriteImage;
          fragment.scale = (asteroid.scale ?? 1) * fragmentScale;
          fragment.radiusX = (asteroid.radiusX ?? 40) * fragmentScale;
          fragment.radiusY = (asteroid.radiusY ?? 30) * fragmentScale;
          fragment.positionX = asteroid.positionX;

          const jitter = (Math.random() - 0.5) * 26;
          fragment.baseY = asteroid.positionY + jitter;
          fragment.positionY = fragment.baseY;
          fragment.velocityY = sign * baseVerticalSpeed * (0.75 + Math.random() * 0.55);

          fragment.speed = (asteroid.speed ?? 260) * (1.35 + Math.random() * 0.55);
          fragment.rotation = (asteroid.rotation ?? 0) + (Math.random() - 0.5) * 1.2;
          fragment.rotationSpeed = (Math.random() - 0.5) * 4.2;
          fragment.oscPhase = (asteroid.oscPhase ?? 0) + Math.random() * 1.5;
          fragment.oscSpeed = (asteroid.oscSpeed ?? 1) * (1.15 + Math.random() * 0.6);
          fragment.activeSizeScale = asteroid.activeSizeScale ?? 1;
          fragment.splitDepth = splitDepth + 1;
          fragments.push(fragment);
        }

        // Remove the original and add fragments.
        remainingAsteroids.push(...fragments);
        continue;
      }
      remainingAsteroids.push(asteroid);
    }
    this.asteroidManager.asteroids = remainingAsteroids;
  }

  // Advances space dust particle positions.
  updateSpaceDust(deltaSeconds) {
    if (this.spaceDustIntensity <= 0 || this.spaceDustParticles.length === 0) {
      return;
    }
    const leftRespawnX = this.canvas.width * 0.15;
    const respawnMinX = this.canvas.width * 1.02;
    const respawnMaxX = this.canvas.width * 1.35;
    for (const particle of this.spaceDustParticles) {
      particle.x -= particle.speed * deltaSeconds;
      particle.y += particle.drift * deltaSeconds;
      // Keep clouds primarily on the right; respawn off-screen so they drift in smoothly.
      if (particle.x < leftRespawnX) {
        particle.x = respawnMinX + Math.random() * (respawnMaxX - respawnMinX);
        particle.y = Math.random() * this.canvas.height;
      }
      const verticalPadding = particle.size * 0.7;
      if (particle.y < -verticalPadding) {
        particle.y = this.canvas.height + verticalPadding;
      } else if (particle.y > this.canvas.height + verticalPadding) {
        particle.y = -verticalPadding;
      }
    }
  }

  // Builds a set of right-side space dust particles (mix of drifting haze and dense wall).
  buildSpaceDustParticles() {
    const renderScale = this.renderScale > 0 ? this.renderScale : 1;
    const displayWidth = this.canvas.width * renderScale;
    const qualityScale = Math.max(0.55, Math.min(1, renderScale));
    const hazeCount = Math.round(44 * qualityScale);
    const wallCount = Math.round(24 * qualityScale);
    const count = hazeCount + wallCount;
    const particles = [];
    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      const isWallParticle = particleIndex < wallCount;
      const startXDisplay = displayWidth * (isWallParticle === true ? 0.82 + Math.random() * 0.28 : 0.65 + Math.random() * 0.35);

      const minSizeDisplay = isWallParticle === true ? Math.max(240, displayWidth * 0.26) : Math.max(160, displayWidth * 0.18);
      const maxSizeDisplay = isWallParticle === true ? Math.max(420, displayWidth * 0.46) : Math.max(260, displayWidth * 0.30);
      const sizeDisplay = minSizeDisplay + Math.random() * (maxSizeDisplay - minSizeDisplay);

      const speedDisplay = isWallParticle === true ? 10 + Math.random() * 22 : 24 + Math.random() * 60;
      const driftDisplay = (Math.random() - 0.5) * (isWallParticle === true ? 18 : 42);

      particles.push({
        x: startXDisplay / renderScale,
        y: Math.random() * this.canvas.height,
        size: sizeDisplay / renderScale,
        heightFactor: isWallParticle === true ? 0.55 + Math.random() * 0.15 : 0.55 + Math.random() * 0.25,
        alpha: isWallParticle === true ? 0.82 + Math.random() * 0.16 : 0.6 + Math.random() * 0.25,
        speed: speedDisplay / renderScale,
        drift: driftDisplay / renderScale,
        spriteIndex: Math.floor(Math.random() * this.spaceDustCloudImages.length)
      });
    }
    return particles;
  }

  // Draws the orbital laser beam while active.
  drawOrbitalLaser() {
    if (this.orbitalLaserTimer <= 0) {
      return;
    }
    const beamSegment = this.getOrbitalLaserBeamSegment();
    if (beamSegment === null) {
      return;
    }

    const playerX = this.player.positionX;
    const playerY = this.player.positionY;
    const beamThickness = Math.max(10, Math.min(18, Math.max(this.player.width, this.player.height) * 0.12));

    const pulseProgress = beamSegment.pulseProgress ?? 0;
    const pulseShape = Math.sin(pulseProgress * Math.PI);
    const alpha = 0.35 + 0.55 * pulseShape;

    this.context.save();
    this.context.globalCompositeOperation = 'screen';

    // Player pulse ring.
    const ringRadius = Math.max(this.player.width, this.player.height) * (0.8 + 0.25 * pulseProgress);
    this.context.globalAlpha = 0.08 + 0.28 * pulseShape;
    this.context.strokeStyle = 'rgba(244, 114, 182, 0.95)';
    this.context.lineWidth = 3;
    this.context.beginPath();
    this.context.arc(playerX, playerY, ringRadius, 0, Math.PI * 2);
    this.context.stroke();

    // Outer glow beam.
    this.context.globalAlpha = alpha;
    const outerGradient = this.context.createLinearGradient(beamSegment.startX, beamSegment.startY, beamSegment.endX, beamSegment.endY);
    outerGradient.addColorStop(0, 'rgba(244, 114, 182, 0.95)');
    outerGradient.addColorStop(0.5, 'rgba(244, 114, 182, 0.35)');
    outerGradient.addColorStop(1, 'rgba(244, 114, 182, 0)');
    this.context.strokeStyle = outerGradient;
    this.context.lineWidth = beamThickness * 2.1;
    this.context.lineCap = 'round';
    this.context.beginPath();
    this.context.moveTo(beamSegment.startX, beamSegment.startY);
    this.context.lineTo(beamSegment.endX, beamSegment.endY);
    this.context.stroke();

    // Hot core beam.
    const coreGradient = this.context.createLinearGradient(beamSegment.startX, beamSegment.startY, beamSegment.endX, beamSegment.endY);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.55)');
    coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.context.strokeStyle = coreGradient;
    this.context.lineWidth = Math.max(2, beamThickness * 0.55);
    this.context.beginPath();
    this.context.moveTo(beamSegment.startX, beamSegment.startY);
    this.context.lineTo(beamSegment.endX, beamSegment.endY);
    this.context.stroke();

    // Emitter glow at the base point (rotates around the player).
    this.context.globalAlpha = 0.25 + 0.75 * pulseShape;
    this.context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.context.beginPath();
    this.context.arc(beamSegment.startX, beamSegment.startY, Math.max(3, beamThickness * 0.45), 0, Math.PI * 2);
    this.context.fill();

    this.context.restore();
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

    // Gameplay layer (shake gameplay, keep HUD stable).
    this.context.save();
    this.context.translate(this.cameraOffsetX, this.cameraOffsetY);
    this.powerUpManager.draw(this.context);
    this.asteroidManager.draw(this.context);
    this.alienManager.draw(this.context);
    this.drawBullets();
    this.drawMissiles();
    const flashIntensity = Math.max(this.hitFlashSeconds / 0.3, 0);
    const isCloaked = this.cloakTimer > 0;
    const powerupRatios = this.getPowerupRatios();
    this.player.draw(this.context, isCloaked, flashIntensity, powerupRatios);
    this.drawOrbitalLaser();
    this.drawHazardShootingStars();
    this.drawExplosions();
    this.drawForceFieldPulse();
    this.context.restore();

    // Screen-space overlays (stable).
    this.drawHitFlashOverlay();
    this.drawSpaceDustOverlay();
    this.drawPostFxOverlay();
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

  // Renders active missiles to the canvas.
  drawMissiles() {
    for (const missile of this.missiles) {
      missile.draw(this.context);
    }
  }

  // Renders rare foreground shooting star hazards.
  drawHazardShootingStars() {
    for (const shootingStar of this.hazardShootingStars) {
      shootingStar.draw(this.context);
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
    if (this.spaceDustIntensity <= 0) {
      return;
    }
    const alpha = Math.min(this.spaceDustIntensity, 1);
    this.context.save();

    // Strong right-side shroud (nearly opaque) plus cool ion-fog tint.
    const shroudStartX = this.canvas.width * 0.18;
    const shroudGradient = this.context.createLinearGradient(shroudStartX, 0, this.canvas.width, 0);
    shroudGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shroudGradient.addColorStop(0.45, `rgba(8, 12, 26, ${alpha * 0.42})`);
    shroudGradient.addColorStop(0.75, `rgba(6, 8, 18, ${alpha * 0.90})`);
    shroudGradient.addColorStop(1, `rgba(6, 8, 18, ${alpha * 0.99})`);
    this.context.globalAlpha = 1;
    this.context.fillStyle = shroudGradient;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const tintGradient = this.context.createLinearGradient(shroudStartX, 0, this.canvas.width, 0);
    tintGradient.addColorStop(0, 'rgba(147, 197, 253, 0)');
    tintGradient.addColorStop(0.6, `rgba(59, 130, 246, ${alpha * 0.12})`);
    tintGradient.addColorStop(1, `rgba(148, 163, 184, ${alpha * 0.22})`);
    this.context.fillStyle = tintGradient;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Overlay cloud sprites for extra obstruction (SVGs only).
    const intensityScale = alpha;
    if (this.spaceDustCloudImages !== undefined && this.spaceDustCloudImages.length > 0) {
      for (const particle of this.spaceDustParticles) {
        const img = this.spaceDustCloudImages[particle.spriteIndex % this.spaceDustCloudImages.length];
        if (img.complete === true) {
          const cloudWidth = particle.size;
          const cloudHeight = particle.size * (particle.heightFactor ?? 0.6);
          const xStrength = Math.max(0, Math.min(1, (particle.x - shroudStartX) / (this.canvas.width - shroudStartX)));
          const depthAlphaBoost = 0.35 + 0.95 * xStrength;
          this.context.globalAlpha = Math.min(0.995, particle.alpha * intensityScale * depthAlphaBoost);
          this.context.drawImage(img, particle.x - cloudWidth * 0.5, particle.y - cloudHeight * 0.5, cloudWidth, cloudHeight);
        }
      }
    }

    this.context.restore();
  }

  // Draws post-processing overlays (vignette, grain, and powerup screen FX).
  drawPostFxOverlay() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (width <= 0 || height <= 0) {
      return;
    }

    // Vignette (subtle, ramps up slightly with danger).
    const lowLives = Math.max(0, 3 - this.livesRemaining);
    const hitPulse = Math.max(this.hitFlashSeconds / 0.3, 0);
    const dangerBoost = (lowLives * 0.06) + hitPulse * 0.07;
    const dustBoost = this.spaceDustIntensity > 0 ? this.spaceDustIntensity * 0.05 : 0;
    const vignetteAlpha = Math.max(0.14, Math.min(0.32, 0.18 + dangerBoost + dustBoost));
    this.context.save();
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const innerRadius = Math.min(width, height) * 0.35;
    const outerRadius = Math.hypot(width, height) * 0.6;
    const vignette = this.context.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(0,0,0,${vignetteAlpha})`);
    this.context.fillStyle = vignette;
    this.context.fillRect(0, 0, width, height);
    this.context.restore();

    // Powerup screen FX.
    if (this.enablePowerupScreenFx === true) {
      this.drawPowerupScreenFx();
    }

    // Film grain (tiny).
    if (this.enableFilmGrain === true && this.filmGrainPattern !== null && this.filmGrainCanvas !== null && this.spaceDustIntensity <= 0) {
      const grainAlpha = 0.04;
      const grainWidth = this.filmGrainCanvas.width;
      const grainHeight = this.filmGrainCanvas.height;
      this.context.save();
      this.context.globalAlpha = Math.min(0.07, grainAlpha);
      this.context.translate(-this.filmGrainOffsetX, -this.filmGrainOffsetY);
      this.context.fillStyle = this.filmGrainPattern;
      this.context.fillRect(0, 0, width + grainWidth, height + grainHeight);
      this.context.restore();
    }
  }

  // Draws subtle screen-space effects keyed off active powerups.
  drawPowerupScreenFx() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Cloak: faint shimmer sweep.
    if (this.cloakTimer > 0) {
      const ratio = this.durationLookup.cloak > 0 ? this.cloakTimer / this.durationLookup.cloak : 1;
      const intensity = 0.12 + 0.10 * Math.max(0, Math.min(1, ratio));
      const time = this.timeElapsedSeconds;
      const sweepCenter = (time * 220) % (width + 240) - 120;
      const shimmer = this.context.createLinearGradient(sweepCenter - 140, 0, sweepCenter + 140, 0);
      shimmer.addColorStop(0, 'rgba(106, 199, 255, 0)');
      shimmer.addColorStop(0.5, `rgba(106, 199, 255, ${intensity})`);
      shimmer.addColorStop(1, 'rgba(106, 199, 255, 0)');
      this.context.save();
      this.context.globalCompositeOperation = 'screen';
      this.context.fillStyle = shimmer;
      this.context.fillRect(0, 0, width, height);
      this.context.restore();
    }

    // Slow: cool tint (subtle).
    if (this.slowTimer > 0) {
      const ratio = this.durationLookup.slow > 0 ? this.slowTimer / this.durationLookup.slow : 1;
      const intensity = 0.06 + 0.06 * Math.max(0, Math.min(1, ratio));
      this.context.save();
      this.context.fillStyle = `rgba(179, 156, 255, ${intensity})`;
      this.context.fillRect(0, 0, width, height);
      this.context.restore();
    }

    // Black hole: dark radial pull on the right side.
    if (this.blackHoleTimer > 0) {
      const ratio = this.durationLookup.blackHole > 0 ? this.blackHoleTimer / this.durationLookup.blackHole : 1;
      const intensity = 0.22 + 0.18 * Math.max(0, Math.min(1, ratio));
      const centerX = width * 0.86;
      const centerY = height * 0.52;
      const radius = Math.max(width, height) * 0.65;
      const pull = this.context.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius);
      pull.addColorStop(0, `rgba(0,0,0,${intensity})`);
      pull.addColorStop(1, 'rgba(0,0,0,0)');
      this.context.save();
      this.context.globalCompositeOperation = 'multiply';
      this.context.fillStyle = pull;
      this.context.fillRect(0, 0, width, height);
      this.context.restore();
    }

    // Solar flare: warm rim light + gentle top glow.
    if (this.solarFlareTimer > 0) {
      const ratio = this.durationLookup.solarFlare > 0 ? this.solarFlareTimer / this.durationLookup.solarFlare : 1;
      const intensity = 0.08 + 0.10 * Math.max(0, Math.min(1, ratio));
      this.context.save();
      this.context.globalCompositeOperation = 'screen';
      const topGlow = this.context.createLinearGradient(0, 0, 0, height * 0.6);
      topGlow.addColorStop(0, `rgba(255, 179, 71, ${intensity})`);
      topGlow.addColorStop(1, 'rgba(255, 179, 71, 0)');
      this.context.fillStyle = topGlow;
      this.context.fillRect(0, 0, width, height);
      const edgeGlow = this.context.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.2, width * 0.5, height * 0.5, Math.hypot(width, height) * 0.6);
      edgeGlow.addColorStop(0, 'rgba(255,179,71,0)');
      edgeGlow.addColorStop(1, `rgba(255, 107, 107, ${intensity * 0.85})`);
      this.context.fillStyle = edgeGlow;
      this.context.fillRect(0, 0, width, height);
      this.context.restore();
    }

    // Wave: faint horizontal ripple bands.
    if (this.waveTimer > 0) {
      const ratio = this.durationLookup.wave > 0 ? this.waveTimer / this.durationLookup.wave : 1;
      const intensity = 0.05 + 0.05 * Math.max(0, Math.min(1, ratio));
      this.context.save();
      this.context.globalCompositeOperation = 'screen';
      this.context.strokeStyle = `rgba(122, 208, 255, ${intensity})`;
      this.context.lineWidth = 1;
      const time = this.timeElapsedSeconds;
      const bandCount = 10;
      for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
        const y = (height * (bandIndex + 1)) / (bandCount + 1);
        const wave = Math.sin(time * 2 + bandIndex) * 10;
        this.context.beginPath();
        this.context.moveTo(0, y + wave);
        this.context.lineTo(width, y - wave);
        this.context.stroke();
      }
      this.context.restore();
    }
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
    this.detectPlayerHazardShootingStarCollision();
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

  // Handles collisions with rare foreground shooting star hazards.
  detectPlayerHazardShootingStarCollision() {
    if (this.invulnerabilitySeconds > 0) {
      return;
    }
    if (this.hazardShootingStars.length === 0) {
      return;
    }
    const playerBounds = this.player.getBounds();
    const playerX = this.player.positionX;
    const playerY = this.player.positionY;
    const playerRadius = Math.min(this.player.width, this.player.height) * 0.35;
    for (let index = this.hazardShootingStars.length - 1; index >= 0; index -= 1) {
      const shootingStar = this.hazardShootingStars[index];
      // Broad phase (head only; trail is visual).
      if (this.isBoundingOverlap(playerBounds, shootingStar.getHeadBounds()) !== true) {
        continue;
      }

      // Narrow phase: head circle only.
      const headX = shootingStar.positionX;
      const headY = shootingStar.positionY;
      const deltaX = playerX - headX;
      const deltaY = playerY - headY;
      const distance = Math.hypot(deltaX, deltaY);
      const headRadius = shootingStar.getHeadRadius();
      if (distance <= playerRadius + headRadius) {
        this.hazardShootingStars.splice(index, 1);
        this.explosions.push(new Explosion(shootingStar.positionX, shootingStar.positionY, { kind: 'meteor' }));
        this.startCameraShake(14, 0.35);
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

    if (powerUp.type === 'orbitalLaser') {
      this.orbitalLaserTimer = powerUp.config.durationSeconds;
      this.durationLookup.orbitalLaser = powerUp.config.durationSeconds;
      this.orbitalLaserStartAngleRadians = Math.random() * Math.PI * 2;
      this.updateStatus('Orbital laser online! Stay close and let it sweep.');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'seekerMissiles') {
      this.seekerMissilesTimer = powerUp.config.durationSeconds;
      this.durationLookup.seekerMissiles = powerUp.config.durationSeconds;
      const totalShots = 3;
      this.seekerMissilesShotsRemaining = totalShots;
      this.seekerMissilesFireIntervalSeconds = powerUp.config.durationSeconds / totalShots;
      this.seekerMissilesFireCooldownSeconds = Math.min(0.9, this.seekerMissilesFireIntervalSeconds * 0.6);
      this.updateStatus('Seeker missiles armed. Missiles will auto-launch.');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'missileBarrage') {
      this.missileBarrageTimer = powerUp.config.durationSeconds;
      this.durationLookup.missileBarrage = powerUp.config.durationSeconds;
      this.updateStatus('Missile barrage armed. Stand by...');
      this.updateHud();
      return;
    }

    if (powerUp.type === 'asteroidSplitter') {
      this.asteroidSplitterTimer = powerUp.config.durationSeconds;
      this.durationLookup.asteroidSplitter = powerUp.config.durationSeconds;
      this.updateStatus('Asteroid splitter! Incoming rocks will shatter into smaller ones.');
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
    this.startCameraShake(8, 0.22);
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

  // Returns the distance from a point to a line segment.
  getDistancePointToSegment(pointX, pointY, segmentAX, segmentAY, segmentBX, segmentBY) {
    const abX = segmentBX - segmentAX;
    const abY = segmentBY - segmentAY;
    const apX = pointX - segmentAX;
    const apY = pointY - segmentAY;
    const abLenSq = abX * abX + abY * abY;
    if (abLenSq <= 0) {
      return Math.hypot(apX, apY);
    }
    let t = (apX * abX + apY * abY) / abLenSq;
    t = Math.max(0, Math.min(1, t));
    const closestX = segmentAX + abX * t;
    const closestY = segmentAY + abY * t;
    return Math.hypot(pointX - closestX, pointY - closestY);
  }

  // Calculates ratios for powerup indicator arcs.
  getPowerupRatios() {
    return {
      cloak: this.durationLookup.cloak > 0 ? this.cloakTimer / this.durationLookup.cloak : 0,
      blaster: this.durationLookup.blaster > 0 ? this.blasterTimer / this.durationLookup.blaster : 0,
      slow: this.durationLookup.slow > 0 ? this.slowTimer / this.durationLookup.slow : 0,
      forceField: this.durationLookup.forceField > 0 ? this.forceFieldTimer / this.durationLookup.forceField : 0,
      orbitalLaser: this.durationLookup.orbitalLaser > 0 ? this.orbitalLaserTimer / this.durationLookup.orbitalLaser : 0,
      seekerMissiles: this.durationLookup.seekerMissiles > 0 ? this.seekerMissilesTimer / this.durationLookup.seekerMissiles : 0,
      missileBarrage: this.durationLookup.missileBarrage > 0 ? this.missileBarrageTimer / this.durationLookup.missileBarrage : 0,
      asteroidSplitter: this.durationLookup.asteroidSplitter > 0 ? this.asteroidSplitterTimer / this.durationLookup.asteroidSplitter : 0,
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

