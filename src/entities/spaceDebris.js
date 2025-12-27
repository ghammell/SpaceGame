// Represents a single piece of satellite debris spawned by the Space Debris negative powerup.
export class SpaceDebris {
  constructor(startX, startY, velocityX, spriteImage, options = {}) {
    this.positionX = startX;
    this.positionY = startY;
    this.velocityX = velocityX;

    this.spriteImage = spriteImage;

    this.size = options.size ?? 46;
    this.rotationRadians = options.rotationRadians ?? 0;
    this.rotationSpeedRadiansPerSecond = options.rotationSpeedRadiansPerSecond ?? 2.2;

    this.seed = Math.random() * 1000;
  }

  // Advances the debris piece strictly leftward (no vertical drift).
  update(deltaSeconds) {
    this.positionX += this.velocityX * deltaSeconds;
    this.rotationRadians += this.rotationSpeedRadiansPerSecond * deltaSeconds;
  }

  // Returns true when the debris piece has exited the visible playfield.
  isOffScreen(canvasWidth) {
    const margin = this.size * 1.2 + 120;
    if (this.positionX < -margin) {
      return true;
    }
    if (this.positionX > canvasWidth + margin) {
      return true;
    }
    return false;
  }

  // Draws a spinning satellite fragment.
  draw(drawingContext) {
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    drawingContext.rotate(this.rotationRadians);

    // Subtle glow (helps it read over dark background).
    drawingContext.save();
    drawingContext.globalCompositeOperation = 'screen';
    const glowRadius = this.size * 0.75;
    const glow = drawingContext.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glow.addColorStop(0, 'rgba(147, 197, 253, 0.18)');
    glow.addColorStop(1, 'rgba(147, 197, 253, 0)');
    drawingContext.fillStyle = glow;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, glowRadius, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.restore();

    if (this.spriteImage !== null && this.spriteImage !== undefined && this.spriteImage.complete === true) {
      const drawSize = this.size;
      drawingContext.drawImage(this.spriteImage, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
      drawingContext.restore();
      return;
    }

    // Fallback: simple metal shard.
    const wobble = 0.7 + 0.3 * Math.sin((performance.now() * 0.004) + this.seed);
    drawingContext.fillStyle = `rgba(156, 163, 175, ${0.85 * wobble})`;
    drawingContext.strokeStyle = 'rgba(17, 24, 39, 0.9)';
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(-this.size * 0.5, -this.size * 0.2);
    drawingContext.lineTo(this.size * 0.35, -this.size * 0.45);
    drawingContext.lineTo(this.size * 0.5, this.size * 0.1);
    drawingContext.lineTo(-this.size * 0.2, this.size * 0.5);
    drawingContext.closePath();
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.restore();
  }

  // Returns an axis-aligned bounding box for collision detection.
  getBounds() {
    return {
      left: this.positionX - this.size * 0.5,
      top: this.positionY - this.size * 0.5,
      width: this.size,
      height: this.size
    };
  }
}


