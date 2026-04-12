// ============================================================================
// GAME STATE
// ============================================================================
let currentOrder = null;
let huhClickCount = 0;
let currentAlienNumber = 1;
const CLARIFY_STEPS_PER_HUH = 4;

let currentDay = 1;
let currentCustomerIndex = 0;
let currentCustomerTimes = [];
let levelSession = null;
let posRoundStartedAt = null;
let posRoundTimerId = null;
let posTimerState = null;
let posTimerPopupTimeoutId = null;
let satisfactionGlowTimeoutId = null;
let posTimerExpired = false;
let pausedPosRemainingSeconds = null;
let isGamePausedBySettings = false;
let isSfxEnabled = true;
let isMusicEnabled = true;
let hasGameStarted = false;
let hasShownIntroStory = false;
let storySceneIndex = 0;
let storyTransitionStepTimeoutId = null;
let storyTransitionCleanupTimeoutId = null;
let storyEndFadeTimeoutId = null;
let isStoryTransitioning = false;

const STORY_TRANSITION_DURATION_MS = 800;
const STORY_END_FADE_DURATION_MS = 3000;
const STORY_SCENE_PATHS = [
  "Assets/StoryScene1.png",
  "Assets/StoryScene2.png",
  "Assets/StoryScene3.png",
  "Assets/StoryScene4.png",
  "Assets/StoryScene5.png",
  "Assets/StoryScene6.png",
  "Assets/StoryScene7.png",
];

const dayCustomerCounts = {
  1: 4,
  2: 5,
  3: 6,
  4: 6,
};

const menuItemsByDay = {
  1: ["Iced Matcha Latte", "Hot Matcha Latte", "Strawberry Syrup"],
  2: ["Vanilla Syrup", "Blueberry Syrup"],
  3: ["Coconut cream", "Cold foam"],
  4: [],
};

let clarifiedTokens = {
  matchaWord: false,
  tempWord: false,
  strawberryWord: false,
};

const posState = {
  temperature: null,
  base: null,
  flavour: null,
  topping: null,
};

// ============================================================================
// ELEMENTS
// ============================================================================
const screens = document.querySelectorAll(".screen");

const storyScreen = document.getElementById("storyScreen");
const storySceneImage = document.getElementById("storySceneImage");
const storyNextArrow = document.getElementById("storyNextArrow");
const storyMusic = new Audio("Assets/Audio/Space.mp3");
const startScreen = document.getElementById("startScreen");
const dayIntroScreen = document.getElementById("dayIntroScreen");
const ticketScreen = document.getElementById("ticketScreen");
const orderScreen = document.getElementById("orderScreen");
const posScreen = document.getElementById("posScreen");
const feedbackScreen = document.getElementById("feedbackScreen");
const dayClosedScreen = document.getElementById("dayClosedScreen");

