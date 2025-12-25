// Represents a moving star field background.
export class Starfield {
  constructor(canvasWidth, canvasHeight, starCount = 60) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.starCount = starCount;
    this.stars = [];
    this.buildStars();
  }

  // Creates the initial set of stars.
  buildStars() {
    this.stars = [];
    for (let starIndex = 0; starIndex < this.starCount; starIndex += 1) {
      const star = this.createStar(true);
      this.stars.push(star);
    }
  }

  // Generates a single star object, optionally randomizing the x position.
  createStar(randomizeX) {
    const starSize = 0.8 + Math.random() * 2.4;
    const starSpeed = 22 + Math.random() * 32;
    const starX = randomizeX === true ? Math.random() * this.canvasWidth : this.canvasWidth + Math.random() * this.canvasWidth * 0.2;
    const starY = Math.random() * this.canvasHeight;
    const starAlpha = 0.25 + Math.random() * 0.55;
    return { x: starX, y: starY, size: starSize, speed: starSpeed, alpha: starAlpha };
  }

  // Updates stored canvas sizes so stars wrap correctly.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // Advances star positions and wraps them when leaving the screen.
  update(deltaSeconds) {
    for (const star of this.stars) {
      const positionDelta = star.speed * deltaSeconds;
      star.x -= positionDelta;
      if (star.x < -star.size * 2) {
        const resetStar = this.createStar(false);
        star.x = resetStar.x;
        star.y = resetStar.y;
        star.speed = resetStar.speed;
        star.size = resetStar.size;
        star.alpha = resetStar.alpha;
      }
    }
  }

  // Draws all stars onto the provided context.
  draw(drawingContext) {
    drawingContext.save();
    for (const star of this.stars) {
      drawingContext.globalAlpha = star.alpha;
      drawingContext.fillStyle = '#ffffff';
      drawingContext.fillRect(star.x, star.y, star.size, star.size);
    }
    drawingContext.globalAlpha = 1;
    drawingContext.restore();
  }
}

