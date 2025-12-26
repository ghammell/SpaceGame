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
const toggleTestModeButton = document.getElementById('toggleTestMode');
const testModeOverlay = document.getElementById('testModeOverlay');
const testModeEnabledCheckbox = document.getElementById('testModeEnabled');
const testModePowerupCheckboxes = document.querySelectorAll('.testmode-powerup');
const testModeInfiniteLivesCheckbox = document.getElementById('testModeInfiniteLives');
const TEST_MODE_STORAGE_KEY = 'orbitalTestModeConfig';
const startOverlay = document.getElementById('startOverlay');
const startPlayButton = document.getElementById('startPlayButton');
const startInstructionsButton = document.getElementById('startInstructionsButton');
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseResumeButton = document.getElementById('pauseResumeButton');
let instructionsOpenedFromStart = false;
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
  testModeNotice: document.getElementById('summaryTestModeNotice'),
  saveInline: document.getElementById('summarySaveInline'),
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

function isInputTarget(event) {
  const target = event.target;
  if (target === null) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (target.isContentEditable === true) {
    return true;
  }
  return false;
}

function loadTestModeConfig() {
  try {
    const stored = localStorage.getItem(TEST_MODE_STORAGE_KEY);
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      return {
        enabled: Boolean(parsed.enabled),
        infiniteLives: Boolean(parsed.infiniteLives),
        allowedPowerups: Array.isArray(parsed.allowedPowerups) ? parsed.allowedPowerups : null
      };
    }
  } catch (error) {
    // ignore parse/storage errors
  }
  return { enabled: false, infiniteLives: false, allowedPowerups: null };
}

function saveTestModeConfig(config) {
  try {
    localStorage.setItem(TEST_MODE_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    // ignore storage errors
  }
}

function syncTestModeUIFromConfig(config) {
  if (testModeEnabledCheckbox !== null) {
    testModeEnabledCheckbox.checked = config.enabled === true;
  }
  if (testModeInfiniteLivesCheckbox !== null) {
    testModeInfiniteLivesCheckbox.checked = config.infiniteLives === true;
  }
  const allowedSet = new Set(config.allowedPowerups ?? []);
  testModePowerupCheckboxes.forEach((box) => {
    box.checked = allowedSet.size > 0 ? allowedSet.has(box.value) : false;
  });
}

function setupInfoToggles(game) {
  if (toggleInstructionsButton !== null && instructionsOverlay !== null) {
    toggleInstructionsButton.addEventListener('click', () => {
      instructionsOpenedFromStart = false;
      game.pauseGame(false);
      showOverlay(instructionsOverlay, toggleInstructionsButton);
    });
  }
  if (toggleHighScoresButton !== null && highScoresOverlay !== null) {
    toggleHighScoresButton.addEventListener('click', () => {
      game.renderHighScores();
      game.pauseGame(false);
      showOverlay(highScoresOverlay, toggleHighScoresButton);
    });
  }
  document.querySelectorAll('.modal-close').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.closeTarget;
      const panel = document.getElementById(targetId);
      if (panel !== null) {
        hideOverlay(panel, panel.id === 'instructionsOverlay' ? toggleInstructionsButton : toggleHighScoresButton);
        if (panel.id === 'instructionsOverlay' && instructionsOpenedFromStart === true && startOverlay !== null && startOverlay.classList.contains('hidden') === true) {
          startOverlay.classList.remove('hidden');
          startOverlay.classList.add('visible');
          instructionsOpenedFromStart = false;
        }
      }
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      hideOverlay(instructionsOverlay, toggleInstructionsButton);
      hideOverlay(highScoresOverlay, toggleHighScoresButton);
      hideOverlay(testModeOverlay, toggleTestModeButton);
      hideOverlay(startOverlay, null);
      instructionsOpenedFromStart = false;
    }
  });
}

