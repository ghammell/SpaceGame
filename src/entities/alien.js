// Represents a hostile alien ship that fires lasers.
export class Alien {
  constructor(canvasWidth, canvasHeight, spriteImage, behavior = 'standard') {
    this.baseWidth = 64;
    this.baseHeight = 38;
    this.scale = 0.85 + Math.random() * 0.4;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.positionX = canvasWidth + this.baseWidth + 40;
    this.positionY = 80 + Math.random() * (canvasHeight - 160);
    this.behavior = behavior;
    this.followOffsetY = 0;
    this.followStrength = 0;
    this.followMaxSpeed = 0;

    if (this.behavior === 'tracker') {
      // Follow the player with noticeable lag so dodging the hull is feasible.
      const rawOffset = (Math.random() * 2 - 1) * 140;
      const minOffset = 60;
      this.followOffsetY = rawOffset >= 0 ? Math.max(rawOffset, minOffset) : Math.min(rawOffset, -minOffset);
      this.followStrength = 1.15;
      this.followMaxSpeed = 260;
      this.speed = 150 + Math.random() * 55;
      this.fireCooldown = 1.9 + Math.random() * 0.9;
    } else if (this.behavior === 'tailLaser') {
      this.speed = 185 + Math.random() * 55;
      this.fireCooldown = 2.4 + Math.random() * 1.0;
    } else {
      this.speed = 190 + Math.random() * 60;
      this.fireCooldown = 1.6 + Math.random() * 0.8;
    }
    this.fireTimer = 0.6;
    this.spriteImage = spriteImage;
  }

  // Updates cached canvas size.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // Updates movement and firing timer.
  update(deltaSeconds, speedScale = 1, player) {
    const positionDelta = this.speed * speedScale * deltaSeconds;
    this.positionX -= positionDelta;
    this.fireTimer += deltaSeconds;

    if (this.behavior === 'tracker' && player !== undefined && player !== null) {
      if (typeof player.positionY === 'number') {
        const minY = 70;
        const maxY = this.canvasHeight - 70;
        const targetY = Math.max(minY, Math.min(maxY, player.positionY + this.followOffsetY));
        const deltaY = targetY - this.positionY;
        const desiredMove = deltaY * this.followStrength * deltaSeconds;
        const maxMove = this.followMaxSpeed * deltaSeconds;
        const clampedMove = Math.max(-maxMove, Math.min(maxMove, desiredMove));
        this.positionY += clampedMove;
      }
    }
  }

  // Returns true when the alien has left the screen.
  isOffScreen() {
    const width = this.baseWidth * this.scale;
    const offScreenThreshold = -width - 40;
    if (this.positionX < offScreenThreshold) {
      return true;
    }
    return false;
  }

  // Attempts to fire, returning a laser or null.
  tryFire() {
    if (this.fireTimer >= this.fireCooldown) {
      this.fireTimer = 0;
      if (this.behavior === 'tailLaser') {
        const width = this.baseWidth * this.scale;
        const leftEdgeX = this.positionX - width * 0.5;
        const muzzleX = leftEdgeX - 2;
        const tailLength = 260 + Math.random() * 260;
        const tailThickness = 5 + Math.random() * 2.5;
        const durationSeconds = 0.55 + Math.random() * 0.25;
        const extendSeconds = 0.12 + Math.random() * 0.08;
        return new Laser(muzzleX, this.positionY, { tailLength, tailThickness, durationSeconds, extendSeconds, owner: this });
      }
      return new Laser(this.positionX - this.baseWidth * this.scale * 0.4, this.positionY, { owner: this });
    }
    return null;
  }

  // Draws the alien ship.
  draw(drawingContext) {
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    if (this.spriteImage !== undefined && this.spriteImage !== null) {
      const spriteWidth = this.baseWidth * this.scale;
      const spriteHeight = this.baseHeight * this.scale;
      drawingContext.drawImage(this.spriteImage, -spriteWidth * 0.5, -spriteHeight * 0.5, spriteWidth, spriteHeight);
    } else {
      drawingContext.fillStyle = '#67f4c1';
      drawingContext.beginPath();
      drawingContext.ellipse(0, 0, this.baseWidth * 0.55, this.baseHeight * 0.6, 0, 0, Math.PI * 2);
      drawingContext.fill();
    }
    drawingContext.restore();
  }

  // Bounding box for collisions.
  getBounds() {
    const width = this.baseWidth * this.scale;
    const height = this.baseHeight * this.scale;
    return {
      left: this.positionX - width * 0.5,
      top: this.positionY - height * 0.5,
      width,
      height
    };
  }
}

// Represents a laser bolt fired by an alien.
export class Laser {
  constructor(startX, startY, options = {}) {
    this.positionX = startX;
    this.positionY = startY;
    this.previousPositionX = startX;
    this.previousPositionY = startY;
    this.width = 16;
    this.height = 4;
    this.speed = 520;
    this.tailLength = typeof options.tailLength === 'number' ? Math.max(0, options.tailLength) : 0;
    this.tailThickness = typeof options.tailThickness === 'number'
      ? Math.max(4, options.tailThickness)
      : (this.tailLength > 0 ? 12 : this.height * 2.8);
    this.owner = options.owner ?? null;
    this.durationSeconds = typeof options.durationSeconds === 'number' ? Math.max(0, options.durationSeconds) : 0;
    this.extendSeconds = typeof options.extendSeconds === 'number' ? Math.max(0.01, options.extendSeconds) : 0.16;
    this.ageSeconds = 0;
  }

