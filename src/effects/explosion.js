// Represents a short-lived blast effect.
export class Explosion {
  constructor(positionX, positionY, options = {}) {
    this.positionX = positionX;
    this.positionY = positionY;
    this.kind = options?.kind ?? 'normal';
    this.lifeSeconds = this.kind === 'meteor' ? (options.lifeSeconds ?? 0.85) : (options.lifeSeconds ?? 0.55);
    this.maxRadius = this.kind === 'meteor' ? (options.maxRadius ?? 120) : (options.maxRadius ?? 52);
    this.ringLineWidth = this.kind === 'meteor' ? (options.ringLineWidth ?? 6) : (options.ringLineWidth ?? 3);
    this.ringAlpha = this.kind === 'meteor' ? (options.ringAlpha ?? 0.55) : (options.ringAlpha ?? 0.35);
    this.coreColor = options.coreColor ?? (this.kind === 'meteor' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(157, 237, 255, 0.9)');
    this.edgeColor = options.edgeColor ?? (this.kind === 'meteor' ? 'rgba(96, 165, 250, 0)' : 'rgba(94, 167, 255, 0)');
    this.ringColor = options.ringColor ?? (this.kind === 'meteor' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(147, 197, 253, 0.85)');
    this.elapsedSeconds = 0;
    this.sparkConfig = this.kind === 'meteor'
      ? {
        countMin: 18,
        countMax: 28,
        speedMin: 260,
        speedMax: 820,
        radiusMin: 1.4,
        radiusMax: 3.8,
        lifeMin: 0.22,
        lifeMax: 0.55,
        colors: [
          'rgba(255, 255, 255, 0.95)',
          'rgba(157, 237, 255, 0.95)',
          'rgba(147, 197, 253, 0.9)',
          'rgba(255, 107, 107, 0.85)'
        ]
      }
      : {
        countMin: 7,
        countMax: 11,
        speedMin: 160,
        speedMax: 500,
        radiusMin: 1.2,
        radiusMax: 3.4,
        lifeMin: 0.18,
        lifeMax: 0.4,
        colors: [
          'rgba(147, 197, 253, 0.9)',
          'rgba(255, 255, 255, 0.9)',
          'rgba(103, 244, 193, 0.9)'
        ]
      };
    this.sparks = this.buildSparks(this.sparkConfig);
  }

  // Builds a small set of sparks for extra juice (kept small for mobile perf).
  buildSparks(config) {
    const sparkConfig = config ?? this.sparkConfig;
    const sparks = [];
    const countMin = sparkConfig?.countMin ?? 7;
    const countMax = sparkConfig?.countMax ?? 11;
    const count = countMin + Math.floor(Math.random() * (countMax - countMin + 1));
    const speedMin = sparkConfig?.speedMin ?? 160;
    const speedMax = sparkConfig?.speedMax ?? 500;
    const radiusMin = sparkConfig?.radiusMin ?? 1.2;
    const radiusMax = sparkConfig?.radiusMax ?? 3.4;
    const lifeMin = sparkConfig?.lifeMin ?? 0.18;
    const lifeMax = sparkConfig?.lifeMax ?? 0.4;
    const colors = Array.isArray(sparkConfig?.colors) === true && sparkConfig.colors.length > 0
      ? sparkConfig.colors
      : ['rgba(147, 197, 253, 0.9)'];
    for (let sparkIndex = 0; sparkIndex < count; sparkIndex += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
      const lifeSeconds = lifeMin + Math.random() * (lifeMax - lifeMin);
      const color = colors[Math.floor(Math.random() * colors.length)];
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
    const maxRadius = this.maxRadius;
    const radius = progress * maxRadius;
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    drawingContext.globalCompositeOperation = 'screen';
    drawingContext.globalAlpha = (this.kind === 'meteor' ? 0.95 : 0.85) - progress * (this.kind === 'meteor' ? 0.82 : 0.75);

    const gradient = drawingContext.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
    gradient.addColorStop(0, this.coreColor);
    gradient.addColorStop(1, this.edgeColor);
    drawingContext.fillStyle = gradient;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, radius, 0, Math.PI * 2);
    drawingContext.fill();

    // Shockwave ring.
    const ringProgress = Math.min(this.elapsedSeconds / (this.lifeSeconds * 0.75), 1);
    const ringRadius = ringProgress * maxRadius * 1.25;
    drawingContext.globalAlpha = (1 - ringProgress) * this.ringAlpha;
    drawingContext.lineWidth = this.ringLineWidth;
    drawingContext.strokeStyle = this.ringColor;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, ringRadius, 0, Math.PI * 2);
    drawingContext.stroke();

    if (this.kind === 'meteor') {
      // Extra inner ring for a punchier impact.
      const innerRingRadius = ringRadius * 0.6;
      drawingContext.globalAlpha = (1 - ringProgress) * (this.ringAlpha * 0.55);
      drawingContext.lineWidth = Math.max(2, this.ringLineWidth * 0.55);
      drawingContext.strokeStyle = 'rgba(157, 237, 255, 0.95)';
      drawingContext.beginPath();
      drawingContext.arc(0, 0, innerRingRadius, 0, Math.PI * 2);
      drawingContext.stroke();
    }

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

