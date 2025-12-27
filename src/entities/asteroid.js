// Represents a single asteroid obstacle.
export class Asteroid {
  constructor(canvasWidth, canvasHeight, baseSpeed, spriteImage, sizeScale) {
    const sizeMultiplier = sizeScale ?? 1;
    const size = (32 + Math.random() * 32) * sizeMultiplier;
    this.scale = (0.78 + Math.random() * 0.8) * sizeMultiplier;
    this.radiusX = size * this.scale;
    this.radiusY = size * (0.8 + Math.random() * 0.35) * this.scale;
    this.positionX = canvasWidth + this.radiusX + 20;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    const availableHeight = canvasHeight - this.radiusY * 2;
    this.baseY = this.radiusY + Math.random() * Math.max(availableHeight, 10);
    this.positionY = this.baseY;
    this.speed = baseSpeed + Math.random() * 150;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 1.4;
    this.spriteImage = spriteImage;
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
    const spriteWidth = this.spriteImage ? this.spriteImage.width * this.scale * sizeScale : this.radiusX * 2 * sizeScale;
    const spriteHeight = this.spriteImage ? this.spriteImage.height * this.scale * sizeScale : this.radiusY * 2 * sizeScale;
    const width = Math.max(this.radiusX * 2 * sizeScale, spriteWidth) * 0.78;
    const height = Math.max(this.radiusY * 2 * sizeScale, spriteHeight) * 0.78;
    return {
      left: this.positionX - width * 0.5,
      top: this.positionY - height * 0.5,
      width,
      height
    };
  }
}