const startBtn = document.getElementById("startBtn");
const ticketStartBtn = document.getElementById("ticketStartBtn");
const instructionsBtn = document.getElementById("instructionsBtn");
const instructionsModal = document.getElementById("instructionsModal");
const closeInstructionsBtn = document.getElementById("closeInstructionsBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const toggleSfx = document.getElementById("toggleSfx");
const toggleMusic = document.getElementById("toggleMusic");
const settingsActions = document.getElementById("settingsActions");
const restartDayBtn = document.getElementById("restartDayBtn");
const mainMenuBtn = document.getElementById("mainMenuBtn");
const bgMusic = document.getElementById("bgMusic");

const dayIntroText = document.getElementById("dayIntroText");
const dayClosedText = document.getElementById("dayClosedText");
const startTomorrowBtn = document.getElementById("startTomorrowBtn");

const timeBox = document.getElementById("timeBox");
const timeText = document.getElementById("timeText");
const posTimerBox = document.getElementById("posTimerBox");
const posTimerText = document.getElementById("posTimerText");
const posTimerPenaltyPopup = document.getElementById("posTimerPenaltyPopup");
const dayNumber = document.getElementById("dayNumber");
const satisfactionBarFill = document.getElementById("satisfactionBarFill");
const satisfactionBarLabel = document.getElementById("satisfactionBarLabel");
const satisfactionEmoji = document.getElementById("satisfactionEmoji");

const textBubble = document.getElementById("textBubble");
const orderText = document.getElementById("orderText");
const huhBtn = document.getElementById("huhBtn");
const okayBtn = document.getElementById("okayBtn");

const submitBtn = document.getElementById("submitBtn");
const posButtons = document.querySelectorAll(".pos-option-btn");
const posBackgroundImg = document.getElementById("posBackgroundImg");
const toppingSection = document.getElementById("toppingSection");
const posClickSound = new Audio("Assets/Audio/POSclick.mp3");
posClickSound.volume = 0.8;
const beepSound = new Audio("Assets/Audio/Beep.mp3");
beepSound.volume = 0.7;
const huhSound = new Audio("Assets/Audio/HuhSFX.mp3");
huhSound.volume = 0.6;
const okSound = new Audio("Assets/Audio/okSFX.mp3");
okSound.volume = 0.65;

if (bgMusic) {
  bgMusic.volume = 0.4;
}

if (storyMusic) {
  storyMusic.loop = false;
  storyMusic.volume = 0.5;
  storyMusic.playbackRate = 0.81;
}

const feedbackText = document.getElementById("feedbackText");
const nextBtn = document.getElementById("nextBtn");

// ============================================================================
// UTILITIES
// ============================================================================
function showScreen(screenEl) {
  screens.forEach((screen) => screen.classList.remove("active"));
  screenEl.classList.add("active");

  const showTime = screenEl === orderScreen || screenEl === feedbackScreen;
  const showPosTimer = screenEl === orderScreen || screenEl === posScreen;
  timeBox.classList.toggle("hidden", !showTime);
  posTimerBox.classList.toggle("hidden", !showPosTimer);
  if (posTimerPenaltyPopup) {
    if (!showPosTimer) {
      if (posTimerPopupTimeoutId) {
        clearTimeout(posTimerPopupTimeoutId);
        posTimerPopupTimeoutId = null;
      }
      posTimerPenaltyPopup.classList.add("hidden");
      posTimerPenaltyPopup.classList.remove(
        "penalty-yellow",
        "penalty-red",
        "popup-animate",
      );
      posTimerPenaltyPopup.textContent = "";
    }
  }

  if (!showPosTimer && screenEl !== orderScreen) {
    stopPosRoundTimer();
  }
}

function getCustomerCountForDay(day) {
  return dayCustomerCounts[day] || dayCustomerCounts[4];
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function formatTime(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function updateTimeDisplay(minutes) {
  timeText.textContent = formatTime(minutes);
}

function clearStoryIntroTimers() {
  if (storyTransitionStepTimeoutId) {
    clearTimeout(storyTransitionStepTimeoutId);
    storyTransitionStepTimeoutId = null;
  }

  if (storyTransitionCleanupTimeoutId) {
    clearTimeout(storyTransitionCleanupTimeoutId);
    storyTransitionCleanupTimeoutId = null;
  }

  if (storyEndFadeTimeoutId) {
    clearTimeout(storyEndFadeTimeoutId);
    storyEndFadeTimeoutId = null;
  }
}

function playStoryMusic() {
  if (!storyMusic || !isMusicEnabled) return;

  storyMusic.loop = false;
  storyMusic.volume = 0.5;
  storyMusic.playbackRate = 0.81;
  storyMusic.currentTime = 0;
  storyMusic.play().catch(() => {});
}

function stopStoryMusic() {
  if (!storyMusic) return;

  storyMusic.pause();
  storyMusic.currentTime = 0;
}

function setStoryScene(index) {
  if (!storySceneImage) return;

  const safeIndex = clamp(index, 0, STORY_SCENE_PATHS.length - 1);
  storySceneImage.src = STORY_SCENE_PATHS[safeIndex];
  storySceneImage.alt = `Story scene ${safeIndex + 1}`;
}

function hideStoryCursorArrow() {
  if (!storyScreen || !storyNextArrow) return;
  storyScreen.classList.remove("show-cursor-arrow");
}

function updateStoryCursorArrowPosition(event) {
  if (!storyScreen || !storyNextArrow) return;

  storyNextArrow.style.left = `${event.clientX}px`;
  storyNextArrow.style.top = `${event.clientY}px`;
  storyScreen.classList.add("show-cursor-arrow");
}

function startIntroStorySequence() {
  if (!storyScreen || !storySceneImage || STORY_SCENE_PATHS.length === 0) {
    stopStoryMusic();
    showScreen(startScreen);
    return;
  }

  hasShownIntroStory = true;
  clearStoryIntroTimers();

  storySceneIndex = 0;
  isStoryTransitioning = false;
  setStoryScene(storySceneIndex);
  storyScreen.classList.remove("is-transitioning");
  storyScreen.classList.remove("is-ending");
  hideStoryCursorArrow();
  playStoryMusic();
  showScreen(storyScreen);
  storyScreen.focus();
}

function advanceIntroStoryScene() {
  if (!storyScreen || !storyScreen.classList.contains("active")) return;
  if (isStoryTransitioning) return;

  const isLastScene = storySceneIndex >= STORY_SCENE_PATHS.length - 1;
  if (isLastScene) {
    clearStoryIntroTimers();
    isStoryTransitioning = true;
    storyScreen.classList.remove("is-transitioning");
    storyScreen.classList.add("is-ending");
    hideStoryCursorArrow();

    storyEndFadeTimeoutId = setTimeout(() => {
      storyScreen.classList.remove("is-ending");
      isStoryTransitioning = false;
      stopStoryMusic();
      showScreen(startScreen);
      storyEndFadeTimeoutId = null;
    }, STORY_END_FADE_DURATION_MS);
    return;
  }

  isStoryTransitioning = true;
  storyScreen.classList.add("is-transitioning");

  storyTransitionStepTimeoutId = setTimeout(
    () => {
      storySceneIndex += 1;
      setStoryScene(storySceneIndex);
      storyTransitionStepTimeoutId = null;
    },
    Math.floor(STORY_TRANSITION_DURATION_MS / 2),
  );

  storyTransitionCleanupTimeoutId = setTimeout(() => {
    storyScreen.classList.remove("is-transitioning");
    isStoryTransitioning = false;
    storyTransitionCleanupTimeoutId = null;
  }, STORY_TRANSITION_DURATION_MS);
}

function playPosClickSound() {
  try {
    posClickSound.currentTime = 0;
    posClickSound.play().catch(() => {});
  } catch {
    // Ignore autoplay or decoding issues.
  }
}

function playBeepSound() {
  try {
    beepSound.currentTime = 0;
    beepSound.play().catch(() => {});
  } catch {
    // Ignore autoplay or decoding issues.
  }
}

function applyAudioSettings() {
  const shouldMuteSfx = !isSfxEnabled;
  posClickSound.muted = shouldMuteSfx;
  beepSound.muted = shouldMuteSfx;
  huhSound.muted = shouldMuteSfx;
  okSound.muted = shouldMuteSfx;

  if (!bgMusic) return;

  bgMusic.muted = !isMusicEnabled;
  if (!isMusicEnabled) {
    bgMusic.pause();
    return;
  }

  if (currentDay >= 1 && startScreen.classList.contains("active") === false) {
    bgMusic.play().catch(() => {});
  }
}

function pauseGameForSettings() {
  if (isGamePausedBySettings) return;

  isGamePausedBySettings = true;
  pausedPosRemainingSeconds = null;

  if (!posRoundStartedAt) return;

  const { limitSeconds } = getPosTimerConfigForDay(currentDay);
  const elapsedSeconds = Math.floor((Date.now() - posRoundStartedAt) / 1000);
  pausedPosRemainingSeconds = Math.max(0, limitSeconds - elapsedSeconds);
  stopPosRoundTimer();
  posRoundStartedAt = null;
  updatePosTimerVisual(pausedPosRemainingSeconds);
}

function resumeGameFromSettings() {
  if (!isGamePausedBySettings) return;

  isGamePausedBySettings = false;

  const canResumeTimer =
    pausedPosRemainingSeconds !== null &&
    !posTimerExpired &&
    (orderScreen.classList.contains("active") ||
      posScreen.classList.contains("active"));

  if (canResumeTimer) {
    startPosRoundTimer(pausedPosRemainingSeconds);
  }

  pausedPosRemainingSeconds = null;
}

function closeSettingsAndResume() {
  settingsModal.classList.add("hidden");
  resumeGameFromSettings();
}

function resetTransientGameState() {
  stopPosRoundTimer();
  posRoundStartedAt = null;
  posTimerExpired = false;
  posTimerState = null;
  pausedPosRemainingSeconds = null;
  isGamePausedBySettings = false;
}

function getPosTimerConfigForDay(day) {
  if (day <= 1) {
    return {
      limitSeconds: 25,
      goodThresholdSeconds: 15,
      okThresholdSeconds: 5,
    };
  }

  return {
    limitSeconds: 20,
    goodThresholdSeconds: 10,
    okThresholdSeconds: 5,
  };
}

function getPosTimerPenalty(remainingSeconds) {
  const { goodThresholdSeconds, okThresholdSeconds } =
    getPosTimerConfigForDay(currentDay);

  if (remainingSeconds > goodThresholdSeconds) return 0;
  if (remainingSeconds > okThresholdSeconds) return 5;
  return 10;
}

function formatElapsedTimer(elapsedSeconds) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function showPosTimerPenaltyPopup(text, variant) {
  if (!posTimerPenaltyPopup) return;

  if (posTimerPopupTimeoutId) {
    clearTimeout(posTimerPopupTimeoutId);
    posTimerPopupTimeoutId = null;
  }

  posTimerPenaltyPopup.textContent = text;
  posTimerPenaltyPopup.classList.remove(
    "hidden",
    "penalty-yellow",
    "penalty-red",
    "popup-animate",
  );
  posTimerPenaltyPopup.classList.add(variant);

  // Restart animation each time popup is shown
  void posTimerPenaltyPopup.offsetWidth;
  posTimerPenaltyPopup.classList.add("popup-animate");

  posTimerPopupTimeoutId = setTimeout(() => {
    posTimerPenaltyPopup.classList.add("hidden");
    posTimerPenaltyPopup.classList.remove(
      "penalty-yellow",
      "penalty-red",
      "popup-animate",
    );
    posTimerPenaltyPopup.textContent = "";
    posTimerPopupTimeoutId = null;
  }, 2000);
}

function updatePosTimerVisual(remainingSeconds) {
  if (!posTimerBox || !posTimerText) return;

  const { goodThresholdSeconds, okThresholdSeconds } =
    getPosTimerConfigForDay(currentDay);

  posTimerText.textContent = formatElapsedTimer(remainingSeconds);
  posTimerBox.classList.remove(
    "pos-timer-good",
    "pos-timer-warn",
    "pos-timer-late",
  );

  let nextState = "good";
  if (remainingSeconds > goodThresholdSeconds) {
    posTimerBox.classList.add("pos-timer-good");
  } else if (remainingSeconds > okThresholdSeconds) {
    posTimerBox.classList.add("pos-timer-warn");
    nextState = "warn";
  } else {
    posTimerBox.classList.add("pos-timer-late");
    nextState = "late";
  }

  if (nextState !== posTimerState) {
    if (nextState === "warn") {
      showPosTimerPenaltyPopup("-5 satisfaction", "penalty-yellow");
    } else if (nextState === "late") {
      showPosTimerPenaltyPopup("-10 satisfaction", "penalty-red");
    } else if (posTimerPenaltyPopup) {
      if (posTimerPopupTimeoutId) {
        clearTimeout(posTimerPopupTimeoutId);
        posTimerPopupTimeoutId = null;
      }
      posTimerPenaltyPopup.classList.add("hidden");
      posTimerPenaltyPopup.classList.remove(
        "penalty-yellow",
        "penalty-red",
        "popup-animate",
      );
      posTimerPenaltyPopup.textContent = "";
    }
    posTimerState = nextState;
  }
}

function startPosRoundTimer(initialRemainingSeconds = null) {
  stopPosRoundTimer();
  const { limitSeconds } = getPosTimerConfigForDay(currentDay);
  const startRemainingSeconds =
    initialRemainingSeconds === null
      ? limitSeconds
      : clamp(Math.floor(initialRemainingSeconds), 0, limitSeconds);
  posRoundStartedAt =
    Date.now() - (limitSeconds - startRemainingSeconds) * 1000;
  posTimerState = null;
  updatePosTimerVisual(startRemainingSeconds);

  posRoundTimerId = setInterval(() => {
    if (!posRoundStartedAt) return;
    const elapsedSeconds = Math.floor((Date.now() - posRoundStartedAt) / 1000);
    const remainingSeconds = Math.max(0, limitSeconds - elapsedSeconds);
    updatePosTimerVisual(remainingSeconds);

    if (remainingSeconds <= 0) {
      handlePosTimerExpired();
    }
  }, 200);
}

function handlePosTimerExpired() {
  if (posTimerExpired) return;
  posTimerExpired = true;

  stopPosRoundTimer();
  posRoundStartedAt = null;

  if (huhBtn) huhBtn.classList.add("hidden");
  if (okayBtn) okayBtn.classList.add("hidden");

  if (orderText) {
    orderText.textContent = "*impatiently leaves*";
    textBubble.style.animation = "none";
    void textBubble.offsetWidth;
    textBubble.style.animation = "fadeIn 0.3s ease-in";
  }

  showTimeoutResponse();

  if (levelSession) {
    levelSession.onOrderTimedOut();
  }

  setTimeout(() => {
    currentCustomerIndex += 1;
    beginCurrentCustomer();
  }, 1500);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (
    button.id === "huhBtn" ||
    button.id === "okayBtn" ||
    button.id === "settingsBtn" ||
    button.id === "closeSettingsBtn"
  )
    return;
  if (button.closest("#posScreen")) return;

  playBeepSound();
});

function stopPosRoundTimer() {
  if (posRoundTimerId) {
    clearInterval(posRoundTimerId);
    posRoundTimerId = null;
  }
}

function finalizePosRoundTiming() {
  if (!posRoundStartedAt) {
    return { elapsedSeconds: 0, remainingSeconds: 0, penalty: 0 };
  }

  const { limitSeconds } = getPosTimerConfigForDay(currentDay);
  const elapsedSeconds = Math.floor((Date.now() - posRoundStartedAt) / 1000);
  const remainingSeconds = Math.max(0, limitSeconds - elapsedSeconds);
  const penalty = getPosTimerPenalty(remainingSeconds);
  stopPosRoundTimer();
  posRoundStartedAt = null;

  return { elapsedSeconds, remainingSeconds, penalty };
}

function updateSatisfactionBar() {
  if (!levelSession) return;

  const happiness = levelSession.happinessBar.getValue();

  if (happiness <= 10) {
    satisfactionEmoji.src = "Assets/emojis/very_angry.png";
  } else if (happiness <= 30) {
    satisfactionEmoji.src = "Assets/emojis/annoyed.png";
  } else if (happiness <= 60) {
    satisfactionEmoji.src = "Assets/emojis/neutral.png";
  } else if (happiness <= 85) {
    satisfactionEmoji.src = "Assets/emojis/happy.png";
  } else {
    satisfactionEmoji.src = "Assets/emojis/very_happy.png";
  }
  const renderData =
    window.SatisfactionBarSystem.getHappinessBarRender(happiness);

  satisfactionBarFill.style.width = `${renderData.widthPct}%`;
  satisfactionBarLabel.textContent = renderData.label;

  // Update color based on happiness level
  if (happiness <= 20) {
    satisfactionBarFill.style.background =
      "linear-gradient(90deg, #f44336 0%, #e57373 100%)";
  } else if (happiness <= 50) {
    satisfactionBarFill.style.background =
      "linear-gradient(90deg, #ff9800 0%, #ffb74d 100%)";
  } else {
    satisfactionBarFill.style.background =
      "linear-gradient(90deg, #4caf50 0%, #8bc34a 50%, #cddc39 100%)";
  }

  if (timeBox) {
    if (satisfactionGlowTimeoutId) {
      clearTimeout(satisfactionGlowTimeoutId);
      satisfactionGlowTimeoutId = null;
    }

    timeBox.classList.remove("satisfaction-glow");
    void timeBox.offsetWidth;
    timeBox.classList.add("satisfaction-glow");

    satisfactionGlowTimeoutId = setTimeout(() => {
      timeBox.classList.remove("satisfaction-glow");
      satisfactionGlowTimeoutId = null;
    }, 800);
  }

  // Update end-of-day satisfaction display in real-time
  updateEndOfDaySatisfaction();
}

function updateEndOfDaySatisfaction() {
  if (!levelSession) return;

  const happiness = levelSession.happinessBar.getValue();
  const renderData =
    window.SatisfactionBarSystem.getHappinessBarRender(happiness);

  const enddaySatisfactionSpan = document.getElementById("enddaySatisfaction");
  const enddaySatisfactionLabelSpan = document.getElementById(
    "enddaySatisfactionLabel",
  );

  if (enddaySatisfactionSpan) {
    enddaySatisfactionSpan.textContent = renderData.label;
  }
  if (enddaySatisfactionLabelSpan) {
    enddaySatisfactionLabelSpan.textContent = "";
  }
}

function updatePosButtonsForDay(day) {
  posButtons.forEach((button) => {
    const minDay = Number(button.dataset.minDay || "1");
    const shouldShow = day >= minDay;

    button.classList.toggle("hidden", !shouldShow);
    if (!shouldShow) {
      button.classList.remove("selected");
      const category = button.dataset.category;
      if (posState[category] === button.dataset.value) {
        posState[category] = null;
      }
    }
  });

  if (toppingSection) {
    toppingSection.classList.toggle("hidden", day < 3);
  }
}

function generateDaySchedule(customerCount) {
  const start = 9 * 60;
  const end = 16 * 60 + 59;
  const span = end - start;
  const step = span / (customerCount + 1);

  const result = [];
  let prev = start;

  for (let i = 0; i < customerCount; i++) {
    const center = start + step * (i + 1);
    const jitter = Math.floor(step * 0.22);
    const offset = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
    let t = Math.round(center + offset);
    t = clamp(t, prev + 15, end - (customerCount - i - 1) * 10);
    result.push(t);
    prev = t;
  }

  return result;
}

function renderNextDayMenu(day) {
  const el = document.getElementById("nextDayMenuItems");
  if (!el) return;

  const items = menuItemsByDay[day] || [];

  if (items.length === 0) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = items.map((item) => `<p>- ${item}</p>`).join("");
}
function getWrongOrderCount(stats) {
  if (typeof stats.failedOrders === "number") return stats.failedOrders;
  if (typeof stats.wrongOrders === "number") return stats.wrongOrders;

  if (
    typeof stats.totalOrders === "number" &&
    typeof stats.correctOrders === "number"
  ) {
    return Math.max(0, stats.totalOrders - stats.correctOrders);
  }

  if (
    typeof stats.totalOrders === "number" &&
    typeof stats.successRate === "number"
  ) {
    const estimatedCorrect = Math.round(stats.totalOrders * stats.successRate);
    return Math.max(0, stats.totalOrders - estimatedCorrect);
  }

  return 0;
}

function getSatisfactionLabel(successRate) {
  const pct = successRate * 100;
  if (pct >= 90) return "Excellent";
  if (pct >= 75) return "Good";
  if (pct >= 60) return "Okay";
  return "Needs Work";
}

// ============================================================================
// ORDER WORD CLARIFICATION
// ============================================================================
function getPartEditDistance(from, to) {
  const minLen = Math.min(from.length, to.length);
  let diff = 0;

  for (let i = 0; i < minLen; i++) {
    if (from[i].toLowerCase() !== to[i].toLowerCase()) {
      diff++;
    }
  }

  diff += Math.abs(from.length - to.length);
  return diff;
}

function applyStepsTowardsCanonical(from, to, steps) {
  if (steps <= 0 || from === to) {
    return { text: from, used: 0 };
  }

  const chars = from.split("");
  let used = 0;
  const minLen = Math.min(chars.length, to.length);

  for (let i = 0; i < minLen && used < steps; i++) {
    if (chars[i].toLowerCase() !== to[i].toLowerCase()) {
      chars[i] = to[i];
      used++;
    }
  }

  while (chars.length > to.length && used < steps) {
    chars.pop();
    used++;
  }

  while (chars.length < to.length && used < steps) {
    chars.push(to[chars.length]);
    used++;
  }

  return { text: chars.join(""), used };
}

function hashStringToSeed(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function applyRandomClarifySteps(order, totalSteps) {
  if (!order || !order.parts || !order.codedIndices || totalSteps <= 0) {
    return order?.parts ? [...order.parts] : [];
  }

  const displayParts = [...order.parts];
  const seedSource = `${order.id || order.text || "order"}:${currentDay}`;
  const seed = hashStringToSeed(seedSource);
  const rng = new window.AlienCafeOrderSystem.SeededRNG(seed);

  for (let step = 0; step < totalSteps; step++) {
    const candidates = [];

    for (const partIndex of order.codedIndices) {
      const tokenKey = order.drinkTokens[partIndex];
      const canonical = order.tokenCanonicalMap[tokenKey];
      const current = displayParts[partIndex];
      const minLen = Math.min(current.length, canonical.length);

      for (let i = 0; i < minLen; i++) {
        if (current[i].toLowerCase() !== canonical[i].toLowerCase()) {
          candidates.push({ type: "replace", partIndex, charIndex: i });
        }
      }

      if (current.length > canonical.length) {
        candidates.push({ type: "remove", partIndex });
      } else if (current.length < canonical.length) {
        candidates.push({ type: "append", partIndex });
      }
    }

    if (candidates.length === 0) break;

    const pick = candidates[Math.floor(rng.random() * candidates.length)];
    const tokenKey = order.drinkTokens[pick.partIndex];
    const canonical = order.tokenCanonicalMap[tokenKey];
    const chars = displayParts[pick.partIndex].split("");

    if (pick.type === "replace") {
      chars[pick.charIndex] = canonical[pick.charIndex];
    } else if (pick.type === "remove") {
      chars.pop();
    } else if (pick.type === "append") {
      chars.push(canonical[chars.length]);
    }

    displayParts[pick.partIndex] = chars.join("");
  }

  return displayParts;
}

function getTotalClarifySteps(order) {
  if (!order || !order.parts || !order.codedIndices) return 0;

  let total = 0;
  for (const partIndex of order.codedIndices) {
    const tokenKey = order.drinkTokens[partIndex];
    const canonical = order.tokenCanonicalMap[tokenKey];
    total += getPartEditDistance(order.parts[partIndex], canonical);
  }

  return total;
}

function buildOrderSentenceWithClarifications() {
  // Build the sentence with clarifications applied
  if (!currentOrder || !currentOrder.parts) {
    return currentOrder?.text || "Loading...";
  }

  const totalSteps = huhClickCount * CLARIFY_STEPS_PER_HUH;
  const displayParts = applyRandomClarifySteps(currentOrder, totalSteps);

  // Rebuild sentence from parts
  let text = "";
  for (let i = 0; i < displayParts.length; i++) {
    const chunk = displayParts[i];
    if (i === 0) {
      text += chunk;
    } else {
      // Add spaces based on space drop probability (we'll just add spaces for clarity)
      text += " " + chunk;
    }
  }

  // Add punctuation
  if (!/[?!]$/.test(text)) text += "?";
  if (text.indexOf(",") === -1) {
    const firstSpace = text.indexOf(" ");
    if (firstSpace > 0) {
      text = text.slice(0, firstSpace) + "," + text.slice(firstSpace);
    }
  }

  return text;
}

function updateOrderDisplay() {
  // With the new phonetic chaos system, the order text is already generated
  // We just need to display it
  if (!currentOrder || !currentOrder.text) {
    console.error(
      "currentOrder or currentOrder.text is undefined",
      currentOrder,
    );
    return;
  }

  const displayText = buildOrderSentenceWithClarifications();
  textBubble.style.animation = "none";
  setTimeout(() => {
    orderText.textContent = displayText;
    textBubble.style.animation = "fadeIn 0.3s ease-in";
  }, 10);
}

// ============================================================================
// FLOW: DAY / CUSTOMERS
// ============================================================================
function startDay(day) {
  hasGameStarted = true;
  if (settingsActions) {
    settingsActions.classList.remove("hidden");
  }

  resetTransientGameState();
  currentDay = day;
  currentCustomerIndex = 0;
  currentCustomerTimes = generateDaySchedule(getCustomerCountForDay(day));

  // Initialize satisfaction bar system
  const customersTarget = getCustomerCountForDay(day);
  levelSession = new window.SatisfactionBarSystem.LevelSession({
    level: day,
    customersTarget: customersTarget,
  });
  updateSatisfactionBar();
  updatePosButtonsForDay(currentDay);

  dayNumber.textContent = `Day ${currentDay}`;
  dayIntroText.textContent = `Day ${currentDay}`;
  showScreen(dayIntroScreen);

  setTimeout(() => {
    beginCurrentCustomer();
  }, 1000);
}

function beginCurrentCustomer() {
  // Safety check: ensure currentCustomerTimes is initialized
  if (!currentCustomerTimes || currentCustomerTimes.length === 0) {
    console.error("currentCustomerTimes not properly initialized");
    dayClosedText.textContent = `Day ${currentDay} Closed`;
    showScreen(dayClosedScreen);
    return;
  }

  // Check if we've served all customers
  if (currentCustomerIndex >= currentCustomerTimes.length) {
    dayClosedText.textContent = `Day ${currentDay} Closed`;
    showScreen(dayClosedScreen);
    return;
  }

  updateTimeDisplay(currentCustomerTimes[currentCustomerIndex]);
  startNewOrder();
}

function startNewOrder() {
  huhClickCount = 0;
  posTimerExpired = false;
  clarifiedTokens = {
    matchaWord: false,
    tempWord: false,
    strawberryWord: false,
  };

  posState.temperature = null;
  posState.base = null;
  posState.flavour = null;
  posState.topping = null;

  // Select a random alien (1-3) for this order
  currentAlienNumber = Math.floor(Math.random() * 3) + 1;

  // Update alien display to normal state
  const alien = orderScreen.querySelector(".alien");
  if (alien) {
    alien.style.backgroundImage = `url(Assets/alien${currentAlienNumber}_normal.png)`;
  }

  try {
    const randomSeed = Date.now() + Math.random() * 1000000;
    const rng = new window.AlienCafeOrderSystem.SeededRNG(randomSeed);
    const difficulty = clamp(currentDay, 1, 5);
    currentOrder = window.AlienCafeOrderSystem.generateOrder(difficulty, rng);

    if (!currentOrder) {
      console.error("generateOrder returned undefined");
      return;
    }
  } catch (e) {
    console.error("Error generating order:", e);
    return;
  }

  // Show Huh button if there are coded words to clarify
  const totalClarifySteps = getTotalClarifySteps(currentOrder);
  okayBtn.classList.remove("hidden");
  if (totalClarifySteps > 0) {
    huhBtn.classList.remove("hidden");
  } else {
    huhBtn.classList.add("hidden");
  }

  updateOrderDisplay();
  startPosRoundTimer();
  updateOrderScreenBackground();
  showScreen(orderScreen);
}

function updateOrderScreenBackground() {
  const backgrounds = [
    "InteriorDay.png",
    "InteriorSunset.png",
    "InteriorNight.png",
  ];
  const totalCustomers = getCustomerCountForDay(currentDay);

  // Distribute backgrounds evenly across customers
  let backgroundIndex;
  if (totalCustomers === 3) {
    // Day 1: day (0), sunset (1), night (2)
    backgroundIndex = currentCustomerIndex;
  } else if (totalCustomers === 4) {
    // Day 2: day (0), day (1), sunset (2), night (3)
    if (currentCustomerIndex <= 1) backgroundIndex = 0;
    else if (currentCustomerIndex === 2) backgroundIndex = 1;
    else backgroundIndex = 2;
  } else {
    // Day 3+: distribute evenly
    const segment = totalCustomers / backgrounds.length;
    backgroundIndex = Math.min(
      Math.floor(currentCustomerIndex / segment),
      backgrounds.length - 1,
    );
  }

  const backgroundImage = backgrounds[backgroundIndex];
  orderScreen.style.backgroundImage = `url('Assets/${backgroundImage}')`;
  orderScreen.style.backgroundSize = "cover";
  orderScreen.style.backgroundPosition = "center";
}

// ============================================================================
// ORDER SCREEN EVENTS
// ============================================================================
huhBtn.addEventListener("click", () => {
  try {
    huhSound.currentTime = 0;
    huhSound.play().catch(() => {});
  } catch {
    // Ignore autoplay or decoding issues.
  }

  const totalClarifySteps = getTotalClarifySteps(currentOrder);
  const maxHuhClicks = Math.ceil(totalClarifySteps / CLARIFY_STEPS_PER_HUH);

  if (huhClickCount >= maxHuhClicks) {
    huhBtn.classList.add("hidden");
    return;
  }

  huhClickCount += 1;
  updateOrderDisplay();

  // Apply huh penalty to satisfaction bar
  if (levelSession) {
    levelSession.onHuh();
    updateSatisfactionBar();

    // Check if level failed
    if (levelSession.status === "failed") {
      showFailureScreen();
      return;
    }
  }

  if (huhClickCount >= maxHuhClicks) {
    huhBtn.classList.add("hidden");
  }
});

okayBtn.addEventListener("click", () => {
  try {
    okSound.currentTime = 0;
    okSound.play().catch(() => {});
  } catch {
    // Ignore autoplay or decoding issues.
  }

  posButtons.forEach((btn) => btn.classList.remove("selected"));

  // Update POS background to match order screen time of day
  const backgrounds = ["POSDay.png", "POSSunset.png", "POSNight.png"];
  const totalCustomers = getCustomerCountForDay(currentDay);

  let backgroundIndex;
  if (totalCustomers === 3) {
    backgroundIndex = currentCustomerIndex;
  } else if (totalCustomers === 4) {
    if (currentCustomerIndex <= 1) backgroundIndex = 0;
    else if (currentCustomerIndex === 2) backgroundIndex = 1;
    else backgroundIndex = 2;
  } else {
    const segment = totalCustomers / backgrounds.length;
    backgroundIndex = Math.min(
      Math.floor(currentCustomerIndex / segment),
      backgrounds.length - 1,
    );
  }

  posBackgroundImg.src = `Assets/${backgrounds[backgroundIndex]}`;
  updatePosButtonsForDay(currentDay);

  showScreen(posScreen);
});

// ============================================================================
// POS EVENTS
// ============================================================================
posButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playPosClickSound();

    const category = button.dataset.category;
    const value = button.dataset.value;
    const isAlreadySelected = button.classList.contains("selected");

    posButtons.forEach((btn) => {
      if (btn.dataset.category === category) btn.classList.remove("selected");
    });

    if (isAlreadySelected) {
      posState[category] = null;
    } else {
      button.classList.add("selected");
      posState[category] = value;
    }
  });
});

