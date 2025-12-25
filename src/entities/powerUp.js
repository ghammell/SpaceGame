const powerUpConfigs = {
  extraLife: { color: '#6bf178', label: '+1', durationSeconds: 0 },
  cloak: { color: '#6ac7ff', label: 'C', durationSeconds: 6 },
  blaster: { color: '#ffde59', label: 'B', durationSeconds: 9 },
  slow: { color: '#b39cff', label: 'S', durationSeconds: 7 },
  multiplier: { color: '#ff9f45', label: 'Mx', durationSeconds: 10 },
  blackHole: { color: '#3f2e5c', label: 'BH', durationSeconds: 7, isNegative: true },
  solarFlare: { color: '#ffb347', label: 'SF', durationSeconds: 7, isNegative: true },
  wave: { color: '#7ad0ff', label: 'W', durationSeconds: 8, isNegative: true }
};

// Represents a collectible power-up orb.
export class PowerUp {
  constructor(canvasWidth, canvasHeight, type, iconImage) {
    this.type = type;
    const size = 18 + Math.random() * 10;
    this.radius = size;
    this.positionX = canvasWidth + this.radius + 40;
    this.positionY = 80 + Math.random() * (canvasHeight - 160);
    this.speed = 170;
    this.config = powerUpConfigs[type];
    this.pulseTimer = 0;
    this.iconImage = iconImage;
  }

  // Advances the power-up across the screen with a gentle bob.
  update(deltaSeconds) {
    const positionDelta = this.speed * deltaSeconds;
    this.positionX -= positionDelta;
    this.pulseTimer += deltaSeconds * 3;
    const verticalBob = Math.sin(this.pulseTimer) * 12 * deltaSeconds * 10;
    this.positionY += verticalBob * 0.1;
  }

  // Indicates when the power-up has exited the screen.
  isOffScreen() {
    const offScreenThreshold = -this.radius - 40;
    if (this.positionX < offScreenThreshold) {
      return true;
    }
    return false;
  }

  // Draws the glowing orb with a label indicating the type.
  draw(drawingContext) {
    const glowRadius = this.radius * 1.6;
    drawingContext.save();
    drawingContext.translate(this.positionX, this.positionY);
    const gradient = drawingContext.createRadialGradient(0, 0, this.radius * 0.3, 0, 0, glowRadius);
    const negativeGlow = 'rgba(244, 211, 94, 0.9)';
    gradient.addColorStop(0, this.config.isNegative ? negativeGlow : this.config.color);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    drawingContext.fillStyle = gradient;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, glowRadius, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.fillStyle = '#0b1024';
    drawingContext.beginPath();
    drawingContext.arc(0, 0, this.radius, 0, Math.PI * 2);
    drawingContext.fill();

    drawingContext.strokeStyle = this.config.isNegative ? '#f4d35e' : this.config.color;
    drawingContext.lineWidth = 3;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, this.radius, 0, Math.PI * 2);
    drawingContext.stroke();

    if (this.iconImage !== undefined && this.iconImage !== null) {
      const iconSize = this.radius * 1.3;
      drawingContext.globalAlpha = this.config.isNegative ? 0.85 : 1;
      drawingContext.drawImage(this.iconImage, -iconSize * 0.5, -iconSize * 0.5, iconSize, iconSize);
      drawingContext.globalAlpha = 1;
    } else {
      drawingContext.fillStyle = this.config.isNegative ? '#ff6b6b' : this.config.color;
      drawingContext.font = 'bold 14px Inter, system-ui';
      drawingContext.textAlign = 'center';
      drawingContext.textBaseline = 'middle';
      drawingContext.fillText(this.config.label, 0, 0);
    }
    drawingContext.restore();
  }

  // Returns the bounding box for collision tests.
  getBounds() {
    return {
      left: this.positionX - this.radius,
      top: this.positionY - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }
}

// Retrieves a random power-up type with weighted odds.
export function getRandomPowerUpType() {
  const roll = Math.random();
  if (roll < 0.5) {
    const positiveWeight = Math.random();
    if (positiveWeight < 0.3) return 'extraLife';
    if (positiveWeight < 0.55) return 'cloak';
    if (positiveWeight < 0.75) return 'blaster';
    if (positiveWeight < 0.9) return 'slow';
    return 'multiplier';
  }
  const negativeWeight = Math.random();
  if (negativeWeight < 0.45) {
    return 'blackHole';
  }
  if (negativeWeight < 0.75) {
    return 'solarFlare';
  }
  return 'wave';
}

