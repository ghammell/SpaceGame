// Loads an image element from a provided URL.
export function loadImageFromSource(sourceUrl) {
  return new Promise((resolve, reject) => {
    const imageElement = new Image();
    imageElement.onload = () => {
      resolve(imageElement);
    };
    imageElement.onerror = () => {
      reject(new Error(`Failed to load image from ${sourceUrl}`));
    };
    imageElement.src = sourceUrl;
  });
}

// Loads the spaceman SVG and returns a ready image element.
export async function loadSpacemanSprite() {
  const spriteUrl = new URL('../../assets/spaceman.svg', import.meta.url).href;
  const loadedImage = await loadImageFromSource(spriteUrl);
  return loadedImage;
}

// Loads all asteroid sprite variants.
export async function loadAsteroidSprites() {
  const asteroidPaths = [
    '../../assets/asteroids/asteroid1.svg',
    '../../assets/asteroids/asteroid2.svg',
    '../../assets/asteroids/asteroid3.svg',
    '../../assets/asteroids/asteroid4.svg',
    '../../assets/asteroids/asteroid5.svg',
    '../../assets/asteroids/asteroid6.svg',
    '../../assets/asteroids/asteroid7.svg',
    '../../assets/asteroids/asteroid8.svg',
    '../../assets/asteroids/asteroid9.svg',
    '../../assets/asteroids/asteroid10.svg',
    '../../assets/asteroids/asteroid11.svg',
    '../../assets/asteroids/asteroid12.svg',
    '../../assets/asteroids/asteroid13.svg',
    '../../assets/asteroids/asteroid14.svg',
    '../../assets/asteroids/asteroid15.svg'
  ];
  const loadPromises = asteroidPaths.map((path) => {
    const spriteUrl = new URL(path, import.meta.url).href;
    return loadImageFromSource(spriteUrl);
  });
  const loadedSprites = await Promise.all(loadPromises);
  return loadedSprites;
}

// Loads the alien sprite.
export async function loadAlienSprite() {
  const spriteUrl = new URL('../../assets/alien.svg', import.meta.url).href;
  const loadedImage = await loadImageFromSource(spriteUrl);
  return loadedImage;
}

// Loads icon images for each powerup type.
export async function loadPowerUpIcons() {
  const iconMap = {};
  const entries = [
    ['extraLife', '../../assets/powerups/heart_plus.svg'],
    ['cloak', '../../assets/powerups/cloak.svg'],
    ['blaster', '../../assets/powerups/blaster.svg'],
    ['slow', '../../assets/powerups/slow.svg'],
    ['forceField', '../../assets/powerups/forcefield.svg'],
    ['spaceDust', '../../assets/powerups/spacedust.svg'],
    ['multiplier', '../../assets/powerups/multiplier.svg'],
    ['blackHole', '../../assets/powerups/blackhole.svg'],
    ['solarFlare', '../../assets/powerups/solarflare.svg'],
    ['wave', '../../assets/powerups/wave.svg']
  ];
  for (const [key, path] of entries) {
    const url = new URL(path, import.meta.url).href;
    iconMap[key] = await loadImageFromSource(url);
  }
  return iconMap;
}