submitBtn.addEventListener("click", () => {
  playPosClickSound();

  if (!posState.temperature || !posState.base) return;

  const { penalty: posTimePenalty } = finalizePosRoundTiming();

  const playerSelection = {
    drinkMatcha: posState.base === "matcha",
    temp: posState.temperature,
    flavour: posState.flavour,
    topping: posState.topping,
    strawberry: posState.flavour === "strawberry",
  };

  const gradeResult = window.AlienCafeOrderSystem.gradeOrder(
    currentOrder,
    playerSelection,
  );

  // Update satisfaction bar with order result
  if (levelSession) {
    if (posTimePenalty > 0) {
      levelSession.happinessBar.applyPenalty(
        posTimePenalty,
        levelSession.successRate,
        false,
      );
    }

    levelSession.onOrderSubmitted(currentOrder, playerSelection);
    updateSatisfactionBar();

    // Check level status
    if (levelSession.status === "failed") {
      showFailureScreen();
      return;
    } else if (levelSession.status === "completed") {
      showVictoryScreen();
      return;
    }
  }

  showFeedback(gradeResult);
});

// ============================================================================
// FEEDBACK
// ============================================================================
function getSimpleFeedbackText(gradeResult) {
  const perfectPool = ["*Happy alien noises*"];
  const wrongPool = ["*Disappointed alien noises*", "*Sad alien noises*"];

  if (gradeResult.accuracy === 1) {
    return perfectPool[Math.floor(Math.random() * perfectPool.length)];
  }

  return wrongPool[Math.floor(Math.random() * wrongPool.length)];
}

