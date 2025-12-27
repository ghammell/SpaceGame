// Represents a single asteroid obstacle.
export class Asteroid {
  constructor(canvasWidth, canvasHeight, baseSpeed, spriteImage, sizeScale) {
    const sizeMultiplier = sizeScale ?? 1;
    // The asteroid's `scale` controls how large its SVG sprite is drawn. Note: we intentionally apply
    // `sizeMultiplier` only once here to avoid "squared" scaling that can inflate collision bounds.
    this.scale = (0.78 + Math.random() * 0.8) * sizeMultiplier;
    this.spriteImage = spriteImage;

    // Use the actual sprite dimensions to derive radii so hitboxes track the visible art.
    // This is especially important for large asteroids (difficulty ramp / solar flare), where overly
    // large AABBs can cause "gap hits" even when the sprites don't visually touch.
    const fallbackSpriteWidth = 96;
    const fallbackSpriteHeight = 96;
    const spriteWidth = this.spriteImage !== null && this.spriteImage !== undefined ? this.spriteImage.width : fallbackSpriteWidth;
    const spriteHeight = this.spriteImage !== null && this.spriteImage !== undefined ? this.spriteImage.height : fallbackSpriteHeight;
    this.radiusX = spriteWidth * this.scale * 0.5;
    this.radiusY = spriteHeight * this.scale * 0.5;
    this.positionX = canvasWidth + this.radiusX + 20;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    const availableHeight = canvasHeight - this.radiusY * 2;
    this.baseY = this.radiusY + Math.random() * Math.max(availableHeight, 10);
    this.positionY = this.baseY;
    this.speed = baseSpeed + Math.random() * 150;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 1.4;
    this.oscPhase = Math.random() * Math.PI * 2;
    this.oscSpeed = 0.8 + Math.random() * 0.6;
    this.velocityY = 0;
  }

  // Updates cached canvas size.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // Updates asteroid position and rotation.
  update(deltaSeconds, speedScale, sizeScale, waveSettings) {
    this.activeSizeScale = sizeScale;
    const effectiveSpeed = this.speed * speedScale;
    const positionDeltaX = effectiveSpeed * deltaSeconds;
    this.positionX -= positionDeltaX;
    const rotationDelta = this.rotationSpeed * deltaSeconds;
    this.rotation += rotationDelta;

    if (typeof this.velocityY === 'number' && this.velocityY !== 0) {
      const positionDeltaY = this.velocityY * deltaSeconds;
      this.baseY += positionDeltaY;
    }

    if (waveSettings !== undefined && waveSettings.amplitude > 0) {
      this.oscPhase += this.oscSpeed * waveSettings.speed * deltaSeconds;
      const waveOffset = Math.sin(this.oscPhase) * waveSettings.amplitude;
      this.positionY = this.baseY + waveOffset;
    } else {
      this.positionY = this.baseY;
    }
  }

  // Renders the asteroid.
  draw(drawingContext) {
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    drawingContext.rotate(this.rotation);

    if (this.spriteImage !== undefined && this.spriteImage !== null) {
      const finalScale = this.scale * (this.activeSizeScale ?? 1);
      const spriteWidth = this.spriteImage.width * finalScale;
      const spriteHeight = this.spriteImage.height * finalScale;
      drawingContext.drawImage(this.spriteImage, -spriteWidth * 0.5, -spriteHeight * 0.5, spriteWidth, spriteHeight);
    }

    drawingContext.restore();
  }

  // Indicates whether the asteroid has left the screen.
  isOffScreen() {
    const sizeScale = this.activeSizeScale ?? 1;
    const offScreenThreshold = -this.radiusX * sizeScale - 30;
    if (this.positionX < offScreenThreshold) {
      return true;
    }

    // If an asteroid drifts vertically out of view (e.g. splitter fragments), allow it to naturally exit.
    const canvasHeight = this.canvasHeight ?? 0;
    if (canvasHeight > 0) {
      const verticalPadding = this.radiusY * sizeScale + 80;
      if (this.positionY < -verticalPadding) {
        return true;
      }
      if (this.positionY > canvasHeight + verticalPadding) {
        return true;
      }
    }
    return false;
  }

  // Returns the asteroid bounding box for collision tests.
  getBounds() {
    const sizeScale = this.activeSizeScale ?? 1;
    const width = this.radiusX * 2 * sizeScale * 0.78;
    const height = this.radiusY * 2 * sizeScale * 0.78;
    return {
      left: this.positionX - width * 0.5,
      top: this.positionY - height * 0.5,
      width,
      height
    };
  }
}

