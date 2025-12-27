import { Game } from './core/game.js';
import { loadSpacemanSprites, loadAsteroidSprites, loadAlienSprites, loadPowerUpIcons } from './core/assets.js';

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
const testAsteroidSpeedMultiplierSlider = document.getElementById('testAsteroidSpeedMultiplier');
const testAsteroidSizeMultiplierSlider = document.getElementById('testAsteroidSizeMultiplier');
const testAsteroidSpawnRateMultiplierSlider = document.getElementById('testAsteroidSpawnRateMultiplier');
const testAsteroidSpeedValue = document.getElementById('testAsteroidSpeedValue');
const testAsteroidSizeValue = document.getElementById('testAsteroidSizeValue');
const testAsteroidSpawnRateValue = document.getElementById('testAsteroidSpawnRateValue');
const testPowerupSpawnRateMultiplierSlider = document.getElementById('testPowerupSpawnRateMultiplier');
const testPowerupSpawnRateValue = document.getElementById('testPowerupSpawnRateValue');
const TEST_MODE_STORAGE_KEY = 'orbitalTestModeConfig';
const startOverlay = document.getElementById('startOverlay');
const startPlayButton = document.getElementById('startPlayButton');
const startInstructionsButton = document.getElementById('startInstructionsButton');
const startTestModeButton = document.getElementById('startTestModeButton');
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseResumeButton = document.getElementById('pauseResumeButton');
let instructionsOpenedFromStart = false;
let testModeOpenedFromStart = false;
const infoRowElement = document.querySelector('.info-row');
const desktopHeaderElement = document.getElementById('desktopHeader');
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

// Hides the info button row on touch-first devices.
function updateInfoRowVisibility(game) {
  if (infoRowElement === null) {
    return;
  }
  const isTouchDevice = game.detectTouchFirstDevice();
  if (isTouchDevice === true) {
    infoRowElement.classList.add('touch-hidden');
    if (desktopHeaderElement !== null) {
      desktopHeaderElement.classList.add('touch-hidden');
    }
  } else {
    infoRowElement.classList.remove('touch-hidden');
    if (desktopHeaderElement !== null) {
      desktopHeaderElement.classList.remove('touch-hidden');
    }
  }
}

// Calculates and applies UI padding for canvas sizing (desktop reserves space for the footer buttons).
function applyUiPadding(game) {
  const isTouchDevice = game.detectTouchFirstDevice();
  const reservedBottomPadding = isTouchDevice === true ? 0 : 12;
  const infoRowHeight = infoRowElement !== null ? infoRowElement.offsetHeight : 0;
  const headerHeight = isTouchDevice === true || desktopHeaderElement === null ? 0 : desktopHeaderElement.offsetHeight;
  const uiPadding = infoRowHeight + headerHeight + reservedBottomPadding;
  game.setUiPadding(uiPadding);
}

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
      const asteroidSpeedMultiplier = Number.parseFloat(parsed.asteroidSpeedMultiplier);
      const asteroidSizeMultiplier = Number.parseFloat(parsed.asteroidSizeMultiplier);
      const asteroidSpawnRateMultiplier = Number.parseFloat(parsed.asteroidSpawnRateMultiplier);
      const powerUpSpawnRateMultiplier = Number.parseFloat(parsed.powerUpSpawnRateMultiplier);
      return {
        enabled: Boolean(parsed.enabled),
        infiniteLives: Boolean(parsed.infiniteLives),
        allowedPowerups: Array.isArray(parsed.allowedPowerups) ? parsed.allowedPowerups : null,
        asteroidSpeedMultiplier: Number.isFinite(asteroidSpeedMultiplier) ? asteroidSpeedMultiplier : 1,
        asteroidSizeMultiplier: Number.isFinite(asteroidSizeMultiplier) ? asteroidSizeMultiplier : 1,
        asteroidSpawnRateMultiplier: Number.isFinite(asteroidSpawnRateMultiplier) ? asteroidSpawnRateMultiplier : 1,
        powerUpSpawnRateMultiplier: Number.isFinite(powerUpSpawnRateMultiplier) ? powerUpSpawnRateMultiplier : 1
      };
    }
  } catch (error) {
    // ignore parse/storage errors
  }
  return {
    enabled: false,
    infiniteLives: false,
    allowedPowerups: null,
    asteroidSpeedMultiplier: 1,
    asteroidSizeMultiplier: 1,
    asteroidSpawnRateMultiplier: 1,
    powerUpSpawnRateMultiplier: 1
  };
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

  if (testAsteroidSpeedMultiplierSlider !== null) {
    testAsteroidSpeedMultiplierSlider.value = String(config.asteroidSpeedMultiplier ?? 1);
  }
  if (testAsteroidSizeMultiplierSlider !== null) {
    testAsteroidSizeMultiplierSlider.value = String(config.asteroidSizeMultiplier ?? 1);
  }
  if (testAsteroidSpawnRateMultiplierSlider !== null) {
    testAsteroidSpawnRateMultiplierSlider.value = String(config.asteroidSpawnRateMultiplier ?? 1);
  }
  if (testPowerupSpawnRateMultiplierSlider !== null) {
    testPowerupSpawnRateMultiplierSlider.value = String(config.powerUpSpawnRateMultiplier ?? 1);
  }

  updateTestModeMultiplierLabels();
}

