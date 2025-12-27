let testModeConfig = { enabled: false, allowed: null };

const powerUpConfigs = {
  extraLife: { color: '#6bf178', label: '+1', durationSeconds: 0 },
  cloak: { color: '#ff8a3d', label: 'EB', durationSeconds: 6 },
  blaster: { color: '#ffde59', label: 'B', durationSeconds: 9 },
  slow: { color: '#b39cff', label: 'S', durationSeconds: 7 },
  forceField: { color: '#60a5fa', label: 'F', durationSeconds: 8 },
  allyAlien: { color: '#67f4c1', label: 'AA', durationSeconds: 8 },
  shootingStarStorm: { color: '#ffb347', label: 'SS', durationSeconds: 5 },
  orbitalLaser: { color: '#f472b6', label: 'OL', durationSeconds: 7 },
  seekerMissiles: { color: '#a78bfa', label: 'HM', durationSeconds: 7 },
  missileBarrage: { color: '#93c5fd', label: 'MB', durationSeconds: 6 },
  asteroidSplitter: { color: '#67f4c1', label: 'AS', durationSeconds: 8, isNegative: true },
  spaceDust: { color: '#fbbf24', label: 'D', durationSeconds: 6, isNegative: true },
  multiplier: { color: '#ff9f45', label: 'Mx', durationSeconds: 10 },
  blackHole: { color: '#3f2e5c', label: 'BH', durationSeconds: 7, isNegative: true },
  solarFlare: { color: '#ffb347', label: 'SF', durationSeconds: 7, isNegative: true },
  wave: { color: '#7ad0ff', label: 'W', durationSeconds: 8, isNegative: true }
};

// Represents a collectible power-up orb.
export class PowerUp {
  constructor(canvasWidth, canvasHeight, type, iconImage) {
    this.type = type;
    const size = 18 + Math.random() * 10;
    this.radius = size;
    this.positionX = canvasWidth + this.radius + 40;
    this.positionY = 80 + Math.random() * (canvasHeight - 160);
    this.speed = 170;
    this.config = powerUpConfigs[type];
    this.pulseTimer = 0;
    this.iconImage = iconImage;
  }

  // Advances the power-up across the screen with a gentle bob.
  update(deltaSeconds) {
    const positionDelta = this.speed * deltaSeconds;
    this.positionX -= positionDelta;
    this.pulseTimer += deltaSeconds * 3;
    const verticalBob = Math.sin(this.pulseTimer) * 12 * deltaSeconds * 10;
    this.positionY += verticalBob * 0.1;
  }

  // Indicates when the power-up has exited the screen.
  isOffScreen() {
    const offScreenThreshold = -this.radius - 40;
    if (this.positionX < offScreenThreshold) {
      return true;
    }
    return false;
  }

  // Draws the glowing orb with a label indicating the type.
  draw(drawingContext) {
    const glowRadius = this.radius * 1.6;
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    const gradient = drawingContext.createRadialGradient(0, 0, this.radius * 0.3, 0, 0, glowRadius);
    const negativeGlow = 'rgba(244, 211, 94, 0.9)';
    gradient.addColorStop(0, this.config.isNegative ? negativeGlow : this.config.color);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    drawingContext.fillStyle = gradient;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, glowRadius, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.fillStyle = '#0b1024';
    drawingContext.beginPath();
    drawingContext.arc(0, 0, this.radius, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.strokeStyle = this.config.isNegative ? '#f4d35e' : this.config.color;
    drawingContext.lineWidth = 3;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, this.radius, 0, Math.PI * 2);
    drawingContext.stroke();

    if (this.iconImage !== undefined && this.iconImage !== null) {
      const iconSize = this.radius * 1.3;
      drawingContext.globalAlpha = this.config.isNegative ? 0.85 : 1;
      drawingContext.drawImage(this.iconImage, -iconSize * 0.5, -iconSize * 0.5, iconSize, iconSize);
      drawingContext.globalAlpha = 1;
    } else {
      drawingContext.fillStyle = this.config.isNegative ? '#ff6b6b' : this.config.color;
      drawingContext.font = 'bold 14px Inter, system-ui';
      drawingContext.textAlign = 'center';
      drawingContext.textBaseline = 'middle';
      drawingContext.fillText(this.config.label, 0, 0);
    }
    drawingContext.restore();
  }

