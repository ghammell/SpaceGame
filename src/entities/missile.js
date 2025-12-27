// Represents a homing missile launched by the player.
export class Missile {
  constructor(startX, startY, target) {
    this.positionX = startX;
    this.positionY = startY;
    this.previousPositionX = startX;
    this.previousPositionY = startY;
    this.target = target;

    this.speed = 1600;
    this.lifeSeconds = 2.2;
    this.elapsedSeconds = 0;
    this.hitRadius = 18;

    this.velocityX = this.speed;
    this.velocityY = 0;
    this.hasDetonated = false;
  }

  // Gets the current target center point (best-effort).
  getTargetPoint() {
    if (this.target === null || this.target === undefined) {
      return null;
    }
    if (typeof this.target.getBounds === 'function') {
      const bounds = this.target.getBounds();
      return { x: bounds.left + bounds.width * 0.5, y: bounds.top + bounds.height * 0.5 };
    }
    if (typeof this.target.positionX === 'number' && typeof this.target.positionY === 'number') {
      return { x: this.target.positionX, y: this.target.positionY };
    }
    return null;
  }

  // Advances the missile and arms detonation when close to the target.
  update(deltaSeconds) {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    this.elapsedSeconds += deltaSeconds;

    if (this.hasDetonated === true) {
      return;
    }

    const targetPoint = this.getTargetPoint();
    if (targetPoint !== null) {
      const dx = targetPoint.x - this.positionX;
      const dy = targetPoint.y - this.positionY;
      const dist = Math.hypot(dx, dy);
      if (dist <= this.hitRadius) {
        this.hasDetonated = true;
        return;
      }
      const invDist = dist > 0 ? 1 / dist : 0;
      const dirX = dx * invDist;
      const dirY = dy * invDist;

      // Very small wobble so the flight feels alive.
      const wobble = Math.sin(this.elapsedSeconds * 16) * 0.06;
      const wobbleX = dirX - dirY * wobble;
      const wobbleY = dirY + dirX * wobble;
      const wobbleLen = Math.hypot(wobbleX, wobbleY) || 1;
      const finalDirX = wobbleX / wobbleLen;
      const finalDirY = wobbleY / wobbleLen;

      this.velocityX = finalDirX * this.speed;
      this.velocityY = finalDirY * this.speed;
    }

    this.positionX += this.velocityX * deltaSeconds;
    this.positionY += this.velocityY * deltaSeconds;

    if (this.elapsedSeconds >= this.lifeSeconds) {
      this.hasDetonated = true;
    }
  }

  // True when the missile should be removed.
  isFinished() {
    return this.hasDetonated === true;
  }

  // Draws the missile + trail.
  draw(drawingContext) {
    const tailX = this.previousPositionX;
    const tailY = this.previousPositionY;
    const headX = this.positionX;
    const headY = this.positionY;

    // Trail (screen blend).
    drawingContext.save();
    drawingContext.globalCompositeOperation = 'screen';
    const trail = drawingContext.createLinearGradient(tailX, tailY, headX, headY);
    trail.addColorStop(0, 'rgba(255,255,255,0)');
    trail.addColorStop(0.6, 'rgba(147,197,253,0.22)');
    trail.addColorStop(1, 'rgba(96,165,250,0.85)');
    drawingContext.strokeStyle = trail;
    drawingContext.lineWidth = 6;
    drawingContext.lineCap = 'round';
    drawingContext.beginPath();
    drawingContext.moveTo(tailX, tailY);
    drawingContext.lineTo(headX, headY);
    drawingContext.stroke();
    drawingContext.restore();

    const angle = Math.atan2(this.velocityY, this.velocityX);
    drawingContext.save();
    drawingContext.translate(headX, headY);
    drawingContext.rotate(angle);

    // Soft glow.
    drawingContext.globalCompositeOperation = 'screen';
    drawingContext.globalAlpha = 0.22;
    drawingContext.fillStyle = 'rgba(147,197,253,0.9)';
    drawingContext.beginPath();
    drawingContext.ellipse(-2, 0, 14, 8, 0, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.globalAlpha = 1;

    // Body.
    drawingContext.fillStyle = '#e6f0ff';
    drawingContext.strokeStyle = '#60a5fa';
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.roundRect(-10, -4, 18, 8, 4);
    drawingContext.fill();
    drawingContext.stroke();

    // Nose.
    drawingContext.fillStyle = '#93c5fd';
    drawingContext.beginPath();
    drawingContext.moveTo(8, 0);
    drawingContext.lineTo(16, -3);
    drawingContext.lineTo(16, 3);
    drawingContext.closePath();
    drawingContext.fill();

    // Fins.
    drawingContext.fillStyle = '#60a5fa';
    drawingContext.beginPath();
    drawingContext.moveTo(-4, -4);
    drawingContext.lineTo(-8, -8);
    drawingContext.lineTo(-6, -3);
    drawingContext.closePath();
    drawingContext.fill();
    drawingContext.beginPath();
    drawingContext.moveTo(-4, 4);
    drawingContext.lineTo(-8, 8);
    drawingContext.lineTo(-6, 3);
    drawingContext.closePath();
    drawingContext.fill();

    // Exhaust.
    drawingContext.globalAlpha = 0.65;
    drawingContext.fillStyle = '#67f4c1';
    drawingContext.beginPath();
    drawingContext.ellipse(-12, 0, 6, 3, 0, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.globalAlpha = 1;

    drawingContext.restore();
  }
}