function showFeedback(gradeResult) {
  feedbackText.textContent = getSimpleFeedbackText(gradeResult);

  const alien = feedbackScreen.querySelector(".alien");

  // Determine emotion based on accuracy
  let emotion = "happy"; // default
  if (gradeResult.accuracy === 0) {
    emotion = "angry";
  }

  const imagePath = `url(Assets/alien${currentAlienNumber}_${emotion}.png)`;
  alien.style.backgroundImage = imagePath;

  // Match the order screen background
  feedbackScreen.style.backgroundImage = orderScreen.style.backgroundImage;
  feedbackScreen.style.backgroundSize = "cover";
  feedbackScreen.style.backgroundPosition = "center";

  showScreen(feedbackScreen);
}

function showTimeoutResponse() {
  const alien = feedbackScreen.querySelector(".alien");

  feedbackText.textContent = "*impatiently leaves*";
  if (alien) {
    alien.style.backgroundImage = `url(Assets/alien${currentAlienNumber}_angry.png)`;
  }

  feedbackScreen.style.backgroundImage = orderScreen.style.backgroundImage;
  feedbackScreen.style.backgroundSize = "cover";
  feedbackScreen.style.backgroundPosition = "center";

  showScreen(feedbackScreen);
}

function showVictoryScreen() {
  const stats = levelSession.getStats();
  const successRate = stats.successRate ?? 1;
  const successPct = Math.round(successRate * 100);
  const failedOrders = getWrongOrderCount(stats);

  document.getElementById("dayClosedTitle").textContent =
    `DAY ${currentDay} COMPLETE`;
  document.getElementById("enddayFailedOrders").textContent = failedOrders;
  document.getElementById("enddaySuccessRate").textContent = `${successPct}%`;

  updateEndOfDaySatisfaction();

  const menuHeading = document.querySelector(".endday-menu-heading");
  if (menuHeading) {
    menuHeading.textContent = "NEW MENU ITEMS:";
  }

  renderNextDayMenu(currentDay + 1);

  startTomorrowBtn.textContent = "Start Tomorrow";
  showScreen(dayClosedScreen);
}

