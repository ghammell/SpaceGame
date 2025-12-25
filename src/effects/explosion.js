// Represents a short-lived blast effect.
export class Explosion {
  constructor(positionX, positionY) {
    this.positionX = positionX;
    this.positionY = positionY;
    this.lifeSeconds = 0.4;
    this.elapsedSeconds = 0;
  }

  // Advances the explosion animation timer.
  update(deltaSeconds) {
    this.elapsedSeconds += deltaSeconds;
  }

  // Indicates whether the explosion has finished.
  isFinished() {
    if (this.elapsedSeconds >= this.lifeSeconds) {
      return true;
    }
    return false;
  }

  // Draws expanding rings to simulate a blast.
  draw(drawingContext) {
    const progress = Math.min(this.elapsedSeconds / this.lifeSeconds, 1);
    const maxRadius = 46;
    const radius = progress * maxRadius;
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    drawingContext.globalAlpha = 0.9 - progress * 0.8;

    const gradient = drawingContext.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
    gradient.addColorStop(0, 'rgba(157, 237, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(94, 167, 255, 0)');
    drawingContext.fillStyle = gradient;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, radius, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.restore();
  }
}