// Updates the test mode slider value labels.
function updateTestModeMultiplierLabels() {
  if (testAsteroidSpeedMultiplierSlider !== null && testAsteroidSpeedValue !== null) {
    const value = Number.parseFloat(testAsteroidSpeedMultiplierSlider.value);
    const display = Number.isFinite(value) ? value.toFixed(2) : '1.00';
    testAsteroidSpeedValue.textContent = `${display}×`;
  }
  if (testAsteroidSizeMultiplierSlider !== null && testAsteroidSizeValue !== null) {
    const value = Number.parseFloat(testAsteroidSizeMultiplierSlider.value);
    const display = Number.isFinite(value) ? value.toFixed(2) : '1.00';
    testAsteroidSizeValue.textContent = `${display}×`;
  }
  if (testAsteroidSpawnRateMultiplierSlider !== null && testAsteroidSpawnRateValue !== null) {
    const value = Number.parseFloat(testAsteroidSpawnRateMultiplierSlider.value);
    const display = Number.isFinite(value) ? value.toFixed(2) : '1.00';
    testAsteroidSpawnRateValue.textContent = `${display}×`;
  }
  if (testPowerupSpawnRateMultiplierSlider !== null && testPowerupSpawnRateValue !== null) {
    const value = Number.parseFloat(testPowerupSpawnRateMultiplierSlider.value);
    const display = Number.isFinite(value) ? value.toFixed(2) : '1.00';
    testPowerupSpawnRateValue.textContent = `${display}×`;
  }
}

function updateTestModeButtonState(enabled) {
  if (toggleTestModeButton !== null) {
    if (enabled === true) {
      toggleTestModeButton.classList.add('test-enabled');
    } else {
      toggleTestModeButton.classList.remove('test-enabled');
    }
  }
  if (startTestModeButton !== null) {
    if (enabled === true) {
      startTestModeButton.classList.add('test-enabled');
    } else {
      startTestModeButton.classList.remove('test-enabled');
    }
  }
}

function isTestModeSettingsLocked(game) {
  if (game === null || game === undefined) {
    return true;
  }
  if (game.isRunning === true && game.isGameOver !== true) {
    return true;
  }
  return false;
}

function buildTestModeConfigFromUi() {
  const enabled = testModeEnabledCheckbox !== null && testModeEnabledCheckbox.checked === true;
  const infiniteLives = testModeInfiniteLivesCheckbox !== null && testModeInfiniteLivesCheckbox.checked === true;
  const allowed = [];
  testModePowerupCheckboxes.forEach((box) => {
    if (box.checked === true) {
      allowed.push(box.value);
    }
  });
  const asteroidSpeedMultiplier = testAsteroidSpeedMultiplierSlider !== null ? Number.parseFloat(testAsteroidSpeedMultiplierSlider.value) : 1;
  const asteroidSizeMultiplier = testAsteroidSizeMultiplierSlider !== null ? Number.parseFloat(testAsteroidSizeMultiplierSlider.value) : 1;
  const asteroidSpawnRateMultiplier = testAsteroidSpawnRateMultiplierSlider !== null ? Number.parseFloat(testAsteroidSpawnRateMultiplierSlider.value) : 1;
  const powerUpSpawnRateMultiplier = testPowerupSpawnRateMultiplierSlider !== null ? Number.parseFloat(testPowerupSpawnRateMultiplierSlider.value) : 1;
  return {
    enabled,
    allowedPowerups: allowed.length > 0 ? allowed : null,
    infiniteLives,
    asteroidSpeedMultiplier,
    asteroidSizeMultiplier,
    asteroidSpawnRateMultiplier,
    powerUpSpawnRateMultiplier
  };
}

