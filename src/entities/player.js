// Represents the controllable spaceman with physics.
export class Player {
  constructor(canvasWidth, canvasHeight, spriteImage) {
    this.width = 44;
    this.height = 58;
    this.gravityStrength = 1400;
    this.jumpStrength = 520;
    this.horizontalSpeed = 560;
    this.velocityX = 0;
    this.positionX = 0;
    this.positionY = 0;
    this.velocityY = 0;
    this.spriteImage = spriteImage;
    this.tintColor = 'rgba(255, 255, 255, 0)';
    this.setCanvasSize(canvasWidth, canvasHeight);
    this.reset(canvasHeight * 0.5);
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

    return touchedBoundary;
  }

  // Updates suit tint based on remaining lives.
  setAppearanceByLives(livesRemaining) {
    if (livesRemaining >= 3) {
      this.tintColor = 'rgba(255, 255, 255, 0)';
      return;
    }

    if (livesRemaining === 2) {
      this.tintColor = 'rgba(255, 189, 74, 0.35)';
      return;
    }

    this.tintColor = 'rgba(255, 107, 107, 0.45)';
  }

  // Draws the spaceman with tilt, optional tint, and thruster glow.
  draw(drawingContext, isCloaked, flashIntensity, powerupRatios) {
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    const tiltAngle = Math.max(Math.min(this.velocityY / 800, 0.35), -0.35);
    drawingContext.rotate(tiltAngle);

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

    drawingContext.globalAlpha = 0.55;
    drawingContext.fillStyle = '#ffb454';
    drawingContext.beginPath();
    drawingContext.moveTo(-this.width * 0.55, this.height * 0.1);
    drawingContext.lineTo(-this.width * 0.9, this.height * 0.25);
    drawingContext.lineTo(-this.width * 0.55, this.height * 0.35);
    drawingContext.closePath();
    drawingContext.fill();
    drawingContext.globalAlpha = 1;

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
    drawingContext.translate(0, this.height * 0.35);
    const puffCount = 3;
    for (let puffIndex = 0; puffIndex < puffCount; puffIndex += 1) {
      const offsetX = (-6 + Math.random() * 12);
      const offsetY = 10 + Math.random() * 12;
      const size = 4 + Math.random() * 6;
      drawingContext.fillStyle = 'rgba(255,255,255,0.8)';
      drawingContext.beginPath();
      drawingContext.arc(offsetX, offsetY, size, 0, Math.PI * 2);
      drawingContext.fill();
      drawingContext.fillStyle = 'rgba(120,200,255,0.7)';
      drawingContext.beginPath();
      drawingContext.arc(offsetX + 2, offsetY + 2, size * 0.6, 0, Math.PI * 2);
      drawingContext.fill();
    }
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

