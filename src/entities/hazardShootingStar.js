// Represents a rare, foreground shooting star hazard that can hit the player.
export class HazardShootingStar {
  constructor(startX, startY, velocityX, velocityY, options = {}) {
    this.positionX = startX;
    this.positionY = startY;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.trailLength = options.trailLength ?? 520;
    this.thickness = options.thickness ?? 5;
    this.lifeSeconds = options.lifeSeconds ?? 2.2;
    this.elapsedSeconds = 0;
    this.color = options.color ?? { red: 255, green: 255, blue: 255 };
    this.glowColor = options.glowColor ?? { red: 147, green: 197, blue: 253 };
    this.seed = Math.random() * 1000;
  }

  // Returns the collision radius for the head "ball" only (trail is visual).
  getHeadRadius() {
    return this.thickness * 1.05;
  }

  // Axis-aligned bounds approximating the head only (broad-phase collision).
  getHeadBounds() {
    const radius = this.getHeadRadius();
    return {
      left: this.positionX - radius,
      top: this.positionY - radius,
      width: radius * 2,
      height: radius * 2
    };
  }

  getDirection() {
    const magnitude = Math.hypot(this.velocityX, this.velocityY);
    if (magnitude <= 0) {
      return { x: -1, y: 0 };
    }
    return { x: this.velocityX / magnitude, y: this.velocityY / magnitude };
  }

  getTailPoint() {
    const direction = this.getDirection();
    // Trail extends behind the head, opposite velocity direction.
    const tailX = this.positionX - direction.x * this.trailLength;
    const tailY = this.positionY - direction.y * this.trailLength;
    return { x: tailX, y: tailY };
  }

  update(deltaSeconds) {
    this.elapsedSeconds += deltaSeconds;
    this.positionX += this.velocityX * deltaSeconds;
    this.positionY += this.velocityY * deltaSeconds;
  }

  isExpired() {
    return this.elapsedSeconds >= this.lifeSeconds;
  }

  isOffScreen(canvasWidth, canvasHeight) {
    const tail = this.getTailPoint();
    const margin = this.trailLength + 80;
    const left = Math.min(this.positionX, tail.x) - margin;
    const right = Math.max(this.positionX, tail.x) + margin;
    const top = Math.min(this.positionY, tail.y) - margin;
    const bottom = Math.max(this.positionY, tail.y) + margin;
    if (right < 0) return true;
    if (left > canvasWidth) return true;
    if (bottom < 0) return true;
    if (top > canvasHeight) return true;
    return false;
  }

  // Axis-aligned bounds approximating the entire streak (head + trail).
  getBounds() {
    const tail = this.getTailPoint();
    const pad = this.thickness * 1.6;
    const left = Math.min(this.positionX, tail.x) - pad;
    const top = Math.min(this.positionY, tail.y) - pad;
    const right = Math.max(this.positionX, tail.x) + pad;
    const bottom = Math.max(this.positionY, tail.y) + pad;
    return { left, top, width: right - left, height: bottom - top };
  }

  draw(drawingContext) {
    const direction = this.getDirection();
    // Actual tail point (behind the head).
    const tailX = this.positionX - direction.x * this.trailLength;
    const tailY = this.positionY - direction.y * this.trailLength;

    const color = this.color;
    const glow = this.glowColor;
    const progress = Math.max(0, Math.min(1, this.elapsedSeconds / this.lifeSeconds));
    const flicker = 0.92 + 0.08 * Math.sin((this.elapsedSeconds * 28) + this.seed);
    const fade = Math.max(0, (1 - progress) * flicker);

    drawingContext.save();
    drawingContext.globalCompositeOperation = 'screen';

    // Outer glow trail.
    const outerGradient = drawingContext.createLinearGradient(this.positionX, this.positionY, tailX, tailY);
    outerGradient.addColorStop(0, `rgba(${glow.red}, ${glow.green}, ${glow.blue}, ${0.65 * fade})`);
    outerGradient.addColorStop(1, `rgba(${glow.red}, ${glow.green}, ${glow.blue}, 0)`);
    drawingContext.strokeStyle = outerGradient;
    drawingContext.lineWidth = this.thickness * 2.6;
    drawingContext.lineCap = 'round';
    drawingContext.beginPath();
    drawingContext.moveTo(this.positionX, this.positionY);
    drawingContext.lineTo(tailX, tailY);
    drawingContext.stroke();

    // Inner hot trail.
    const innerGradient = drawingContext.createLinearGradient(this.positionX, this.positionY, tailX, tailY);
    innerGradient.addColorStop(0, `rgba(255, 255, 255, ${0.92 * fade})`);
    innerGradient.addColorStop(0.18, `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.7 * fade})`);
    innerGradient.addColorStop(0.45, `rgba(255, 179, 71, ${0.45 * fade})`);
    innerGradient.addColorStop(0.75, `rgba(255, 107, 107, ${0.25 * fade})`);
    innerGradient.addColorStop(1, `rgba(255, 107, 107, 0)`);
    drawingContext.strokeStyle = innerGradient;
    drawingContext.lineWidth = this.thickness;
    drawingContext.beginPath();
    drawingContext.moveTo(this.positionX, this.positionY);
    drawingContext.lineTo(tailX, tailY);
    drawingContext.stroke();

    // Ember sparks near the head (small and cheap).
    const perpX = -direction.y;
    const perpY = direction.x;
    const sparkCount = 4;
    for (let sparkIndex = 0; sparkIndex < sparkCount; sparkIndex += 1) {
      const t = (sparkIndex + 1) / (sparkCount + 2);
      const along = t * this.trailLength * 0.22;
      const wobble = Math.sin(this.seed + this.elapsedSeconds * 18 + sparkIndex) * (6 + this.thickness * 0.6);
      const sparkX = this.positionX - direction.x * along + perpX * wobble;
      const sparkY = this.positionY - direction.y * along + perpY * wobble;
      const radiusNoise = 0.85 + 0.25 * (0.5 + 0.5 * Math.sin(this.seed * 1.7 + sparkIndex * 11.3));
      const radius = (1.2 + sparkIndex * 0.25) * radiusNoise;
      drawingContext.globalAlpha = 0.25 * fade;
      drawingContext.fillStyle = 'rgba(255, 107, 107, 0.95)';
      drawingContext.beginPath();
      drawingContext.arc(sparkX, sparkY, radius, 0, Math.PI * 2);
      drawingContext.fill();
      drawingContext.globalAlpha = 0.18 * fade;
      drawingContext.fillStyle = 'rgba(255, 179, 71, 0.95)';
      drawingContext.beginPath();
      drawingContext.arc(sparkX + 2, sparkY + 1, radius * 0.75, 0, Math.PI * 2);
      drawingContext.fill();
    }

    // Head glow + core.
    drawingContext.globalAlpha = 0.9 * fade;
    drawingContext.fillStyle = `rgba(${glow.red}, ${glow.green}, ${glow.blue}, 0.55)`;
    drawingContext.beginPath();
    drawingContext.arc(this.positionX, this.positionY, this.thickness * 2.6, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.globalAlpha = 1;
    drawingContext.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.98 * fade})`;
    drawingContext.beginPath();
    drawingContext.arc(this.positionX, this.positionY, this.thickness * 1.05, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.restore();
  }
}


