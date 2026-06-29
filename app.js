const CHARGE_PER_SESSION = 5;
const SESSION_SECONDS = 5 * 60;
const DECAY_INTERVAL_MS = 5 * 60 * 1000;
const DECAY_AMOUNT = 0;
const MAX_DAYS = 21;

const state = JSON.parse(localStorage.getItem('navigatorState') || '{}');

const appState = {
  charge: state.charge ?? 0,
  capacity: state.capacity ?? 0,
  day: state.day ?? 1,
  openedTiles: state.openedTiles ?? 0,
  mood: state.mood ?? 0,
  completionSeen: state.completionSeen ?? false,
  lastDecayAt: state.lastDecayAt ?? Date.now(),
  lastPresenceAt: state.lastPresenceAt ?? 0,
};

const batteryCard = document.querySelector('.battery-card');
const batteryFill = document.getElementById('batteryFill');
const chargeValue = document.getElementById('chargeValue');
const chargeStatus = document.getElementById('chargeStatus');
const capacityValue = document.getElementById('capacityValue');
const presenceButton = document.getElementById('presenceButton');
const demoButton = document.getElementById('demoButton');
const timerText = document.getElementById('timerText');
const dayCounter = document.getElementById('dayCounter');
const mapGrid = document.getElementById('mapGrid');
const mapText = document.getElementById('mapText');
const principleText = document.getElementById('principleText');
const completionCard = document.getElementById('completionCard');
const moodSlider = document.getElementById('moodSlider');
const moodValue = document.getElementById('moodValue');
const moodText = document.getElementById('moodText');

const principles = [
  'Энергия приходит не из приложения. Она приходит из контакта с реальностью.',
  'Присутствие — это вилка, включенная в розетку мира.',
  'Не нужно удерживать весь путь. Достаточно сделать следующий вдох.',
  'Внимание — это направление внутренней энергии.',
  'Каждое возвращение укрепляет способность возвращаться снова.',
  'Карта открывается не тем, кто спешит, а тем, кто остается в контакте.',
];