function showFailureScreen() {
  const stats = levelSession.getStats();
  const successRate = stats.successRate ?? 0;
  const successPct = Math.round(successRate * 100);
  const failedOrders = getWrongOrderCount(stats);

  const failureMessages = [
    "Nice try. But the aliens were not a fan of your service. Try today again.",
    "Oops! The aliens are not happy. Better luck next time. Try today again.",
    "Yikes! The aliens gave up on you. Try today again.",
    "Not quite right. The aliens need a better barista. Try today again.",
  ];

  const randomMessage =
    failureMessages[Math.floor(Math.random() * failureMessages.length)];

  document.getElementById("dayClosedTitle").textContent =
    `DAY ${currentDay} FAILED`;

  document.getElementById("enddayFailedOrders").textContent = failedOrders;
  document.getElementById("enddaySuccessRate").textContent = `${successPct}%`;

  updateEndOfDaySatisfaction();

  // Replace new menu items with failure message
  const menuHeading = document.querySelector(".endday-menu-heading");
  const nextDayMenuItems = document.getElementById("nextDayMenuItems");

  if (menuHeading) {
    menuHeading.textContent = "TRY AGAIN:";
  }

  if (nextDayMenuItems) {
    nextDayMenuItems.innerHTML = `<p>${randomMessage}</p>`;
  }

  startTomorrowBtn.textContent = "Retry Day";
  showScreen(dayClosedScreen);
}