  // Advances the laser to the left.
  update(deltaSeconds) {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    this.ageSeconds += deltaSeconds;

    const positionDelta = this.speed * deltaSeconds;
    this.positionX -= positionDelta;
  }

  // Returns true if the laser is off-screen.
  isOffScreen(canvasWidth) {
    if (this.tailLength > 0) {
      if (this.durationSeconds > 0 && this.ageSeconds >= this.durationSeconds) {
        return true;
      }

      const offScreenThreshold = -this.width * 2;
      // For the beam bolt, `positionX` is the right-side anchor; once it's off-screen, the whole beam is gone.
      if (this.positionX < offScreenThreshold) {
        return true;
      }
      if (this.positionX > canvasWidth + this.width * 2) {
        return true;
      }
      return false;
    }

    const offScreenThreshold = -this.width * 2;
    if (this.positionX < offScreenThreshold) {
      return true;
    }
    if (this.positionX > canvasWidth + this.width * 2) {
      return true;
    }
    return false;
  }

  // Computes the currently visible beam length (grows out of the emitter).
  getVisibleBeamLength() {
    if (this.tailLength <= 0) {
      return 0;
    }
    const extendRatio = Math.min(1, this.ageSeconds / this.extendSeconds);
    return this.tailLength * extendRatio;
  }

  // Draws the laser bolt.
  draw(drawingContext) {
    const headX = this.positionX;
    const headY = this.positionY;

    if (this.tailLength > 0) {
      // Beam-bolt with long tail: grows out of the muzzle, then flies across the screen.
      const visibleLength = this.getVisibleBeamLength();
      if (visibleLength <= 1) {
        return;
      }
      const beamStartX = headX;
      const beamStartY = headY;
      const beamEndX = headX - visibleLength;
      const beamEndY = headY;

      const remainingRatio = this.durationSeconds > 0 ? Math.max(0, (this.durationSeconds - this.ageSeconds) / this.durationSeconds) : 1;
      const alpha = 0.85 * (0.65 + 0.35 * remainingRatio);

      drawingContext.save();
      drawingContext.globalCompositeOperation = 'screen';

      // Outer beam.
      drawingContext.strokeStyle = `rgba(255, 107, 107, ${alpha})`;
      drawingContext.lineWidth = this.tailThickness;
      drawingContext.lineCap = 'butt';
      drawingContext.beginPath();
      drawingContext.moveTo(beamStartX, beamStartY);
      drawingContext.lineTo(beamEndX, beamEndY);
      drawingContext.stroke();

      // Hot core.
      drawingContext.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.55})`;
      drawingContext.lineWidth = Math.max(1.2, this.tailThickness * 0.18);
      drawingContext.lineCap = 'butt';
      drawingContext.beginPath();
      drawingContext.moveTo(beamStartX, beamStartY);
      drawingContext.lineTo(beamEndX, beamEndY);
      drawingContext.stroke();

      // Leading tip sparkle.
      drawingContext.fillStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
      drawingContext.beginPath();
      drawingContext.arc(beamEndX, beamEndY, Math.max(2.2, this.tailThickness * 0.35), 0, Math.PI * 2);
      drawingContext.fill();

      drawingContext.restore();
    } else {
      const tailX = this.previousPositionX;
      const tailY = this.previousPositionY;

      // Trail (subtle, screen blend).
      drawingContext.save();
      drawingContext.globalCompositeOperation = 'screen';
      const trailGradient = drawingContext.createLinearGradient(tailX, tailY, headX, headY);
      trailGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      trailGradient.addColorStop(0.6, 'rgba(255, 107, 107, 0.25)');
      trailGradient.addColorStop(1, 'rgba(255, 107, 107, 0.9)');
      drawingContext.strokeStyle = trailGradient;
      drawingContext.lineWidth = this.height * 2.8;
      drawingContext.lineCap = 'round';
      drawingContext.beginPath();
      drawingContext.moveTo(tailX, tailY);
      drawingContext.lineTo(headX, headY);
      drawingContext.stroke();
      drawingContext.restore();
    }

    // Draw the bolt body only for the short bolt variant.
    if (this.tailLength <= 0) {
      drawingContext.save();
      drawingContext.translate(this.positionX, this.positionY);

      // Glow.
      drawingContext.globalCompositeOperation = 'screen';
      drawingContext.globalAlpha = 0.22;
      drawingContext.fillStyle = 'rgba(255, 107, 107, 0.9)';
      drawingContext.beginPath();
      drawingContext.roundRect(-this.width * 0.6, -this.height * 0.95, this.width * 1.2, this.height * 1.9, 4);
      drawingContext.fill();
      drawingContext.globalAlpha = 1;

      drawingContext.fillStyle = '#ff6b6b';
      drawingContext.beginPath();
      drawingContext.roundRect(-this.width * 0.5, -this.height * 0.5, this.width, this.height, 3);
      drawingContext.fill();
      drawingContext.fillStyle = '#ffde59';
      drawingContext.fillRect(-this.width * 0.1, -this.height * 0.25, this.width * 0.35, this.height * 0.5);
      drawingContext.restore();
    }
  }

  // Bounding box for collisions.
  getBounds() {
    if (this.tailLength > 0) {
      const visibleLength = this.getVisibleBeamLength();
      const collisionHeight = Math.max(this.height, this.tailThickness);
      return {
        left: this.positionX - visibleLength,
        top: this.positionY - collisionHeight * 0.5,
        width: visibleLength,
        height: collisionHeight
      };
    }

    return {
      left: this.positionX - this.width * 0.5,
      top: this.positionY - this.height * 0.5,
      width: this.width,
      height: this.height
    };
  }
}

