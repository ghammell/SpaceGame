// Represents a hostile alien ship that fires lasers.
export class Alien {
  constructor(canvasWidth, canvasHeight, spriteImage) {
    this.baseWidth = 64;
    this.baseHeight = 38;
    this.scale = 0.85 + Math.random() * 0.4;
    this.positionX = canvasWidth + this.baseWidth + 40;
    this.positionY = 80 + Math.random() * (canvasHeight - 160);
    this.speed = 190 + Math.random() * 60;
    this.fireCooldown = 1.6 + Math.random() * 0.8;
    this.fireTimer = 0.6;
    this.spriteImage = spriteImage;
  }

  // Updates movement and firing timer.
  update(deltaSeconds, speedScale = 1) {
    const positionDelta = this.speed * speedScale * deltaSeconds;
    this.positionX -= positionDelta;
    this.fireTimer += deltaSeconds;
  }

  // Returns true when the alien has left the screen.
  isOffScreen() {
    const offScreenThreshold = -this.width - 40;
    if (this.positionX < offScreenThreshold) {
      return true;
    }
    return false;
  }

  // Attempts to fire, returning a laser or null.
  tryFire() {
    if (this.fireTimer >= this.fireCooldown) {
      this.fireTimer = 0;
      return new Laser(this.positionX - this.baseWidth * this.scale * 0.4, this.positionY);
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
  constructor(startX, startY) {
    this.positionX = startX;
    this.positionY = startY;
    this.previousPositionX = startX;
    this.previousPositionY = startY;
    this.width = 16;
    this.height = 4;
    this.speed = 520;
  }

  // Advances the laser to the left.
  update(deltaSeconds) {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    const positionDelta = this.speed * deltaSeconds;
    this.positionX -= positionDelta;
  }

  // Returns true if the laser is off-screen.
  isOffScreen(canvasWidth) {
    const offScreenThreshold = -this.width * 2;
    if (this.positionX < offScreenThreshold) {
      return true;
    }
    if (this.positionX > canvasWidth + this.width * 2) {
      return true;
    }
    return false;
  }

  // Draws the laser bolt.
  draw(drawingContext) {
    const tailX = this.previousPositionX;
    const tailY = this.previousPositionY;
    const headX = this.positionX;
    const headY = this.positionY;

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

  // Bounding box for collisions.
  getBounds() {
    return {
      left: this.positionX - this.width * 0.5,
      top: this.positionY - this.height * 0.5,
      width: this.width,
      height: this.height
    };
  }
}