  // Returns the bounding box for collision tests.
  getBounds() {
    return {
      left: this.positionX - this.radius,
      top: this.positionY - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }
}

// Retrieves a random power-up type with weighted odds.
export function setTestModeConfig(enabled, allowedKeys) {
  testModeConfig = {
    enabled: Boolean(enabled),
    allowed: Array.isArray(allowedKeys) && allowedKeys.length > 0 ? [...allowedKeys] : null
  };
}

export function getRandomPowerUpType() {
  if (testModeConfig.enabled === true) {
    if (testModeConfig.allowed !== null) {
      const randomIndex = Math.floor(Math.random() * testModeConfig.allowed.length);
      return testModeConfig.allowed[randomIndex];
    }
  }
  const roll = Math.random();
  if (roll < 0.5) {
    // Positive pool: original weighted distribution + new specials.
    // - missileBarrage: 10% of positives
    // - orbitalLaser: 8% of positives
    // - seekerMissiles: 8% of positives
    // - allyAlien: 8% of positives
    // - shootingStarStorm: 8% of positives
    //
    // Approx overall odds (normal play):
    // - missileBarrage: 50% * 10% = ~5% (about 1 in 20 powerups)
    // - orbitalLaser: 50% * 8% = ~4% (about 1 in 25 powerups)
    // - seekerMissiles: 50% * 8% = ~4% (about 1 in 25 powerups)
    // - allyAlien: 50% * 8% = ~4% (about 1 in 25 powerups)
    // - shootingStarStorm: 50% * 8% = ~4% (about 1 in 25 powerups)
    const positiveWeight = Math.random();
    const missileShare = 0.10;
    const orbitalLaserShare = 0.08;
    const seekerMissilesShare = 0.08;
    const allyAlienShare = 0.08;
    const shootingStarStormShare = 0.08;
    const remainingShare = 1 - missileShare - orbitalLaserShare - seekerMissilesShare - allyAlienShare - shootingStarStormShare;

    const extraLifeCutoff = 0.28 * remainingShare;
    const cloakCutoff = (0.28 + 0.22) * remainingShare;
    const blasterCutoff = (0.28 + 0.22 + 0.18) * remainingShare;
    const slowCutoff = (0.28 + 0.22 + 0.18 + 0.14) * remainingShare;
    const forceFieldCutoff = (0.28 + 0.22 + 0.18 + 0.14 + 0.10) * remainingShare;
    const multiplierCutoff = remainingShare;

    if (positiveWeight < extraLifeCutoff) {
      return 'extraLife';
    }
    if (positiveWeight < cloakCutoff) {
      return 'cloak';
    }
    if (positiveWeight < blasterCutoff) {
      return 'blaster';
    }
    if (positiveWeight < slowCutoff) {
      return 'slow';
    }
    if (positiveWeight < forceFieldCutoff) {
      return 'forceField';
    }
    if (positiveWeight < multiplierCutoff) {
      return 'multiplier';
    }

    const specialWeight = positiveWeight - remainingShare;
    if (specialWeight < shootingStarStormShare) {
      return 'shootingStarStorm';
    }
    if (specialWeight < shootingStarStormShare + allyAlienShare) {
      return 'allyAlien';
    }
    if (specialWeight < shootingStarStormShare + allyAlienShare + seekerMissilesShare) {
      return 'seekerMissiles';
    }
    if (specialWeight < shootingStarStormShare + allyAlienShare + seekerMissilesShare + orbitalLaserShare) {
      return 'orbitalLaser';
    }
    return 'missileBarrage';
  }
  // Negative pool: original weighted distribution + asteroid splitter.
  // - asteroidSplitter: 8% of negatives (~4% overall)
  const negativeWeight = Math.random();
  const splitterShare = 0.08;
  const remainingShare = 1 - splitterShare;
  const blackHoleCutoff = 0.35 * remainingShare;
  const solarFlareCutoff = (0.35 + 0.25) * remainingShare;
  const waveCutoff = (0.35 + 0.25 + 0.22) * remainingShare;
  const spaceDustCutoff = remainingShare;

  if (negativeWeight < blackHoleCutoff) {
    return 'blackHole';
  }
  if (negativeWeight < solarFlareCutoff) {
    return 'solarFlare';
  }
  if (negativeWeight < waveCutoff) {
    return 'wave';
  }
  if (negativeWeight < spaceDustCutoff) {
    return 'spaceDust';
  }
  return 'asteroidSplitter';
}

