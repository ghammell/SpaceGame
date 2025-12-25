import { Game } from './core/game.js';
import { loadSpacemanSprite, loadAsteroidSprites, loadAlienSprite, loadPowerUpIcons } from './core/assets.js';

function ensureElement(id) {
  const existing = document.getElementById(id);
  if (existing !== null) {
    return existing;
  }
  const span = document.createElement('span');
  span.id = id;
  span.style.display = 'none';
  document.body.appendChild(span);
  return span;
}

const canvasElement = document.getElementById('gameCanvas');
const livesDisplayElement = ensureElement('livesCount');
const statusMessageElement = ensureElement('statusMessage');
const cloakStatusElement = ensureElement('cloakStatus');
const blasterStatusElement = ensureElement('blasterStatus');
const slowStatusElement = ensureElement('slowStatus');
const multiplierStatusElement = ensureElement('multiplierStatus');
const summaryOverlayElement = document.getElementById('summaryOverlay');
const summaryRestartButton = document.getElementById('summaryRestart');
const instructionsOverlay = document.getElementById('instructionsOverlay');
const highScoresOverlay = document.getElementById('highScoresOverlay');
const toggleInstructionsButton = document.getElementById('toggleInstructions');
const toggleHighScoresButton = document.getElementById('toggleHighScores');
const summaryFields = {
  score: document.getElementById('summaryScore'),
  timeScore: document.getElementById('summaryTimeScore'),
  destroyedScore: document.getElementById('summaryDestroyedScore'),
  phasedScore: document.getElementById('summaryPhasedScore'),
  miscScore: document.getElementById('summaryMiscScore'),
  negativeScore: document.getElementById('summaryNegativeScore'),
  time: document.getElementById('summaryTime'),
  powerups: document.getElementById('summaryPowerups'),
  cloak: document.getElementById('summaryCloak'),
  blaster: document.getElementById('summaryBlaster'),
  slow: document.getElementById('summarySlow'),
  nameInput: document.getElementById('summaryNameInput'),
  saveButton: document.getElementById('summarySaveButton'),
  highScoresList: document.getElementById('summaryHighScores'),
  inlineHighScoresList: document.getElementById('inlineHighScores')
};

// Builds a map of HUD elements used by the game.
function buildHudElements() {
  return {
    livesElement: livesDisplayElement,
    statusElement: statusMessageElement,
    cloakElement: cloakStatusElement,
    blasterElement: blasterStatusElement,
    slowElement: slowStatusElement,
    multiplierElement: multiplierStatusElement,
    totalScoreElement: ensureElement('totalScoreValue'),
    destroyedElement: ensureElement('destroyedValue'),
    phasedElement: ensureElement('phasedValue'),
    timeElement: ensureElement('timeValue'),
    powerupCountElement: ensureElement('powerupCountValue')
  };
}

function setupSummaryToggles() {
  const sections = document.querySelectorAll('.summary-section');
  sections.forEach((section) => {
    const toggle = section.querySelector('.summary-toggle');
    const details = section.querySelector('.summary-details');
    if (toggle === null || details === null) {
      return;
    }
    toggle.addEventListener('click', () => {
      const isCollapsed = section.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(isCollapsed === false));
    });
  });
}

function showOverlay(panel, button) {
  if (panel === null) {
    return;
  }
  panel.classList.remove('hidden');
  if (button !== null) {
    button.setAttribute('aria-expanded', 'true');
  }
}

function hideOverlay(panel, button) {
  if (panel === null) {
    return;
  }
  panel.classList.add('hidden');
  if (button !== null) {
    button.setAttribute('aria-expanded', 'false');
  }
}

function setupInfoToggles(game) {
  if (toggleInstructionsButton !== null && instructionsOverlay !== null) {
    toggleInstructionsButton.addEventListener('click', () => showOverlay(instructionsOverlay, toggleInstructionsButton));
  }
  if (toggleHighScoresButton !== null && highScoresOverlay !== null) {
    toggleHighScoresButton.addEventListener('click', () => {
      game.renderHighScores();
      showOverlay(highScoresOverlay, toggleHighScoresButton);
    });
  }
  document.querySelectorAll('.modal-close').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.closeTarget;
      const panel = document.getElementById(targetId);
      if (panel !== null) {
        hideOverlay(panel, panel.id === 'instructionsOverlay' ? toggleInstructionsButton : toggleHighScoresButton);
      }
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      hideOverlay(instructionsOverlay, toggleInstructionsButton);
      hideOverlay(highScoresOverlay, toggleHighScoresButton);
    }
  });
}

// Bootstraps the game once the spaceman sprite is loaded.
async function bootstrapGame() {
  const [spacemanImage, asteroidSprites, alienSprite, powerUpIcons] = await Promise.all([
    loadSpacemanSprite(),
    loadAsteroidSprites(),
    loadAlienSprite(),
    loadPowerUpIcons()
  ]);
  const hudElements = buildHudElements();
  const drawingContext = canvasElement.getContext('2d');
  const game = new Game(canvasElement, drawingContext, hudElements, {
    spacemanImage,
    asteroidSprites,
    alienSprite,
    powerUpIcons,
    summaryOverlay: summaryOverlayElement,
    summaryFields
  });
  if (summaryFields.saveButton !== null) {
    summaryFields.saveButton.addEventListener('click', () => {
      game.saveHighScore();
    });
  }
  summaryRestartButton.addEventListener('click', () => {
    game.start();
  });
  setupSummaryToggles();
  setupInfoToggles(game);
  game.handleResize();
  game.start();
}

bootstrapGame().catch((error) => {
  statusMessageElement.textContent = `Failed to start game: ${error.message}`;
});