function updateTestModeUiInteractivity(game) {
  const enabled = testModeEnabledCheckbox !== null && testModeEnabledCheckbox.checked === true;
  const isLocked = isTestModeSettingsLocked(game);
  const disableSecondaryControls = enabled !== true || isLocked === true;

  if (testModeEnabledCheckbox !== null) {
    testModeEnabledCheckbox.disabled = isLocked === true;
  }

  if (testModeInfiniteLivesCheckbox !== null) {
    testModeInfiniteLivesCheckbox.disabled = disableSecondaryControls === true;
  }
  testModePowerupCheckboxes.forEach((box) => {
    box.disabled = disableSecondaryControls === true;
  });
  if (testAsteroidSpeedMultiplierSlider !== null) {
    testAsteroidSpeedMultiplierSlider.disabled = disableSecondaryControls === true;
  }
  if (testAsteroidSizeMultiplierSlider !== null) {
    testAsteroidSizeMultiplierSlider.disabled = disableSecondaryControls === true;
  }
  if (testAsteroidSpawnRateMultiplierSlider !== null) {
    testAsteroidSpawnRateMultiplierSlider.disabled = disableSecondaryControls === true;
  }
  if (testPowerupSpawnRateMultiplierSlider !== null) {
    testPowerupSpawnRateMultiplierSlider.disabled = disableSecondaryControls === true;
  }
}

function persistAndApplyTestModeConfig(game) {
  updateTestModeMultiplierLabels();
  const config = buildTestModeConfigFromUi();
  saveTestModeConfig(config);
  updateTestModeButtonState(config.enabled === true);

  if (isTestModeSettingsLocked(game) !== true) {
    game.applyTestModeConfig(config);
  }
  updateTestModeUiInteractivity(game);
}

