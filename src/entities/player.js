// Represents the controllable spaceman with physics.
export class Player {
  constructor(canvasWidth, canvasHeight, spriteSource) {
    this.width = 44;
    this.height = 58;
    this.gravityStrength = 1400;
    this.jumpStrength = 520;
    this.horizontalSpeed = 560;
    this.velocityX = 0;
    this.positionX = 0;
    this.positionY = 0;
    this.velocityY = 0;
    this.spriteImage = null;
    this.normalSpriteImage = null;
    this.damagedSpriteImage = null;
    this.criticalSpriteImage = null;
    this.tintColor = 'rgba(255, 255, 255, 0)';
    this.damageLevel = 0;
    this.damageSparks = [];
    this.damageSparksSpawnAccumulator = 0;
    this.setSprites(spriteSource);
    this.setCanvasSize(canvasWidth, canvasHeight);
    this.reset(canvasHeight * 0.5);
  }

  // Sets the current sprite images (normal + damage variants) after they have loaded.
  setSprites(spriteSource) {
    if (spriteSource !== null && spriteSource !== undefined && typeof spriteSource === 'object' && spriteSource.normal !== undefined) {
      this.normalSpriteImage = spriteSource.normal ?? null;
      this.damagedSpriteImage = spriteSource.damaged ?? null;
      this.criticalSpriteImage = spriteSource.critical ?? null;
      this.spriteImage = this.normalSpriteImage;
      return;
    }
    this.normalSpriteImage = spriteSource ?? null;
    this.damagedSpriteImage = null;
    this.criticalSpriteImage = null;
    this.spriteImage = this.normalSpriteImage;
  }

  // Sets the current sprite image after it has loaded.
  setSprite(newSpriteImage) {
    this.spriteImage = newSpriteImage;
  }

