// Represents a drifting mine hazard.
export class Mine {
  constructor(canvasWidth, canvasHeight) {
    const size = 30 + Math.random() * 18;
    this.radius = size;
    this.positionX = canvasWidth + this.radius + 30;
    this.positionY = 50 + Math.random() * (canvasHeight - 100);
    this.speed = 210 + Math.random() * 80;
    this.spin = (Math.random() - 0.5) * 2;
    this.angle = 0;
    this.scale = 1;
  }

  // Moves the mine across the screen.
  update(deltaSeconds, speedScale = 1, sizeScale = 1) {
    this.scale = sizeScale;
    const positionDelta = this.speed * speedScale * deltaSeconds;
    this.positionX -= positionDelta;
    this.angle += this.spin * deltaSeconds;
  }

  // Returns true when the mine leaves the screen.
  isOffScreen() {
    const offScreenThreshold = -this.radius - 40;
    if (this.positionX < offScreenThreshold) {
      return true;
    }
    return false;
  }

  // Draws a spiky orb.
  draw(drawingContext) {
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    drawingContext.rotate(this.angle);
    drawingContext.fillStyle = '#ff8f6b';
    for (let spike = 0; spike < 8; spike += 1) {
      const angle = (Math.PI * 2 * spike) / 8;
      const spikeLength = this.radius * 0.55 * this.scale;
      const x = Math.cos(angle) * spikeLength;
      const y = Math.sin(angle) * spikeLength;
      drawingContext.beginPath();
      drawingContext.moveTo(0, 0);
      drawingContext.lineTo(x, y);
      drawingContext.lineWidth = 5;
      drawingContext.strokeStyle = '#ffde59';
      drawingContext.stroke();
    }
    drawingContext.beginPath();
    drawingContext.arc(0, 0, this.radius * 0.65 * this.scale, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.strokeStyle = '#ffde59';
    drawingContext.lineWidth = 3;
    drawingContext.stroke();
    drawingContext.restore();
  }

  // Bounding box for collisions.
  getBounds() {
    const boxSize = this.radius * 1.1 * this.scale;
    return {
      left: this.positionX - boxSize * 0.5,
      top: this.positionY - boxSize * 0.5,
      width: boxSize,
      height: boxSize
    };
  }
}

