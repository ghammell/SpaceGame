// Represents a projectile fired by the spaceman.
export class Bullet {
  constructor(startX, startY) {
    this.positionX = startX;
    this.positionY = startY;
    this.previousPositionX = startX;
    this.previousPositionY = startY;
    this.width = 14;
    this.height = 4;
    this.speed = 760;
  }

  // Advances the bullet position to the right.
  update(deltaSeconds) {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
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
    const tailX = this.previousPositionX;
    const tailY = this.previousPositionY;
    const headX = this.positionX;
    const headY = this.positionY;

    // Trail (subtle, screen blend).
    drawingContext.save();
    drawingContext.globalCompositeOperation = 'screen';
    const trailGradient = drawingContext.createLinearGradient(tailX, tailY, headX, headY);
    trailGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    trailGradient.addColorStop(0.6, 'rgba(147, 197, 253, 0.25)');
    trailGradient.addColorStop(1, 'rgba(255, 222, 89, 0.85)');
    drawingContext.strokeStyle = trailGradient;
    drawingContext.lineWidth = this.height * 2.6;
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
    drawingContext.globalAlpha = 0.25;
    drawingContext.fillStyle = 'rgba(147, 197, 253, 0.9)';
    drawingContext.beginPath();
    drawingContext.roundRect(-this.width * 0.6, -this.height * 0.9, this.width * 1.2, this.height * 1.8, 4);
    drawingContext.fill();
    drawingContext.globalAlpha = 1;

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

