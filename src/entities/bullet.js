// Represents a projectile fired by the spaceman.
export class Bullet {
  constructor(startX, startY) {
    this.positionX = startX;
    this.positionY = startY;
    this.width = 14;
    this.height = 4;
    this.speed = 760;
  }

  // Advances the bullet position to the right.
  update(deltaSeconds) {
    const positionDelta = this.speed * deltaSeconds;
    this.positionX += positionDelta;
  }

  // Returns true when the bullet is no longer visible.
  isOffScreen(canvasWidth) {
    const offScreenThreshold = canvasWidth + this.width * 2;
    if (this.positionX > offScreenThreshold) {
      return true;
    }
    return false;
  }

  // Draws the bullet streak.
  draw(drawingContext) {
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    drawingContext.fillStyle = '#ffde59';
    drawingContext.beginPath();
    drawingContext.roundRect(-this.width * 0.5, -this.height * 0.5, this.width, this.height, 2);
    drawingContext.fill();
    drawingContext.fillStyle = '#ff6b6b';
    drawingContext.fillRect(2, -this.height * 0.25, this.width * 0.4, this.height * 0.5);
    drawingContext.restore();
  }

  // Returns the bullet bounding box.
  getBounds() {
    return {
      left: this.positionX - this.width * 0.5,
      top: this.positionY - this.height * 0.5,
      width: this.width,
      height: this.height
    };
  }
}