  // Updates cached canvas size and anchor position.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.anchorX = Math.round(this.canvasWidth * 0.2);
    this.positionX = this.anchorX;
  }

  // Resets the player position and vertical speed.
  reset(startHeight) {
    this.positionY = startHeight;
    this.positionX = this.anchorX;
    this.velocityY = 0;
    this.velocityX = 0;
  }

  // Applies upward thrust to the player.
  jump() {
    this.velocityY = -this.jumpStrength;
  }

  // Updates player physics and constrains movement within the play area.
  update(deltaSeconds, movementInput) {
    // Free-move powerup removed; always ease to anchor.
    const anchorDelta = this.anchorX - this.positionX;
    this.velocityX += anchorDelta * 10 * deltaSeconds;
    this.velocityX *= 0.35;

    const horizontalDelta = this.velocityX * deltaSeconds;
    this.positionX += horizontalDelta;

    const gravityDelta = this.gravityStrength * deltaSeconds;
    this.velocityY += gravityDelta;
    const positionDeltaY = this.velocityY * deltaSeconds;
    this.positionY += positionDeltaY;

    const minimumY = this.height * 0.5;
    const maximumY = this.canvasHeight - this.height * 0.5;
    const minimumX = this.width * 0.5;
    const maximumX = this.canvasWidth - this.width * 0.5;
    let touchedBoundary = false;

    if (this.positionY < minimumY) {
      this.positionY = minimumY;
      this.velocityY = 0;
      touchedBoundary = true;
    }

    if (this.positionY > maximumY) {
      this.positionY = maximumY;
      this.velocityY = 0;
      touchedBoundary = true;
    }

    if (this.positionX < minimumX) {
      this.positionX = minimumX;
      this.velocityX = 0;
      touchedBoundary = true;
    }

    if (this.positionX > maximumX) {
      this.positionX = maximumX;
      this.velocityX = 0;
      touchedBoundary = true;
    }

    this.updateDamageSparks(deltaSeconds);

    return touchedBoundary;
  }

  // Updates suit tint based on remaining lives.
  setAppearanceByLives(livesRemaining) {
    // Prefer swapping to explicit damage sprites instead of drawing any tinted rectangle overlay.
    this.tintColor = 'rgba(255, 255, 255, 0)';
    const previousDamageLevel = this.damageLevel;
    let nextDamageLevel = 0;

    if (livesRemaining >= 3) {
      nextDamageLevel = 0;
      if (this.normalSpriteImage !== null) {
        this.spriteImage = this.normalSpriteImage;
      }
    } else if (livesRemaining === 2) {
      nextDamageLevel = 1;
      if (this.damagedSpriteImage !== null) {
        this.spriteImage = this.damagedSpriteImage;
      } else if (this.normalSpriteImage !== null) {
        this.spriteImage = this.normalSpriteImage;
      }
    } else {
      nextDamageLevel = 2;
      if (this.criticalSpriteImage !== null) {
        this.spriteImage = this.criticalSpriteImage;
      } else if (this.damagedSpriteImage !== null) {
        this.spriteImage = this.damagedSpriteImage;
      } else if (this.normalSpriteImage !== null) {
        this.spriteImage = this.normalSpriteImage;
      }
    }

    this.damageLevel = nextDamageLevel;
    if (this.damageLevel <= 0) {
      this.damageSparks = [];
      this.damageSparksSpawnAccumulator = 0;
    } else if (this.damageLevel > previousDamageLevel) {
      this.spawnDamageSparksBurst(this.damageLevel);
    }
  }

  // Spawns a short burst of sparks when damage increases.
  spawnDamageSparksBurst(damageLevel) {
    const maxSparks = damageLevel >= 2 ? 55 : 35;
    const burstCount = damageLevel >= 2 ? 16 : 10;
    for (let sparkIndex = 0; sparkIndex < burstCount; sparkIndex += 1) {
      if (this.damageSparks.length >= maxSparks) {
        break;
      }
      this.damageSparks.push(this.createDamageSpark(damageLevel, true));
    }
  }

  // Creates a single damage spark particle.
  createDamageSpark(damageLevel, isBurst = false) {
    const startX = -this.width * (0.25 + Math.random() * 0.38);
    const startY = (Math.random() - 0.5) * this.height * 0.72;

    const baseSpeed = damageLevel >= 2 ? 340 : 230;
    const speedJitter = isBurst === true ? 240 : 150;
    const speed = baseSpeed + Math.random() * speedJitter;

    const spreadRadians = damageLevel >= 2 ? 1.35 : 1.05;
    const directionRadians = Math.PI + (Math.random() - 0.5) * spreadRadians;
    const velocityX = Math.cos(directionRadians) * speed;
    const velocityY = Math.sin(directionRadians) * speed;

    const baseLifeSeconds = damageLevel >= 2 ? 0.5 : 0.42;
    const lifeSeconds = (isBurst === true ? 0.12 : 0.08) + Math.random() * baseLifeSeconds;
    const size = (damageLevel >= 2 ? 2.3 : 1.9) + Math.random() * 1.7;

    return {
      offsetX: startX,
      offsetY: startY,
      velocityX,
      velocityY,
      elapsedSeconds: 0,
      lifeSeconds,
      size,
      damageLevel
    };
  }

  // Updates and spawns damage sparks while the player is damaged.
  updateDamageSparks(deltaSeconds) {
    if (this.damageLevel <= 0) {
      return;
    }

    const spawnRatePerSecond = this.damageLevel >= 2 ? 28 : 14;
    const maxSparks = this.damageLevel >= 2 ? 55 : 35;

    this.damageSparksSpawnAccumulator += deltaSeconds * spawnRatePerSecond;
    while (this.damageSparksSpawnAccumulator >= 1) {
      this.damageSparksSpawnAccumulator -= 1;
      if (this.damageSparks.length >= maxSparks) {
        break;
      }
      this.damageSparks.push(this.createDamageSpark(this.damageLevel, false));
    }

    if (this.damageSparks.length === 0) {
      return;
    }

    const remainingSparks = [];
    for (const spark of this.damageSparks) {
      spark.elapsedSeconds += deltaSeconds;
      if (spark.elapsedSeconds >= spark.lifeSeconds) {
        continue;
      }
      spark.offsetX += spark.velocityX * deltaSeconds;
      spark.offsetY += spark.velocityY * deltaSeconds;
      spark.velocityX *= 0.92;
      spark.velocityY *= 0.92;
      remainingSparks.push(spark);
    }
    this.damageSparks = remainingSparks;
  }

  // Draws a spark effect to indicate current damage.
  drawDamageSparks(drawingContext) {
    if (this.damageLevel <= 0) {
      return;
    }
    if (this.damageSparks.length === 0) {
      return;
    }

    drawingContext.save();
    drawingContext.globalCompositeOperation = 'screen';
    for (const spark of this.damageSparks) {
      const lifeRatio = Math.max(0, Math.min(1, spark.elapsedSeconds / spark.lifeSeconds));
      const fade = Math.max(0, 1 - lifeRatio);
      const isCritical = spark.damageLevel >= 2;

      const coreColor = isCritical === true ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)';
      const glowColor = isCritical === true ? 'rgba(255, 107, 107, 0.92)' : 'rgba(255, 180, 84, 0.85)';

      const streakLength = isCritical === true ? 0.028 : 0.02;
      const streakX = spark.offsetX - spark.velocityX * streakLength;
      const streakY = spark.offsetY - spark.velocityY * streakLength;

      drawingContext.globalAlpha = 0.35 * fade;
      drawingContext.strokeStyle = glowColor;
      drawingContext.lineWidth = spark.size * 1.8;
      drawingContext.lineCap = 'round';
      drawingContext.beginPath();
      drawingContext.moveTo(spark.offsetX, spark.offsetY);
      drawingContext.lineTo(streakX, streakY);
      drawingContext.stroke();

      drawingContext.globalAlpha = 0.55 * fade;
      drawingContext.strokeStyle = coreColor;
      drawingContext.lineWidth = Math.max(1, spark.size * 0.7);
      drawingContext.beginPath();
      drawingContext.moveTo(spark.offsetX, spark.offsetY);
      drawingContext.lineTo(streakX, streakY);
      drawingContext.stroke();
    }
    drawingContext.restore();
  }

  // Draws the spaceman with tilt, optional tint, and thruster glow.
  draw(drawingContext, isCloaked, flashIntensity, powerupRatios) {
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    const tiltAngle = Math.max(Math.min(this.velocityY / 800, 0.35), -0.35);
    drawingContext.rotate(tiltAngle);

    if (isCloaked === true) {
      drawingContext.globalAlpha = 0.28;
    }

    if (this.spriteImage !== undefined && this.spriteImage !== null) {
      drawingContext.drawImage(this.spriteImage, -this.width * 0.5, -this.height * 0.5, this.width, this.height);
    } else {
      drawingContext.fillStyle = '#f5f7ff';
      drawingContext.fillRect(-this.width * 0.5, -this.height * 0.5, this.width, this.height);
    }

    if (this.tintColor !== undefined && this.tintColor !== 'rgba(255, 255, 255, 0)') {
      drawingContext.globalCompositeOperation = 'source-atop';
      drawingContext.fillStyle = this.tintColor;
      drawingContext.fillRect(-this.width * 0.5, -this.height * 0.5, this.width, this.height);
      drawingContext.globalCompositeOperation = 'source-over';
    }

    if (isCloaked === true) {
      // Shimmer outline to show the cloak is active.
      const time = performance.now() * 0.001;
      const sweep = Math.sin(time * 4) * this.width * 0.4;
      const shimmer = drawingContext.createLinearGradient(-this.width * 0.7 + sweep, 0, this.width * 0.7 + sweep, 0);
      shimmer.addColorStop(0, 'rgba(106, 199, 255, 0)');
      shimmer.addColorStop(0.5, 'rgba(106, 199, 255, 0.95)');
      shimmer.addColorStop(1, 'rgba(106, 199, 255, 0)');
      drawingContext.globalCompositeOperation = 'screen';
      drawingContext.globalAlpha = 0.65;
      drawingContext.strokeStyle = shimmer;
      drawingContext.lineWidth = 3;
      drawingContext.beginPath();
      drawingContext.roundRect(-this.width * 0.52, -this.height * 0.52, this.width * 1.04, this.height * 1.04, 14);
      drawingContext.stroke();
      drawingContext.globalCompositeOperation = 'source-over';
      drawingContext.globalAlpha = 1;
    }

    this.drawDamageSparks(drawingContext);

    if (flashIntensity > 0) {
      drawingContext.globalAlpha = flashIntensity;
      drawingContext.fillStyle = 'rgba(255,255,255,0.8)';
      drawingContext.beginPath();
      drawingContext.roundRect(-this.width * 0.55, -this.height * 0.55, this.width * 1.1, this.height * 1.1, 12);
      drawingContext.fill();
      drawingContext.globalAlpha = 1;
    }

    const isThrusting = this.velocityY < -60;
    if (isThrusting === true) {
      this.drawThrust(drawingContext);
    }

    this.drawPowerupIndicators(drawingContext, powerupRatios);

    drawingContext.restore();
  }

  // Draws small exhaust puffs when thrusting upward.
  drawThrust(drawingContext) {
    drawingContext.save();
    drawingContext.translate(-this.width * 0.1, this.height * 0.34);

    const time = performance.now() * 0.001;
    const thrustStrength = Math.max(0, Math.min(1.4, (-this.velocityY - 60) / 520));
    const baseLength = 16 + 18 * thrustStrength;
    const flicker = 0.12 * Math.sin(time * 24 + this.positionY * 0.01) + 0.07 * Math.sin(time * 37);
    const flameLength = baseLength * (1 + flicker);
    const flameWidth = 9 + 6 * thrustStrength;

    drawingContext.globalCompositeOperation = 'screen';

    // Outer glow.
    const glow = drawingContext.createRadialGradient(0, flameLength * 0.35, 2, 0, flameLength * 0.45, flameLength);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(0.35, 'rgba(103,244,193,0.22)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    drawingContext.fillStyle = glow;
    drawingContext.beginPath();
    drawingContext.ellipse(0, flameLength * 0.45, flameWidth * 0.95, flameLength * 0.65, 0, 0, Math.PI * 2);
    drawingContext.fill();

    // Flame core.
    const core = drawingContext.createLinearGradient(0, 0, 0, flameLength);
    core.addColorStop(0, 'rgba(255,255,255,0.92)');
    core.addColorStop(0.35, 'rgba(147,197,253,0.88)');
    core.addColorStop(0.8, 'rgba(59,130,246,0.32)');
    core.addColorStop(1, 'rgba(59,130,246,0)');
    drawingContext.fillStyle = core;
    drawingContext.beginPath();
    drawingContext.moveTo(-flameWidth * 0.35, 0);
    drawingContext.quadraticCurveTo(-flameWidth, flameLength * 0.35, 0, flameLength);
    drawingContext.quadraticCurveTo(flameWidth, flameLength * 0.35, flameWidth * 0.35, 0);
    drawingContext.closePath();
    drawingContext.fill();

    drawingContext.restore();
  }

  // Draws small progress arcs to show active powerups.
  drawPowerupIndicators(drawingContext, powerupRatios) {
    if (powerupRatios === undefined) {
      return;
    }
    const baseRadius = Math.max(this.width, this.height) * 0.75;
    const ringSpacing = 8;
    const activeEntries = Object.entries(powerupRatios).filter(([, value]) => value > 0);
    activeEntries.sort((a, b) => a[0].localeCompare(b[0]));
    activeEntries.forEach(([key, value], index) => {
      const radius = baseRadius + ringSpacing * index;
      const color = this.getPowerupColor(key);
      drawingContext.globalAlpha = 0.2;
      drawingContext.strokeStyle = 'rgba(255,255,255,0.35)';
      drawingContext.lineWidth = 2;
      drawingContext.beginPath();
      drawingContext.arc(0, 0, radius, 0, Math.PI * 2);
      drawingContext.stroke();

      drawingContext.globalAlpha = 1;
      drawingContext.strokeStyle = color;
      drawingContext.lineWidth = 3;
      drawingContext.beginPath();
      drawingContext.arc(0, 0, radius, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * value);
      drawingContext.stroke();
    });
  }

  // Maps powerup keys to indicator colors.
  getPowerupColor(key) {
    const map = {
      cloak: '#6ac7ff',
      blaster: '#ffde59',
      slow: '#b39cff',
      forceField: '#60a5fa',
      orbitalLaser: '#f472b6',
      seekerMissiles: '#a78bfa',
      missileBarrage: '#93c5fd',
      asteroidSplitter: '#67f4c1',
      multiplier: '#ff9f45',
      blackHole: '#ff6b6b',
      solarFlare: '#ffb347',
      wave: '#7ad0ff'
    };
    return map[key] ?? '#ffffff';
  }

  // Returns the player bounding box for collision tests.
  getBounds() {
    return {
      left: this.positionX - this.width * 0.5,
      top: this.positionY - this.height * 0.5,
      width: this.width,
      height: this.height
    };
  }
}

