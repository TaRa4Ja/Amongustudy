/* ===== Utilities & state ===== */
const el = (id) => document.getElementById(id);

function dismissKeyboard(event) {
  const activeElement = document.activeElement;
  const inputField = el('answer-input');
  if (activeElement && activeElement.tagName === 'INPUT' && event.target !== inputField && event.target.tagName !== 'BUTTON') {
    activeElement.blur();
  }
}

// Safe parse helpers
const safeInt = (v, fallback = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

/* ===== Minecraft Backgrounds ===== */
const minecraftBackgrounds = [
  'linear-gradient(135deg, #87CEEB 0%, #E0F6FF 100%)',
  'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #4d4d4d 100%)',
  'linear-gradient(135deg, #ff7f00 0%, #ffd700 50%, #87CEEB 100%)',
  'linear-gradient(180deg, #2d5016 0%, #5fd381 50%, #87CEEB 100%)',
  'linear-gradient(135deg, #4a4a4a 0%, #2d2d2d 100%)',
  'linear-gradient(180deg, #87CEEB 0%, #4a90e2 100%)',
  'linear-gradient(135deg, #ff6b6b 0%, #ffd700 50%, #87CEEB 100%)',
  'linear-gradient(180deg, #1a1a1a 0%, #4a4a4a 100%)',
];

let currentBgIndex = 0;
let savedBgIndex = safeInt(localStorage.getItem('minecraft_saved_bg'), -1);
let audioEnabled = localStorage.getItem('minecraft_audio_enabled') !== 'false';

function getRandomMinecraftBg() {
  currentBgIndex = Math.floor(Math.random() * minecraftBackgrounds.length);
  return minecraftBackgrounds[currentBgIndex];
}

function applyBackground(index = -1) {
  const bgToApply = index >= 0 ? minecraftBackgrounds[index] : getRandomMinecraftBg();
  document.body.style.setProperty('--bg-image', `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23000" width="100" height="100"/></svg>')`);
  document.body.style.background = bgToApply;
  document.body.style.backgroundAttachment = 'fixed';
}

/* ===== App state ===== */
let selectedFactors = [];
let currentScore = safeInt(localStorage.getItem('math_quiz_score'), 0);
let currentQuestionIndex = 0;
let currentAnswer = 0;
let currentF1 = 0, currentF2 = 0;
let questionStartTime = 0;
let usedHint = false;
let isCurrentRetest = false;
let normalQuestionsPool = [];
let retestQueue = [];

let feedbackDelayDuration = safeInt(localStorage.getItem('cfg_feedback_delay'), 1800);
// default shop
let rewardShop = [
  { points: 10, reward: "🥉 Bronze Star Badge" },
  { points: 30, reward: "🍦 Ice Cream Treatment" },
  { points: 50, reward: "🎮 15 Mins Extra Screen Time" },
  { points: 100, reward: "🏆 Ultimate Math Grandmaster" }
];
try {
  const loadedShop = JSON.parse(localStorage.getItem('cfg_shop_models') || 'null');
  if (Array.isArray(loadedShop)) {
    for (let i = 0; i < Math.min(4, loadedShop.length); i++) {
      if (loadedShop[i] && typeof loadedShop[i].points === 'number') {
        rewardShop[i].reward = String(loadedShop[i].reward || rewardShop[i].reward);
        rewardShop[i].points = loadedShop[i].points;
      }
    }
  }
} catch (e) { /* ignore parse errors */ }

/* ===== UI utility functions ===== */
function setActiveScreen(id) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => {
    if (s.id === id) {
      s.classList.add('active');
      s.setAttribute('aria-hidden', 'false');
    } else {
      s.classList.remove('active');
      s.setAttribute('aria-hidden', 'true');
    }
  });
}

/* ===== Theme & menu ===== */
const menuButton = el('menu-button');
const themeDropdown = el('theme-dropdown');
menuButton.addEventListener('click', () => {
  const shown = themeDropdown.classList.toggle('show');
  menuButton.setAttribute('aria-expanded', shown ? 'true' : 'false');
});

themeDropdown.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  const t = btn.getAttribute('data-theme');
  if (t !== null) {
    setTheme(t);
  } else if (btn.id === 'open-admin') {
    openAdminSettings();
  }
  themeDropdown.classList.remove('show');
  menuButton.setAttribute('aria-expanded', 'false');
});

function setTheme(themeName) {
  const docHtml = document.documentElement;
  if (themeName === 'default' || !themeName) {
    docHtml.removeAttribute('data-theme');
    localStorage.removeItem('math_quiz_theme');
  } else {
    docHtml.setAttribute('data-theme', themeName);
    localStorage.setItem('math_quiz_theme', themeName);
    if (themeName === 'minecraft') {
      applyBackground(savedBgIndex >= 0 ? savedBgIndex : -1);
    }
  }
}
// Initialize theme
(function initTheme() {
  const savedTheme = localStorage.getItem('math_quiz_theme') || 'default';
  setTheme(savedTheme === 'default' ? 'default' : savedTheme);
})();