function setupInfoToggles(game) {
  if (toggleInstructionsButton !== null && instructionsOverlay !== null) {
    toggleInstructionsButton.addEventListener('click', () => {
      instructionsOpenedFromStart = false;
      testModeOpenedFromStart = false;
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
        let overlayButton = null;
        if (panel.id === 'instructionsOverlay') {
          overlayButton = toggleInstructionsButton;
        } else if (panel.id === 'highScoresOverlay') {
          overlayButton = toggleHighScoresButton;
        } else if (panel.id === 'testModeOverlay') {
          overlayButton = testModeOpenedFromStart === true ? startTestModeButton : toggleTestModeButton;
        }
        hideOverlay(panel, overlayButton);
        if (panel.id === 'instructionsOverlay' && instructionsOpenedFromStart === true && startOverlay !== null && startOverlay.classList.contains('hidden') === true) {
          startOverlay.classList.remove('hidden');
          startOverlay.classList.add('visible');
          instructionsOpenedFromStart = false;
        }
        if (panel.id === 'testModeOverlay' && testModeOpenedFromStart === true && startOverlay !== null && startOverlay.classList.contains('hidden') === true) {
          startOverlay.classList.remove('hidden');
          startOverlay.classList.add('visible');
          testModeOpenedFromStart = false;
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
      testModeOpenedFromStart = false;
    }
  });
}

function setupTestModeUI(game) {
  if (toggleTestModeButton !== null && testModeOverlay !== null) {
    toggleTestModeButton.addEventListener('click', () => {
      game.pauseGame(false);
      const storedConfig = loadTestModeConfig();
      syncTestModeUIFromConfig(storedConfig);
      updateTestModeUiInteractivity(game);
      showOverlay(testModeOverlay, toggleTestModeButton);
    });
  }

  if (testModeEnabledCheckbox !== null) {
    testModeEnabledCheckbox.addEventListener('change', () => {
      persistAndApplyTestModeConfig(game);
    });
  }
  if (testModeInfiniteLivesCheckbox !== null) {
    testModeInfiniteLivesCheckbox.addEventListener('change', () => {
      persistAndApplyTestModeConfig(game);
    });
  }
  testModePowerupCheckboxes.forEach((box) => {
    box.addEventListener('change', () => {
      persistAndApplyTestModeConfig(game);
    });
  });

  if (testAsteroidSpeedMultiplierSlider !== null) {
    testAsteroidSpeedMultiplierSlider.addEventListener('input', () => {
      persistAndApplyTestModeConfig(game);
    });
  }
  if (testAsteroidSizeMultiplierSlider !== null) {
    testAsteroidSizeMultiplierSlider.addEventListener('input', () => {
      persistAndApplyTestModeConfig(game);
    });
  }
  if (testAsteroidSpawnRateMultiplierSlider !== null) {
    testAsteroidSpawnRateMultiplierSlider.addEventListener('input', () => {
      persistAndApplyTestModeConfig(game);
    });
  }
  if (testPowerupSpawnRateMultiplierSlider !== null) {
    testPowerupSpawnRateMultiplierSlider.addEventListener('input', () => {
      persistAndApplyTestModeConfig(game);
    });
  }

  // initialize state from stored config on load
  const initialConfig = loadTestModeConfig();
  updateTestModeButtonState(initialConfig.enabled === true);
  syncTestModeUIFromConfig(initialConfig);
  updateTestModeUiInteractivity(game);
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
  const showTestMode = () => {
    const storedConfig = loadTestModeConfig();
    syncTestModeUIFromConfig(storedConfig);
    updateTestModeUiInteractivity(game);
    showOverlay(testModeOverlay, startTestModeButton);
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
      testModeOpenedFromStart = false;
      hideStart();
      showInstructions();
    });
  }
  if (startTestModeButton !== null) {
    startTestModeButton.addEventListener('click', () => {
      instructionsOpenedFromStart = false;
      testModeOpenedFromStart = true;
      hideStart();
      showTestMode();
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

function setupTapToThrust(game) {
  const tap = (event) => {
    if (event !== undefined) {
      event.preventDefault();
    }
    if (startOverlay !== null && startOverlay.classList.contains('hidden') === false) {
      return;
    }
    if (pauseOverlay !== null && pauseOverlay.classList.contains('hidden') === false) {
      return;
    }
    if (summaryOverlayElement !== null && summaryOverlayElement.classList.contains('visible') === true) {
      return;
    }
    if (game.isCountdownActive === true) {
      game.skipCountdown();
      return;
    }
    if (game.isPaused === true) {
      game.resumeGame();
      return;
    }
    if (game.isGameOver === true) {
      return;
    }
    game.player.jump();
  };
  canvasElement.addEventListener('pointerdown', tap, { passive: false });
}

// Bootstraps the game once the spaceman sprite is loaded.
async function bootstrapGame() {
  const [spacemanSprites, asteroidSprites, alienSprites, powerUpIcons] = await Promise.all([
    loadSpacemanSprites(),
    loadAsteroidSprites(),
    loadAlienSprites(),
    loadPowerUpIcons()
  ]);
  const hudElements = buildHudElements();
  const drawingContext = canvasElement.getContext('2d');
  const game = new Game(canvasElement, drawingContext, hudElements, {
    spacemanSprites,
    asteroidSprites,
    alienSprites,
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
  if (initialTestMode.enabled === true && startTestModeButton !== null) {
    startTestModeButton.classList.add('test-enabled');
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
  setupTapToThrust(game);
  updateInfoRowVisibility(game);
  applyUiPadding(game);
  game.handleResize();
  window.addEventListener('resize', () => {
    updateInfoRowVisibility(game);
    applyUiPadding(game);
  }, true);
}

bootstrapGame().catch((error) => {
  statusMessageElement.textContent = `Failed to start game: ${error.message}`;
});


