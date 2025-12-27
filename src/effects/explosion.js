// Represents a short-lived blast effect.
export class Explosion {
  constructor(positionX, positionY) {
    this.positionX = positionX;
    this.positionY = positionY;
    this.lifeSeconds = 0.55;
    this.elapsedSeconds = 0;
    this.sparks = this.buildSparks();
  }

  // Builds a small set of sparks for extra juice (kept small for mobile perf).
  buildSparks() {
    const sparks = [];
    const count = 7 + Math.floor(Math.random() * 5);
    for (let sparkIndex = 0; sparkIndex < count; sparkIndex += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 160 + Math.random() * 340;
      const radius = 1.2 + Math.random() * 2.2;
      const lifeSeconds = 0.18 + Math.random() * 0.22;
      const tintRoll = Math.random();
      let color = 'rgba(147, 197, 253, 0.9)';
      if (tintRoll > 0.7) {
        color = 'rgba(255, 255, 255, 0.9)';
      } else if (tintRoll > 0.5) {
        color = 'rgba(103, 244, 193, 0.9)';
      }
      sparks.push({
        x: 0,
        y: 0,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        radius,
        lifeSeconds,
        color
      });
    }
    return sparks;
  }

  // Advances the explosion animation timer.
  update(deltaSeconds) {
    this.elapsedSeconds += deltaSeconds;
    for (const spark of this.sparks) {
      spark.x += spark.velocityX * deltaSeconds;
      spark.y += spark.velocityY * deltaSeconds;
    }
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
    const maxRadius = 52;
    const radius = progress * maxRadius;
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    drawingContext.globalCompositeOperation = 'screen';
    drawingContext.globalAlpha = 0.85 - progress * 0.75;

    const gradient = drawingContext.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
    gradient.addColorStop(0, 'rgba(157, 237, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(94, 167, 255, 0)');
    drawingContext.fillStyle = gradient;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, radius, 0, Math.PI * 2);
    drawingContext.fill();

    // Shockwave ring.
    const ringProgress = Math.min(this.elapsedSeconds / (this.lifeSeconds * 0.75), 1);
    const ringRadius = ringProgress * maxRadius * 1.25;
    drawingContext.globalAlpha = (1 - ringProgress) * 0.35;
    drawingContext.lineWidth = 3;
    drawingContext.strokeStyle = 'rgba(147, 197, 253, 0.85)';
    drawingContext.beginPath();
    drawingContext.arc(0, 0, ringRadius, 0, Math.PI * 2);
    drawingContext.stroke();

    // Sparks.
    for (const spark of this.sparks) {
      const sparkProgress = spark.lifeSeconds > 0 ? this.elapsedSeconds / spark.lifeSeconds : 1;
      if (sparkProgress >= 1) {
        continue;
      }
      const sparkAlpha = (1 - sparkProgress) * (1 - sparkProgress) * 0.9;
      drawingContext.globalAlpha = sparkAlpha;
      drawingContext.fillStyle = spark.color;
      drawingContext.beginPath();
      drawingContext.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
      drawingContext.fill();

      // Tiny streak.
      drawingContext.globalAlpha = sparkAlpha * 0.5;
      drawingContext.strokeStyle = spark.color;
      drawingContext.lineWidth = 2;
      drawingContext.beginPath();
      drawingContext.moveTo(spark.x, spark.y);
      drawingContext.lineTo(spark.x - spark.velocityX * 0.02, spark.y - spark.velocityY * 0.02);
      drawingContext.stroke();
    }

    drawingContext.restore();
  }
}