function save() {
  localStorage.setItem('navigatorState', JSON.stringify({
    charge: appState.charge,
    capacity: appState.capacity,
    day: appState.day,
    openedTiles: appState.openedTiles,
    mood: appState.mood,
    completionSeen: appState.completionSeen,
    lastDecayAt: appState.lastDecayAt,
    lastPresenceAt: appState.lastPresenceAt,
  }));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getPresenceRemainingMs() {
  if (!appState.lastPresenceAt) return 0;
  const elapsed = Date.now() - appState.lastPresenceAt;
  return clamp(SESSION_SECONDS * 1000 - elapsed, 0, SESSION_SECONDS * 1000);
}

function isPresenceCooldownActive() {
  return getPresenceRemainingMs() > 0;
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function applyDecay() {
  if (isPresenceCooldownActive()) return;

  const now = Date.now();
  const intervals = Math.floor((now - appState.lastDecayAt) / DECAY_INTERVAL_MS);

  if (intervals > 0) {
    appState.charge = Math.max(appState.capacity, appState.charge - intervals * DECAY_AMOUNT);
    appState.lastDecayAt += intervals * DECAY_INTERVAL_MS;
    save();
  }
}

function completeDayIfNeeded() {
  if (appState.charge < 100) return;

  const wasComplete = appState.openedTiles >= MAX_DAYS;

  appState.openedTiles = Math.min(MAX_DAYS, appState.openedTiles + 1);
  appState.capacity = Math.min(100, appState.capacity + 5);
  appState.day = Math.min(MAX_DAYS, appState.day + 1);
  appState.charge = appState.capacity;

  if (appState.openedTiles >= MAX_DAYS && !wasComplete) {
    appState.completionSeen = true;
    mapText.textContent = 'Карта первого этапа открыта полностью.';
  } else if (appState.openedTiles >= MAX_DAYS) {
    mapText.textContent = 'Первый этап завершён. Теперь путь можно поддерживать спокойнее.';
  } else {
    mapText.textContent = 'Фрагмент карты открыт. Завтра путь начнется уже с большей внутренней ёмкости.';
  }
}

function renderMap() {
  mapGrid.innerHTML = '';

  for (let i = 0; i < MAX_DAYS; i += 1) {
    const tile = document.createElement('div');
    tile.className = `map-tile ${i < appState.openedTiles ? 'open' : ''}`;
    mapGrid.appendChild(tile);
  }
}

function getMoodDescription(value) {
  if (value <= -70) return 'Сейчас мало ресурса. Достаточно просто заметить это и сделать один мягкий вдох.';
  if (value < -20) return 'Есть напряжение или усталость. Попробуй вернуться к телу и окружающему миру.';
  if (value <= 20) return 'Нейтральное состояние. Хороший момент спокойно наблюдать реальность.';
  if (value < 70) return 'Есть живость и устойчивость. Можно продолжать путь без спешки.';
  return 'Много энергии и света. Заметь это состояние и запомни, как оно ощущается.';
}

function renderMood() {
  const value = Number(appState.mood || 0);
  moodSlider.value = value;
  moodValue.textContent = `${value > 0 ? '+' : ''}${value}%`;
  moodText.textContent = getMoodDescription(value);
  document.documentElement.style.setProperty('--mood-position', `${(value + 100) / 2}%`);
}

function render() {
  applyDecay();

  const remainingMs = getPresenceRemainingMs();
  const cooldownActive = remainingMs > 0;

  batteryFill.style.height = `${appState.charge}%`;
  chargeValue.textContent = `${Math.round(appState.charge)}%`;
  capacityValue.textContent = `${appState.capacity}%`;

  dayCounter.textContent = appState.openedTiles >= MAX_DAYS
    ? 'Этап 1 завершён'
    : `День ${Math.min(appState.day, MAX_DAYS)} / ${MAX_DAYS}`;

  principleText.textContent = principles[(appState.day - 1) % principles.length];
  completionCard.classList.toggle('hidden', appState.openedTiles < MAX_DAYS);

  renderMood();

  batteryCard.classList.toggle('charging', cooldownActive);

  presenceButton.disabled = cooldownActive || appState.charge >= 100;
  demoButton.disabled = appState.charge >= 100;

  if (cooldownActive) {
    chargeStatus.textContent = 'Аккумулятор подключен';
    timerText.textContent = `${formatTime(remainingMs)} до следующего присутствия`;
  } else if (appState.charge >= 100) {
    chargeStatus.textContent = 'День наполнен';
    timerText.textContent = 'Карта готова открыть следующий фрагмент.';
  } else {
    chargeStatus.textContent = appState.charge > appState.capacity
      ? 'Энергия расходуется в жизни'
      : 'Аккумулятор ждёт подключения';

    timerText.textContent = 'Одно присутствие даёт +5% заряда.';
  }

  renderMap();
  save();
}

function addChargeImmediately({ startCooldown = true } = {}) {
  if (appState.charge >= 100) {
    render();
    return;
  }

  if (startCooldown && isPresenceCooldownActive()) {
    render();
    return;
  }

  appState.charge = Math.min(100, appState.charge + CHARGE_PER_SESSION);

  if (startCooldown) {
    appState.lastPresenceAt = Date.now();
    appState.lastDecayAt = Date.now();
  }

  completeDayIfNeeded();
  save();
  render();
}

presenceButton.addEventListener('click', () => {
  addChargeImmediately({ startCooldown: true });
});

demoButton.addEventListener('click', () => {
  addChargeImmediately({ startCooldown: false });
});

const skip5Button = document.getElementById('skip5Button');
const skipDayButton = document.getElementById('skipDayButton');

skip5Button.addEventListener('click', () => {
  appState.lastDecayAt -= DECAY_INTERVAL_MS;
  render();
});

skipDayButton.addEventListener('click', () => {
  appState.lastDecayAt -= 24 * 60 * 60 * 1000;
  appState.charge = 100;
  completeDayIfNeeded();
  render();
});

moodSlider.addEventListener('input', (event) => {
  appState.mood = Number(event.target.value);
  renderMood();
  save();
});

const resetProgressBtn = document.getElementById('resetProgressBtn');
if (resetProgressBtn) {
  resetProgressBtn.addEventListener('click', () => {
    if (confirm('Сбросить весь прогресс?')) {
      localStorage.clear();
      location.reload();
    }
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

document.addEventListener('visibilitychange', render);
window.addEventListener('focus', render);
window.addEventListener('pageshow', render);

render();
setInterval(render, 1000);