// Close dropdown when clicking outside
window.addEventListener('click', (event) => {
  if (!event.target.closest('.header-menu')) {
    themeDropdown.classList.remove('show');
    menuButton.setAttribute('aria-expanded', 'false');
    bgDropdown.classList.remove('show');
    bgToggleBtn.setAttribute('aria-expanded', 'false');
  }
});

/* ===== Minecraft Background Selector ===== */
const bgToggleBtn = el('bg-toggle-btn');
const bgDropdown = el('bg-dropdown');

if (bgToggleBtn && bgDropdown) {
  bgToggleBtn.addEventListener('click', () => {
    const shown = bgDropdown.classList.toggle('show');
    bgToggleBtn.setAttribute('aria-expanded', shown ? 'true' : 'false');
  });

  // Populate background options
  minecraftBackgrounds.forEach((bg, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerText = `🎨 Background ${index + 1}`;
    btn.addEventListener('click', () => {
      applyBackground(index);
      savedBgIndex = index;
      localStorage.setItem('minecraft_saved_bg', index);
      bgDropdown.classList.remove('show');
      bgToggleBtn.setAttribute('aria-expanded', 'false');
      playMinecraftSound('select');
    });
    bgDropdown.appendChild(btn);
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.style.borderTop = '1px solid var(--tile-bg)';
  saveBtn.style.fontWeight = 'bold';
  saveBtn.innerText = `💾 Save Current`;
  saveBtn.addEventListener('click', () => {
    localStorage.setItem('minecraft_saved_bg', currentBgIndex);
    savedBgIndex = currentBgIndex;
    alert('✅ Background saved!');
    bgDropdown.classList.remove('show');
    bgToggleBtn.setAttribute('aria-expanded', 'false');
  });
  bgDropdown.appendChild(saveBtn);
}

/* ===== Audio & haptics ===== */
let audioCtx = null;

function initAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { audioCtx = null; }
}

function playSound(type) {
  initAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.value = 0.02;
  if (type === 'correct') { osc.frequency.value = 880; }
  else if (type === 'bonus') { osc.frequency.value = 1100; }
  else if (type === 'wrong') { osc.frequency.value = 220; }
  osc.type = 'sine';
  osc.start();
  setTimeout(() => { osc.stop(); }, 120);
}

function playMinecraftSound(type) {
  if (!audioEnabled) return;
  initAudio();
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.value = 0.05;
  osc.type = 'square';

  if (type === 'correct') {
    // Minecraft "ding" sound
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } else if (type === 'wrong') {
    // Minecraft "hurt" sound
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } else if (type === 'select') {
    // Minecraft "pop" sound
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'bonus') {
    // Minecraft "level up" sound
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1400, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  }
}

function triggerHaptic(type) {
  if (!('vibrate' in navigator)) return;
  if (type === 'success') navigator.vibrate(40);
  else if (type === 'fail') navigator.vibrate([60, 20, 40]);
  else if (type === 'hint') navigator.vibrate(30);
}

function spawnParticle(text, color) {
  const container = el('app');
  const p = document.createElement('div');
  p.className = 'particle';
  p.innerText = text;
  p.style.color = color;
  p.style.left = (container.clientWidth / 2 - 10) + 'px';
  p.style.top = (container.clientHeight / 2 - 10) + 'px';
  container.appendChild(p);
  setTimeout(() => p.remove(), 1000);
}

/* ===== Grid setup ===== */
const grid = el('grid');
for (let i = 1; i <= 12; i++) {
  const tile = document.createElement('div');
  tile.className = 'num-tile';
  tile.innerText = i;
  tile.setAttribute('role', 'button');
  tile.setAttribute('tabindex', '0');
  tile.setAttribute('aria-pressed', 'false');
  tile.addEventListener('click', () => toggleFactor(tile, i));
  tile.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFactor(tile, i); } });
  grid.appendChild(tile);
}

function toggleFactor(tile, i) {
  const pressed = tile.getAttribute('aria-pressed') === 'true';
  tile.setAttribute('aria-pressed', (!pressed).toString());
  if (pressed) { selectedFactors = selectedFactors.filter(n => n !== i); }
  else { selectedFactors.push(i); }
  playMinecraftSound('select');
}

/* ===== Quiz flow ===== */
el('start-btn').addEventListener('click', startQuiz);
el('submit-btn').addEventListener('click', submitAnswer);
el('hint-button').addEventListener('click', revealHint);
el('again-btn').addEventListener('click', resetApp);

