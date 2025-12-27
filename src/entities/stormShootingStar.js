// Represents a friendly shooting star used by the Star Storm powerup.
export class StormShootingStar {
  constructor(startX, startY, velocityX, velocityY, options = {}) {
    this.positionX = startX;
    this.positionY = startY;
    this.velocityX = velocityX;
    this.velocityY = velocityY;

    this.trailLength = options.trailLength ?? 460;
    this.thickness = options.thickness ?? 4;
    this.lifeSeconds = options.lifeSeconds ?? 1.8;
    this.elapsedSeconds = 0;

    this.color = options.color ?? { red: 255, green: 255, blue: 255 };
    this.glowColor = options.glowColor ?? { red: 255, green: 179, blue: 71 };
    this.seed = Math.random() * 1000;
  }

  // Returns a normalized direction for the streak.
  getDirection() {
    const magnitude = Math.hypot(this.velocityX, this.velocityY);
    if (magnitude <= 0) {
      return { x: 1, y: 0 };
    }
    return { x: this.velocityX / magnitude, y: this.velocityY / magnitude };
  }

  // Returns the tail point (behind the head).
  getTailPoint() {
    const direction = this.getDirection();
    const tailX = this.positionX - direction.x * this.trailLength;
    const tailY = this.positionY - direction.y * this.trailLength;
    return { x: tailX, y: tailY };
  }

  // Returns the collision radius for the head only (trail is visual).
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

  // Advances position and lifetime.
  update(deltaSeconds) {
    this.elapsedSeconds += deltaSeconds;
    this.positionX += this.velocityX * deltaSeconds;
    this.positionY += this.velocityY * deltaSeconds;
  }

  // Returns true if this streak has completed its lifetime.
  isExpired() {
    if (this.elapsedSeconds >= this.lifeSeconds) {
      return true;
    }
    return false;
  }

  // Returns true if this streak is completely off-screen.
  isOffScreen(canvasWidth, canvasHeight) {
    const tail = this.getTailPoint();
    const margin = this.trailLength + 80;
    const left = Math.min(this.positionX, tail.x) - margin;
    const right = Math.max(this.positionX, tail.x) + margin;
    const top = Math.min(this.positionY, tail.y) - margin;
    const bottom = Math.max(this.positionY, tail.y) + margin;
    if (right < 0) {
      return true;
    }
    if (left > canvasWidth) {
      return true;
    }
    if (bottom < 0) {
      return true;
    }
    if (top > canvasHeight) {
      return true;
    }
    return false;
  }

  // Draws a lightweight star streak (kept simple for performance).
  draw(drawingContext) {
    const direction = this.getDirection();
    const tailX = this.positionX - direction.x * this.trailLength;
    const tailY = this.positionY - direction.y * this.trailLength;

    const progress = Math.max(0, Math.min(1, this.elapsedSeconds / this.lifeSeconds));
    const flicker = 0.9 + 0.1 * Math.sin((this.elapsedSeconds * 22) + this.seed);
    const fade = Math.max(0, (1 - progress) * flicker);

    const color = this.color;
    const glow = this.glowColor;

    drawingContext.save();
    drawingContext.globalCompositeOperation = 'screen';

    // Outer glow trail.
    const outerGradient = drawingContext.createLinearGradient(this.positionX, this.positionY, tailX, tailY);
    outerGradient.addColorStop(0, `rgba(${glow.red}, ${glow.green}, ${glow.blue}, ${0.55 * fade})`);
    outerGradient.addColorStop(1, `rgba(${glow.red}, ${glow.green}, ${glow.blue}, 0)`);
    drawingContext.strokeStyle = outerGradient;
    drawingContext.lineWidth = this.thickness * 2.4;
    drawingContext.lineCap = 'round';
    drawingContext.beginPath();
    drawingContext.moveTo(this.positionX, this.positionY);
    drawingContext.lineTo(tailX, tailY);
    drawingContext.stroke();

    // Inner hot trail.
    const innerGradient = drawingContext.createLinearGradient(this.positionX, this.positionY, tailX, tailY);
    innerGradient.addColorStop(0, `rgba(255, 255, 255, ${0.85 * fade})`);
    innerGradient.addColorStop(0.25, `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.65 * fade})`);
    innerGradient.addColorStop(1, `rgba(255, 107, 107, 0)`);
    drawingContext.strokeStyle = innerGradient;
    drawingContext.lineWidth = this.thickness;
    drawingContext.beginPath();
    drawingContext.moveTo(this.positionX, this.positionY);
    drawingContext.lineTo(tailX, tailY);
    drawingContext.stroke();

    // Head glow + core.
    drawingContext.globalAlpha = 0.75 * fade;
    drawingContext.fillStyle = `rgba(${glow.red}, ${glow.green}, ${glow.blue}, 0.55)`;
    drawingContext.beginPath();
    drawingContext.arc(this.positionX, this.positionY, this.thickness * 2.4, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.globalAlpha = 1;
    drawingContext.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.95 * fade})`;
    drawingContext.beginPath();
    drawingContext.arc(this.positionX, this.positionY, this.thickness * 1.05, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.restore();
  }
}