nextBtn.addEventListener("click", () => {
  currentCustomerIndex += 1;
  beginCurrentCustomer();
});

// ============================================================================
// START / DAY CONTROL EVENTS
// ============================================================================
startBtn.addEventListener("click", () => {
  showScreen(ticketScreen);
});

ticketStartBtn.addEventListener("click", () => {
  if (bgMusic && isMusicEnabled) {
    bgMusic.play().catch(() => {});
  }

  startDay(currentDay);
});

instructionsBtn.addEventListener("click", () => {
  instructionsModal.classList.remove("hidden");
});

closeInstructionsBtn.addEventListener("click", () => {
  instructionsModal.classList.add("hidden");
});

settingsBtn.addEventListener("click", () => {
  settingsModal.classList.remove("hidden");
  pauseGameForSettings();
});

closeSettingsBtn.addEventListener("click", () => {
  closeSettingsAndResume();
});

closeSettingsBtn.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  closeSettingsAndResume();
});

if (storyScreen) {
  storyScreen.addEventListener("click", () => {
    advanceIntroStoryScene();
  });

  storyScreen.addEventListener("mousemove", (event) => {
    updateStoryCursorArrowPosition(event);
  });

  storyScreen.addEventListener("mouseenter", (event) => {
    updateStoryCursorArrowPosition(event);
  });

  storyScreen.addEventListener("mouseleave", () => {
    hideStoryCursorArrow();
  });

  storyScreen.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    advanceIntroStoryScene();
  });
}

