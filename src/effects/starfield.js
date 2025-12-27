// Represents a moving star field background.
export class Starfield {
  constructor(canvasWidth, canvasHeight, starCount = 160) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.starCount = starCount;
    this.stars = [];
    this.nebulaBlobs = [];
    this.planets = [];
    this.shootingStars = [];
    this.dustMotes = [];
    this.timeSeconds = 0;
    this.nextPlanetSpawnSeconds = 0;
    this.nextShootingStarSpawnSeconds = 0;
    this.buildStars();
    this.buildNebula();
    this.buildDustMotes();
    this.resetPlanetSpawner();
    this.resetShootingStarSpawner();
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
    const depth = 0.15 + Math.random() * 0.95;
    const radius = 0.6 + depth * (0.7 + Math.random() * 2.1);
    const baseSpeed = 14 + Math.random() * 44;
    const speed = baseSpeed * (0.35 + depth);
    const positionX = randomizeX === true ? Math.random() * this.canvasWidth : this.canvasWidth + Math.random() * this.canvasWidth * 0.25;
    const positionY = Math.random() * this.canvasHeight;
    const baseAlpha = 0.08 + Math.random() * 0.55;
    const twinkleSpeed = 0.6 + Math.random() * 2.2;
    const twinklePhase = Math.random() * Math.PI * 2;
    const twinkleAmplitude = 0.08 + Math.random() * 0.18;
    let hasGlow = false;
    if (radius > 1.2) {
      if (Math.random() < 0.14) {
        hasGlow = true;
      }
    }
    const color = this.pickStarColor();
    return { positionX, positionY, radius, speed, baseAlpha, twinkleSpeed, twinklePhase, twinkleAmplitude, hasGlow, color, depth };
  }

  // Picks a subtle star tint color.
  pickStarColor() {
    const roll = Math.random();
    if (roll < 0.72) {
      return '#ffffff';
    }
    if (roll < 0.86) {
      return '#cfe8ff';
    }
    if (roll < 0.94) {
      return '#ffe9c4';
    }
    return '#d9d0ff';
  }

  // Creates a small set of nebula haze blobs for background depth.
  buildNebula() {
    const blobCount = 5;
    this.nebulaBlobs = [];
    for (let blobIndex = 0; blobIndex < blobCount; blobIndex += 1) {
      this.nebulaBlobs.push(this.createNebulaBlob(true));
    }
  }

  // Creates a subtle midground dust layer (very faint, non-distracting).
  buildDustMotes() {
    const moteCount = 34;
    this.dustMotes = [];
    for (let moteIndex = 0; moteIndex < moteCount; moteIndex += 1) {
      this.dustMotes.push(this.createDustMote(true));
    }
  }

  // Generates a single dust mote.
  createDustMote(randomizeX) {
    const radius = 0.7 + Math.random() * 2.2;
    const positionX = randomizeX === true ? Math.random() * this.canvasWidth : this.canvasWidth + Math.random() * this.canvasWidth * 0.4;
    const positionY = Math.random() * this.canvasHeight;
    const alpha = 0.04 + Math.random() * 0.14;
    const speed = 6 + Math.random() * 20;
    const drift = (Math.random() - 0.5) * 10;
    const roll = Math.random();
    const color = roll < 0.7 ? '#ffffff' : (roll < 0.88 ? '#cfe8ff' : '#ffe9c4');
    return { positionX, positionY, radius, alpha, speed, drift, color };
  }

  // Generates a single nebula haze blob (very low opacity).
  createNebulaBlob(randomizeX) {
    const colorChoices = [
      { red: 106, green: 199, blue: 255 },
      { red: 179, green: 156, blue: 255 },
      { red: 248, green: 196, blue: 80 },
      { red: 103, green: 244, blue: 193 }
    ];
    const chosenColor = colorChoices[Math.floor(Math.random() * colorChoices.length)];
    const radius = 220 + Math.random() * 420;
    const positionX = randomizeX === true ? Math.random() * this.canvasWidth : this.canvasWidth + radius + Math.random() * this.canvasWidth * 0.6;
    const positionY = Math.random() * this.canvasHeight;
    const alpha = 0.03 + Math.random() * 0.06;
    const speed = 3 + Math.random() * 10;
    const drift = (Math.random() - 0.5) * 6;
    const phase = Math.random() * Math.PI * 2;
    return { positionX, positionY, radius, alpha, speed, drift, phase, color: chosenColor };
  }

  // Resets the slow planet spawner and clears existing planets.
  resetPlanetSpawner() {
    this.planets = [];
    this.nextPlanetSpawnSeconds = 4 + Math.random() * 8;
  }

  // Resets the shooting star spawner and clears active streaks.
  resetShootingStarSpawner() {
    this.shootingStars = [];
    this.nextShootingStarSpawnSeconds = 3 + Math.random() * 6;
  }

  // Creates a new shooting star streak (fast, subtle).
  createShootingStar() {
    const startX = this.canvasWidth + 40 + Math.random() * this.canvasWidth * 0.25;
    const startY = this.canvasHeight * (0.08 + Math.random() * 0.5);
    const speedX = -(720 + Math.random() * 520);
    const speedY = (90 + Math.random() * 260);
    const length = 40 + Math.random() * 90;
    const thickness = 1.2 + Math.random() * 1.6;
    const lifeSeconds = 0.55 + Math.random() * 0.55;
    const color = this.pickShootingStarColor();
    const intensity = 0.6 + Math.random() * 0.35;
    return {
      positionX: startX,
      positionY: startY,
      velocityX: speedX,
      velocityY: speedY,
      length,
      thickness,
      lifeSeconds,
      ageSeconds: 0,
      color,
      intensity
    };
  }

  // Picks a shooting star color (small variety, not too loud).
  pickShootingStarColor() {
    const roll = Math.random();
    if (roll < 0.6) {
      return { red: 255, green: 255, blue: 255 };
    }
    if (roll < 0.8) {
      return { red: 252, green: 211, blue: 77 };
    }
    if (roll < 0.92) {
      return { red: 255, green: 107, blue: 107 };
    }
    return { red: 139, green: 207, blue: 255 };
  }

  // Updates active shooting stars and spawns new ones occasionally.
  updateShootingStars(deltaSeconds) {
    if (this.shootingStars.length > 0) {
      for (const shootingStar of this.shootingStars) {
        shootingStar.ageSeconds += deltaSeconds;
        shootingStar.positionX += shootingStar.velocityX * deltaSeconds;
        shootingStar.positionY += shootingStar.velocityY * deltaSeconds;
      }
      this.shootingStars = this.shootingStars.filter((shootingStar) => {
        if (shootingStar.ageSeconds > shootingStar.lifeSeconds) {
          return false;
        }
        return true;
      });
    }

    const shouldSpawn = this.timeSeconds >= this.nextShootingStarSpawnSeconds;
    if (shouldSpawn === true && this.shootingStars.length < 2) {
      this.shootingStars.push(this.createShootingStar());
      this.nextShootingStarSpawnSeconds = this.timeSeconds + (5 + Math.random() * 14);
    }
  }

  // Creates a new background planet object.
  createPlanet() {
    const themes = [
      { highlight: '#65a8ff', mid: '#233a6e', shadow: '#0b1024', atmo: '#8bcfff' },
      { highlight: '#c4a3ec', mid: '#3b2a63', shadow: '#0b1024', atmo: '#d9d0ff' },
      { highlight: '#ffb347', mid: '#3f2e5c', shadow: '#0b1024', atmo: '#fcd34d' }
    ];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const radius = 110 + Math.random() * 190;
    const isTop = Math.random() < 0.5;
    let positionY = 0;
    if (isTop === true) {
      positionY = (-radius * (0.25 + Math.random() * 0.35)) + this.canvasHeight * (0.15 + Math.random() * 0.25);
    } else {
      positionY = (this.canvasHeight * (0.7 + Math.random() * 0.15)) + radius * (0.1 + Math.random() * 0.35);
    }
    const positionX = this.canvasWidth + radius * (1.1 + Math.random() * 0.6);
    const speed = 3 + Math.random() * 9;
    const alpha = 0.08 + Math.random() * 0.12;
    const hasRing = Math.random() < 0.35;
    const ringTilt = (-0.45 + Math.random() * 0.9);
    return { positionX, positionY, radius, speed, alpha, theme, hasRing, ringTilt };
  }

  // Updates stored canvas sizes so stars wrap correctly.
  setCanvasSize(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.buildStars();
    this.buildNebula();
    this.buildDustMotes();
    this.resetPlanetSpawner();
    this.resetShootingStarSpawner();
  }

  // Advances star positions and wraps them when leaving the screen.
  update(deltaSeconds) {
    this.timeSeconds += deltaSeconds;

    for (const star of this.stars) {
      const positionDelta = star.speed * deltaSeconds;
      star.positionX -= positionDelta;
      if (star.positionX < -star.radius * 6) {
        const resetStar = this.createStar(false);
        star.positionX = resetStar.positionX;
        star.positionY = resetStar.positionY;
        star.speed = resetStar.speed;
        star.radius = resetStar.radius;
        star.baseAlpha = resetStar.baseAlpha;
        star.twinkleSpeed = resetStar.twinkleSpeed;
        star.twinklePhase = resetStar.twinklePhase;
        star.twinkleAmplitude = resetStar.twinkleAmplitude;
        star.hasGlow = resetStar.hasGlow;
        star.color = resetStar.color;
        star.depth = resetStar.depth;
      }
    }

    for (const blob of this.nebulaBlobs) {
      blob.positionX -= blob.speed * deltaSeconds;
      blob.positionY += blob.drift * deltaSeconds;
      if (blob.positionX < -blob.radius) {
        const resetBlob = this.createNebulaBlob(false);
        blob.positionX = resetBlob.positionX;
        blob.positionY = resetBlob.positionY;
        blob.radius = resetBlob.radius;
        blob.alpha = resetBlob.alpha;
        blob.speed = resetBlob.speed;
        blob.drift = resetBlob.drift;
        blob.phase = resetBlob.phase;
        blob.color = resetBlob.color;
      }
      if (blob.positionY < -blob.radius) {
        blob.positionY = this.canvasHeight + blob.radius;
      } else if (blob.positionY > this.canvasHeight + blob.radius) {
        blob.positionY = -blob.radius;
      }
    }

    for (const mote of this.dustMotes) {
      mote.positionX -= mote.speed * deltaSeconds;
      mote.positionY += mote.drift * deltaSeconds;
      if (mote.positionX < -mote.radius * 6) {
        const reset = this.createDustMote(false);
        mote.positionX = reset.positionX;
        mote.positionY = reset.positionY;
        mote.radius = reset.radius;
        mote.alpha = reset.alpha;
        mote.speed = reset.speed;
        mote.drift = reset.drift;
        mote.color = reset.color;
      }
      if (mote.positionY < -mote.radius * 6) {
        mote.positionY = this.canvasHeight + mote.radius * 6;
      } else if (mote.positionY > this.canvasHeight + mote.radius * 6) {
        mote.positionY = -mote.radius * 6;
      }
    }

    if (this.planets.length > 0) {
      for (const planet of this.planets) {
        planet.positionX -= planet.speed * deltaSeconds;
      }
      this.planets = this.planets.filter((planet) => planet.positionX > -planet.radius * 1.6);
    }

    if (this.timeSeconds >= this.nextPlanetSpawnSeconds && this.planets.length < 1) {
      this.planets.push(this.createPlanet());
      this.nextPlanetSpawnSeconds = this.timeSeconds + 14 + Math.random() * 22;
    }

    this.updateShootingStars(deltaSeconds);
  }

  // Draws all stars onto the provided context.
  draw(drawingContext) {
    drawingContext.save();

    // Planets (very subtle, behind everything).
    if (this.planets.length > 0) {
      for (const planet of this.planets) {
        this.drawPlanet(drawingContext, planet);
      }
    }

    // Nebula haze (subtle color depth).
    drawingContext.globalCompositeOperation = 'screen';
    for (const blob of this.nebulaBlobs) {
      const pulse = 0.85 + 0.15 * Math.sin(this.timeSeconds * 0.18 + blob.phase);
      const alpha = blob.alpha * pulse;
      const color = blob.color;
      const gradient = drawingContext.createRadialGradient(blob.positionX, blob.positionY, blob.radius * 0.15, blob.positionX, blob.positionY, blob.radius);
      gradient.addColorStop(0, `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${color.red}, ${color.green}, ${color.blue}, 0)`);
      drawingContext.fillStyle = gradient;
      drawingContext.fillRect(blob.positionX - blob.radius, blob.positionY - blob.radius, blob.radius * 2, blob.radius * 2);
    }

    // Midground dust motes.
    for (const mote of this.dustMotes) {
      drawingContext.globalAlpha = mote.alpha;
      drawingContext.fillStyle = mote.color;
      drawingContext.beginPath();
      drawingContext.arc(mote.positionX, mote.positionY, mote.radius, 0, Math.PI * 2);
      drawingContext.fill();
    }

    // Stars (normal blend on top).
    drawingContext.globalCompositeOperation = 'source-over';
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(this.timeSeconds * star.twinkleSpeed + star.twinklePhase);
      const alpha = Math.max(0, Math.min(1, star.baseAlpha + (twinkle - 0.5) * star.twinkleAmplitude));

      if (star.hasGlow === true) {
        drawingContext.globalAlpha = alpha * 0.12;
        drawingContext.fillStyle = star.color;
        drawingContext.beginPath();
        drawingContext.arc(star.positionX, star.positionY, star.radius * 3.2, 0, Math.PI * 2);
        drawingContext.fill();
      }

      drawingContext.globalAlpha = alpha;
      drawingContext.fillStyle = star.color;
      drawingContext.beginPath();
      drawingContext.arc(star.positionX, star.positionY, star.radius, 0, Math.PI * 2);
      drawingContext.fill();
    }

    // Shooting stars (quick streaks above stars, very subtle).
    if (this.shootingStars.length > 0) {
      drawingContext.globalCompositeOperation = 'screen';
      for (const shootingStar of this.shootingStars) {
        this.drawShootingStar(drawingContext, shootingStar);
      }
      drawingContext.globalCompositeOperation = 'source-over';
    }

    drawingContext.globalAlpha = 1;
    drawingContext.restore();
  }

  // Draws a single shooting star streak.
  drawShootingStar(drawingContext, shootingStar) {
    const ageRatio = shootingStar.lifeSeconds > 0 ? shootingStar.ageSeconds / shootingStar.lifeSeconds : 1;
    const fade = Math.max(0, 1 - ageRatio);
    const alpha = shootingStar.intensity * fade * fade;
    if (alpha <= 0) {
      return;
    }

    const velocityMagnitude = Math.hypot(shootingStar.velocityX, shootingStar.velocityY);
    const directionX = velocityMagnitude > 0 ? shootingStar.velocityX / velocityMagnitude : -1;
    const directionY = velocityMagnitude > 0 ? shootingStar.velocityY / velocityMagnitude : 0;
    const headX = shootingStar.positionX;
    const headY = shootingStar.positionY;
    const tailX = headX - directionX * shootingStar.length;
    const tailY = headY - directionY * shootingStar.length;

    const color = shootingStar.color;
    const gradient = drawingContext.createLinearGradient(headX, headY, tailX, tailY);
    gradient.addColorStop(0, `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${color.red}, ${color.green}, ${color.blue}, 0)`);

    drawingContext.save();
    drawingContext.strokeStyle = gradient;
    drawingContext.lineWidth = shootingStar.thickness;
    drawingContext.lineCap = 'round';
    drawingContext.beginPath();
    drawingContext.moveTo(headX, headY);
    drawingContext.lineTo(tailX, tailY);
    drawingContext.stroke();

    // Small head sparkle.
    drawingContext.globalAlpha = alpha * 0.9;
    drawingContext.fillStyle = `rgb(${color.red}, ${color.green}, ${color.blue})`;
    drawingContext.beginPath();
    drawingContext.arc(headX, headY, shootingStar.thickness * 1.2, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.restore();
  }

  // Draws a single planet with subtle shading and optional ring.
  drawPlanet(drawingContext, planet) {
    const theme = planet.theme;

    // Draw ring behind planet for subtle parallax flair.
    if (planet.hasRing === true) {
      drawingContext.save();
      drawingContext.translate(planet.positionX, planet.positionY);
      drawingContext.rotate(planet.ringTilt);
      drawingContext.scale(1.35, 0.38);
      drawingContext.globalAlpha = planet.alpha * 0.22;
      drawingContext.strokeStyle = theme.atmo;
      drawingContext.lineWidth = Math.max(2, planet.radius * 0.08);
      drawingContext.beginPath();
      drawingContext.arc(0, 0, planet.radius * 1.15, 0, Math.PI * 2);
      drawingContext.stroke();
      drawingContext.restore();
    }

    // Planet body.
    const gradient = drawingContext.createRadialGradient(
      planet.positionX - planet.radius * 0.35,
      planet.positionY - planet.radius * 0.35,
      planet.radius * 0.25,
      planet.positionX,
      planet.positionY,
      planet.radius
    );
    gradient.addColorStop(0, theme.highlight);
    gradient.addColorStop(0.65, theme.mid);
    gradient.addColorStop(1, theme.shadow);

    drawingContext.save();
    drawingContext.globalAlpha = planet.alpha;
    drawingContext.fillStyle = gradient;
    drawingContext.beginPath();
    drawingContext.arc(planet.positionX, planet.positionY, planet.radius, 0, Math.PI * 2);
    drawingContext.fill();

    // Atmosphere rim.
    drawingContext.globalAlpha = planet.alpha * 0.25;
    drawingContext.strokeStyle = theme.atmo;
    drawingContext.lineWidth = Math.max(2, planet.radius * 0.03);
    drawingContext.beginPath();
    drawingContext.arc(planet.positionX, planet.positionY, planet.radius * 1.02, 0, Math.PI * 2);
    drawingContext.stroke();
    drawingContext.restore();
  }
}