function startQuiz() {
  if (selectedFactors.length === 0) { alert("Please pick at least one number table to practice!"); return; }
  initAudio();
  currentQuestionIndex = 0;
  retestQueue = [];
  normalQuestionsPool = [];
  // make 10 questions by default
  for (let i = 0; i < 10; i++) {
    const f1 = selectedFactors[Math.floor(Math.random() * selectedFactors.length)];
    const f2 = Math.floor(Math.random() * 12) + 1;
    normalQuestionsPool.push({ f1, f2 });
  }
  el('q-total').innerText = normalQuestionsPool.length;
  setActiveScreen('quiz-screen');
  el('q-count').innerText = '0';
  generateQuestion();
}

function generateQuestion() {
  el('feedback').innerText = "";
  el('hint-display').innerText = "";
  el('problem').classList.remove('animate-pop', 'animate-shake');
  const inputField = el('answer-input');
  inputField.value = "";
  inputField.focus();
  usedHint = false;
  el('hint-button').disabled = false;

  // Change background for each question in Minecraft mode
  const docHtml = document.documentElement;
  if (docHtml.getAttribute('data-theme') === 'minecraft') {
    applyBackground(-1);
  }

  const useRetest = (retestQueue.length > 0) && (Math.random() > 0.4 || normalQuestionsPool.length === 0);
  if (useRetest) {
    const problemItem = retestQueue.shift();
    currentF1 = problemItem.f1; currentF2 = problemItem.f2;
    isCurrentRetest = true;
    el('retest-indicator').style.display = 'inline';
  } else if (normalQuestionsPool.length > 0) {
    currentQuestionIndex++;
    el('q-count').innerText = currentQuestionIndex.toString();
    const problemItem = normalQuestionsPool.shift();
    currentF1 = problemItem.f1; currentF2 = problemItem.f2;
    isCurrentRetest = false;
    el('retest-indicator').style.display = 'none';
  } else {
    endQuiz();
    return;
  }

  currentAnswer = currentF1 * currentF2;
  if (Math.random() > 0.5) {
    el('problem').innerText = `${currentF1} × ${currentF2}`;
  } else {
    el('problem').innerText = `${currentF2} × ${currentF1}`;
  }
  el('problem').classList.add('animate-pop');
  questionStartTime = Date.now();
}

function revealHint() {
  if (usedHint) return;
  usedHint = true;
  el('hint-button').disabled = true;
  triggerHaptic('hint');
  playMinecraftSound('select');
  // Simple hint: show one factor and indicate strategy
  el('hint-display').innerText = `Hint: break ${currentF1}×${currentF2} into ${currentF1}×(${currentF2}) or (${currentF1}×${Math.ceil(currentF2/2)})×2`;
  // Deduct 1 point if available
  currentScore = Math.max(0, currentScore - 1);
  el('score-display').innerText = currentScore;
  localStorage.setItem('math_quiz_score', currentScore);
}

function submitAnswer() {
  const inputField = el('answer-input');
  const userAnswer = parseInt(inputField.value, 10);
  const feedbackEl = el('feedback');
  const displayEl = el('problem');
  if (Number.isNaN(userAnswer)) return;

  inputField.blur();
  const timeTaken = (Date.now() - questionStartTime) / 1000;
  let pointsEarned = 0;

  if (userAnswer === currentAnswer) {
    if (usedHint) {
      feedbackEl.innerText = "✅ Correct with Hint! +1 Point";
      feedbackEl.style.color = "var(--success)";
      pointsEarned = 1;
      playMinecraftSound('correct');
    } else if (timeTaken <= 4.0) {
      feedbackEl.innerText = "⚡ Lightning Fast! +4 Points";
      feedbackEl.style.color = "var(--warning)";
      pointsEarned = 4;
      playMinecraftSound('bonus');
    } else {
      feedbackEl.innerText = "✅ Correct! +2 Points";
      feedbackEl.style.color = "var(--success)";
      pointsEarned = 2;
      playMinecraftSound('correct');
    }

    currentScore += pointsEarned;
    triggerHaptic('success');
    spawnParticle(`+${pointsEarned}`, pointsEarned === 4 ? 'var(--warning)' : 'var(--success)');
  } else {
    feedbackEl.innerText = `❌ Incorrect. Retest added.`;
    feedbackEl.style.color = "var(--danger)";
    displayEl.classList.add('animate-shake');
    playMinecraftSound('wrong');
    triggerHaptic('fail');
    // add to retest queue, cap size
    retestQueue.push({ f1: currentF1, f2: currentF2 });
    if (retestQueue.length > 20) retestQueue.shift();
  }
  el('score-display').innerText = currentScore;
  localStorage.setItem('math_quiz_score', currentScore);

  setTimeout(() => {
    displayEl.classList.remove('animate-shake');
    generateQuestion();
  }, feedbackDelayDuration);
}