toggleSfx.addEventListener("change", () => {
  isSfxEnabled = toggleSfx.checked;
  applyAudioSettings();
});

toggleMusic.addEventListener("change", () => {
  isMusicEnabled = toggleMusic.checked;
  applyAudioSettings();
});

restartDayBtn.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Restart this day? Your current progress will be lost.",
  );
  if (!confirmed) return;

  settingsModal.classList.add("hidden");
  startDay(currentDay);
});

mainMenuBtn.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Return to Main Menu? Current day progress will be lost.",
  );
  if (!confirmed) return;

  settingsModal.classList.add("hidden");
  hasGameStarted = false;
  if (settingsActions) {
    settingsActions.classList.add("hidden");
  }
  resetTransientGameState();
  showScreen(startScreen);
});

startTomorrowBtn.addEventListener("click", () => {
  const shouldRetry = startTomorrowBtn.textContent === "Retry Day";
  startTomorrowBtn.textContent = "Start Tomorrow";

  if (shouldRetry) {
    startDay(currentDay);
  } else {
    startDay(currentDay + 1);
  }
});

toggleSfx.checked = isSfxEnabled;
toggleMusic.checked = isMusicEnabled;
applyAudioSettings();

// ============================================================================
// INITIAL SCREEN
// ============================================================================
if (hasShownIntroStory) {
  showScreen(startScreen);
} else {
  startIntroStorySequence();
}