function setupTestModeUI(game) {
  if (toggleTestModeButton !== null && testModeOverlay !== null) {
    toggleTestModeButton.addEventListener('click', () => {
      game.pauseGame(false);
      showOverlay(testModeOverlay, toggleTestModeButton);
    });
  }
  const markButtonState = (enabled) => {
    if (toggleTestModeButton !== null) {
      if (enabled === true) {
        toggleTestModeButton.classList.add('test-enabled');
      } else {
        toggleTestModeButton.classList.remove('test-enabled');
      }
    }
  };
  const closeButton = document.getElementById('closeTestMode');
  if (closeButton !== null) {
    closeButton.addEventListener('click', () => hideOverlay(testModeOverlay, toggleTestModeButton));
  }
  const applyButton = document.getElementById('applyTestMode');
  if (applyButton !== null) {
    applyButton.addEventListener('click', () => {
      const enabled = testModeEnabledCheckbox !== null && testModeEnabledCheckbox.checked === true;
      const infiniteLives = testModeInfiniteLivesCheckbox !== null && testModeInfiniteLivesCheckbox.checked === true;
      const allowed = [];
      testModePowerupCheckboxes.forEach((box) => {
        if (box.checked === true) {
          allowed.push(box.value);
        }
      });
      const config = { enabled, allowedPowerups: allowed.length > 0 ? allowed : null, infiniteLives };
      saveTestModeConfig(config);
      game.applyTestModeConfig(config);
      hideOverlay(testModeOverlay, toggleTestModeButton);
      markButtonState(enabled);
    });
  }
  // initialize state from stored config on load
  const initialConfig = loadTestModeConfig();
  markButtonState(initialConfig.enabled);
}

function setupStartOverlay(game) {
  const hideStart = () => {
    if (startOverlay !== null) {
      startOverlay.classList.add('hidden');
      startOverlay.classList.remove('visible');
    }
  };
  const showInstructions = () => {
    showOverlay(instructionsOverlay, toggleInstructionsButton);
  };
  const startRun = () => {
    hideStart();
    game.start(3);
  };
  if (startPlayButton !== null) {
    startPlayButton.addEventListener('click', startRun);
  }
  if (startInstructionsButton !== null) {
    startInstructionsButton.addEventListener('click', () => {
      instructionsOpenedFromStart = true;
      hideStart();
      showInstructions();
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      if (isInputTarget(event) === true) {
        return;
      }
      if (startOverlay !== null && startOverlay.classList.contains('hidden') === false) {
        event.preventDefault();
        startRun();
      }
    }
  });
}

function setupPauseOverlay(game) {
  const hidePause = () => {
    if (pauseOverlay !== null) {
      pauseOverlay.classList.add('hidden');
      pauseOverlay.classList.remove('visible');
    }
  };
  const showPause = () => {
    if (pauseOverlay !== null) {
      pauseOverlay.classList.remove('hidden');
      pauseOverlay.classList.add('visible');
    }
  };
  const resume = () => {
    hidePause();
    game.resumeGame();
  };
  if (pauseResumeButton !== null) {
    pauseResumeButton.addEventListener('click', resume);
  }
  document.addEventListener(
    'keydown',
    (event) => {
      if (pauseOverlay !== null && pauseOverlay.classList.contains('hidden') === false) {
        if (event.code === 'Space') {
          event.preventDefault();
          event.stopPropagation();
          resume();
        }
      }
    },
    true
  );
  const anyOverlayVisible = () => {
    const overlays = [instructionsOverlay, highScoresOverlay, testModeOverlay, summaryOverlayElement, startOverlay];
    return overlays.some((panel) => panel !== null && panel.classList.contains('hidden') === false);
  };
  game.onPauseChange = (isPaused, allowOverlay) => {
    if (isPaused !== true) {
      hidePause();
      return;
    }
    if (allowOverlay !== true) {
      hidePause();
      return;
    }
    if (anyOverlayVisible() === true) {
      hidePause();
      return;
    }
    showPause();
  };
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
  const initialTestMode = loadTestModeConfig();
  game.applyTestModeConfig(initialTestMode);
  syncTestModeUIFromConfig(initialTestMode);
  if (initialTestMode.enabled === true && toggleTestModeButton !== null) {
    toggleTestModeButton.classList.add('test-enabled');
  }
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
  setupTestModeUI(game);
  setupStartOverlay(game);
  setupPauseOverlay(game);
  game.handleResize();
}

bootstrapGame().catch((error) => {
  statusMessageElement.textContent = `Failed to start game: ${error.message}`;
});


