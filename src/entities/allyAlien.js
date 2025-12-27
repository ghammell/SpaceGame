import { Bullet } from './bullet.js';

// Represents a friendly wingman alien that flies alongside the player and auto-fires.
export class AllyAlien {
  constructor(canvasWidth, canvasHeight, spriteImage) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.spriteImage = spriteImage;

    this.baseWidth = 62;
    this.baseHeight = 36;
    this.scale = 0.78;

    // Spawn off-screen to the left so it "flies in" when activated.
    const spawnOffset = this.baseWidth * this.scale + 60;
    this.positionX = -spawnOffset;
    this.positionY = canvasHeight * 0.5;

    this.followRate = 6.5;
    this.targetOffsetX = -86;
    this.targetOffsetY = 0;
    this.wobbleSeed = Math.random() * 1000;

    this.fireCooldownSeconds = 0.28;
    this.fireTimerSeconds = 0;
    this.lastDesiredY = this.positionY;
  }

  // Updates cached canvas size.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // Advances movement toward the player and a target aim line.
  update(deltaSeconds, player, targetPositionY) {
    if (player === null || player === undefined) {
      return;
    }

    const minY = 70;
    const maxY = this.canvasHeight - 70;

    let desiredX = player.positionX + this.targetOffsetX;
    let desiredY = player.positionY + this.targetOffsetY;
    if (typeof targetPositionY === 'number') {
      desiredY = targetPositionY;
    }

    const timeSeconds = performance.now() * 0.001;
    const wobble = Math.sin((timeSeconds * 2.8) + this.wobbleSeed) * 14;
    desiredY += wobble;

    if (desiredX < 44) {
      desiredX = 44;
    }
    desiredY = Math.max(minY, Math.min(maxY, desiredY));

    const blend = Math.min(1, this.followRate * deltaSeconds);
    this.positionX += (desiredX - this.positionX) * blend;
    this.positionY += (desiredY - this.positionY) * blend;
    this.lastDesiredY = desiredY;

    this.fireTimerSeconds += deltaSeconds;
  }

  // Attempts to fire a bullet; returns the bullet or null if still cooling down.
  tryFire() {
    if (this.fireTimerSeconds < this.fireCooldownSeconds) {
      return null;
    }

    this.fireTimerSeconds = 0;
    const spriteWidth = this.baseWidth * this.scale;
    const spawnX = this.positionX + spriteWidth * 0.55;
    const spawnY = this.positionY;
    return new Bullet(spawnX, spawnY);
  }

  // Draws the ally ship with a friendly thruster glow.
  draw(drawingContext) {
    const spriteWidth = this.baseWidth * this.scale;
    const spriteHeight = this.baseHeight * this.scale;

    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);

    // Rear thruster glow (blue/purple).
    drawingContext.save();
    drawingContext.globalCompositeOperation = 'screen';
    const glow = drawingContext.createRadialGradient(-spriteWidth * 0.55, 0, 2, -spriteWidth * 0.55, 0, spriteWidth * 0.55);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    glow.addColorStop(0.25, 'rgba(147, 197, 253, 0.35)');
    glow.addColorStop(1, 'rgba(147, 197, 253, 0)');
    drawingContext.fillStyle = glow;
    drawingContext.beginPath();
    drawingContext.ellipse(-spriteWidth * 0.55, 0, spriteWidth * 0.5, spriteHeight * 0.6, 0, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.restore();

    if (this.spriteImage !== undefined && this.spriteImage !== null) {
      drawingContext.drawImage(this.spriteImage, -spriteWidth * 0.5, -spriteHeight * 0.5, spriteWidth, spriteHeight);
    } else {
      drawingContext.fillStyle = '#93c5fd';
      drawingContext.beginPath();
      drawingContext.ellipse(0, 0, spriteWidth * 0.55, spriteHeight * 0.6, 0, 0, Math.PI * 2);
      drawingContext.fill();
    }

    // Friendly highlight.
    drawingContext.save();
    drawingContext.globalCompositeOperation = 'screen';
    drawingContext.globalAlpha = 0.18;
    drawingContext.fillStyle = '#67f4c1';
    drawingContext.beginPath();
    drawingContext.ellipse(0, -spriteHeight * 0.12, spriteWidth * 0.45, spriteHeight * 0.35, 0, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.restore();

    drawingContext.restore();
  }

  // Returns a bounding box for optional collision checks.
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