function endQuiz() {
  setActiveScreen('reward-screen');
  el('final-score').innerText = currentScore;
  renderShop();
}

function renderShop() {
  const container = el('shop-container');
  container.innerHTML = '';
  rewardShop.forEach(item => {
    const isUnlocked = currentScore >= item.points;
    const div = document.createElement('div');
    div.className = 'shop-item' + (isUnlocked ? ' unlocked' : '');
    const left = document.createElement('div');
    left.innerText = item.reward;
    const right = document.createElement('div');
    const badge = document.createElement('span');
    badge.className = 'badge ' + (isUnlocked ? 'unlocked' : 'locked');
    badge.innerText = isUnlocked ? 'Unlocked' : `Locked (${item.points})`;
    right.appendChild(badge);
    div.appendChild(left);
    div.appendChild(right);
    container.appendChild(div);
  });
}

function resetApp() {
  setActiveScreen('setup-screen');
}

/* ===== Admin functions (client-side) ===== */
function openAdminSettings() {
  themeDropdown.classList.remove('show');
  // WARNING: client-side password is not secure. For demo only.
  const entryPass = prompt("🔐 Enter Parent/Teacher Password:");
  const ADMIN_PASS = localStorage.getItem('math_admin_pass') || '1234';
  if (entryPass === null) return; // cancelled
  if (entryPass === ADMIN_PASS) {
    // populate fields
    el('cfg-delay').value = (feedbackDelayDuration / 1000).toFixed(1);
    el('cfg-n1').value = rewardShop[0].reward; el('cfg-t1').value = rewardShop[0].points;
    el('cfg-n2').value = rewardShop[1].reward; el('cfg-t2').value = rewardShop[1].points;
    el('cfg-n3').value = rewardShop[2].reward; el('cfg-t3').value = rewardShop[2].points;
    el('cfg-n4').value = rewardShop[3].reward; el('cfg-t4').value = rewardShop[3].points;
    el('cfg-audio-toggle').checked = audioEnabled;
    setActiveScreen('admin-screen');
  } else {
    alert('❌ Incorrect security access password.');
  }
}

function saveAndExitAdmin() {
  feedbackDelayDuration = Math.max(0, parseFloat(el('cfg-delay').value) * 1000 || 1800);
  rewardShop[0].reward = el('cfg-n1').value || rewardShop[0].reward; rewardShop[0].points = safeInt(el('cfg-t1').value, rewardShop[0].points);
  rewardShop[1].reward = el('cfg-n2').value || rewardShop[1].reward; rewardShop[1].points = safeInt(el('cfg-t2').value, rewardShop[1].points);
  rewardShop[2].reward = el('cfg-n3').value || rewardShop[2].reward; rewardShop[2].points = safeInt(el('cfg-t3').value, rewardShop[2].points);
  rewardShop[3].reward = el('cfg-n4').value || rewardShop[3].reward; rewardShop[3].points = safeInt(el('cfg-t4').value, rewardShop[3].points);

  audioEnabled = el('cfg-audio-toggle').checked;
  localStorage.setItem('cfg_feedback_delay', feedbackDelayDuration);
  localStorage.setItem('cfg_shop_models', JSON.stringify(rewardShop));
  localStorage.setItem('minecraft_audio_enabled', audioEnabled);

  alert('⚙️ Custom milestones and options updated successfully.');
  setActiveScreen('setup-screen');
}

function secureAdminClearPoints() {
  const clearFinalConfirmation = confirm("💥 Clear current score metrics? Rewards will lock if balance falls below parameters.");
  if (clearFinalConfirmation) {
    currentScore = 0;
    localStorage.setItem('math_quiz_score', 0);
    el('score-display').innerText = "0";
    el('final-score').innerText = "0";
    renderShop();
    triggerHaptic('fail');
    alert('Balances cleared successfully.');
  }
}

// wire admin buttons
el('save-admin').addEventListener('click', saveAndExitAdmin);
el('clear-points').addEventListener('click', secureAdminClearPoints);

// initialize UI values
el('score-display').innerText = currentScore;
el('final-score').innerText = currentScore;
renderShop();

// accessibility: focus answer input when quiz screen shown
const observer = new MutationObserver((mutations) => {
  mutations.forEach(m => {
    if (m.target.classList && m.target.classList.contains('screen') && m.target.classList.contains('active') && m.target.id === 'quiz-screen') {
      setTimeout(() => el('answer-input').focus(), 100);
    }
  });
});
document.querySelectorAll('.screen').forEach(s => observer.observe(s, { attributes: true }));
