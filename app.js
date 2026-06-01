const GAME_LENGTH = 15;
const MAX_QUESTIONS = 330;
const STORAGE_KEY = 'defi-numerique-junior-best';

const themes = {
  Informatique: ['Ordinateur', 'Clavier', 'Souris', 'Écran', 'Webcam', 'Casque audio', 'Microphone', 'Imprimante', 'Scanner', 'Clé USB', 'Tablette', 'Smartphone'],
  Internet: ['Sites web', 'Google', 'YouTube', 'Navigateurs', 'Liens', 'Recherche d’informations', 'Wi-Fi'],
  'Sécurité numérique': ['Mot de passe', 'Informations personnelles', 'Cyberharcèlement', 'Arnaques', 'Virus', 'Phishing', 'Respect sur Internet'],
  'Jeux vidéo': ['Minecraft', 'Roblox', 'Mario', 'Sonic', 'Pokémon', 'Consoles', 'Manettes', 'Jeux en ligne'],
  'Culture numérique': ['Pixels', 'Emojis', 'QR Codes', 'Icônes', 'Logos d’applications', 'Réseaux sociaux adaptés aux enfants'],
  'Logique numérique': ['Suites de nombres', 'Observation', 'Reconnaissance d’images', 'Mémorisation', 'Déduction'],
};

const screens = {
  home: document.getElementById('home-screen'),
  game: document.getElementById('game-screen'),
  end: document.getElementById('end-screen'),
};
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const questionText = document.getElementById('question-text');
const answersEl = document.getElementById('answers');
const feedbackEl = document.getElementById('feedback');
const progressEl = document.getElementById('progress');
const questionIndexEl = document.getElementById('question-index');
const questionTotalEl = document.getElementById('question-total');
const eventBadgeEl = document.getElementById('event-badge');
const timerEl = document.getElementById('timer');

const allConcepts = Object.values(themes).flat();
const difficulties = ['Facile', 'Moyen', 'Difficile'];
const questionDB = buildQuestionDatabase();
let audioContext;

const state = {
  score: 0,
  streak: 0,
  maxStreak: 0,
  correct: 0,
  index: 0,
  round: [],
  timer: null,
  activeEvent: null,
};

function buildQuestionDatabase() {
  const used = new Set();
  const questions = [];

  const addQuestion = (text, correct, wrongPool, difficulty) => {
    if (used.has(text)) return;
    const wrong = shuffle([...wrongPool].filter((i) => i !== correct)).slice(0, 2);
    if (wrong.length < 2) return;
    const options = shuffle([correct, ...wrong]);
    questions.push({ text, options, correct, difficulty, type: 'normal' });
    used.add(text);
  };

  allConcepts.forEach((concept, i) => {
    const themeName = Object.keys(themes).find((name) => themes[name].includes(concept));
    const sameTheme = themes[themeName];
    const other = allConcepts.filter((x) => !sameTheme.includes(x));
    const templates = [
      `Dans le thème ${themeName}, quel mot est correct pour: ${concept} ?`,
      `Quel élément est surtout lié à "${concept}" ?`,
      `Dans le monde numérique, reconnais le bon terme: ${concept}`,
      `Choisis la réponse correcte pour ${concept} (catégorie: ${themeName})`,
      `Lequel correspond au sujet "${concept}" dans le numérique ?`,
      `Quel item convient à une question sur ${concept} ?`,
      `Retrouve le terme numérique exact demandé: ${concept}`,
      `Mini défi: sélectionne "${concept}" parmi les choix`,
    ];

    templates.forEach((text, idx) => {
      addQuestion(text, concept, idx % 2 === 0 ? allConcepts : other, difficulties[(i + idx) % 3]);
    });
  });

  const logicExtras = [
    { text: 'Suite logique: 2, 4, 6, ?', options: ['8', '7', '9'], correct: '8', difficulty: 'Facile' },
    { text: 'Suite logique: 5, 10, 15, ?', options: ['20', '18', '25'], correct: '20', difficulty: 'Facile' },
    { text: 'Observation: quel symbole sert souvent à scanner rapidement ?', options: ['QR Code', 'Emoji', 'Pixel'], correct: 'QR Code', difficulty: 'Moyen' },
    { text: 'Mémorisation: lequel est une bonne habitude de sécurité ?', options: ['Créer un mot de passe unique', 'Partager son mot de passe', 'Cliquer sur tous les liens'], correct: 'Créer un mot de passe unique', difficulty: 'Moyen' },
    { text: 'Déduction: si un lien promet un cadeau incroyable et urgent, c’est souvent…', options: ['Une arnaque', 'Toujours vrai', 'Un jeu officiel'], correct: 'Une arnaque', difficulty: 'Difficile' },
  ];

  return [...questions, ...logicExtras].slice(0, MAX_QUESTIONS);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function showModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = html;
  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function startGame() {
  state.score = 0;
  state.streak = 0;
  state.maxStreak = 0;
  state.correct = 0;
  state.index = 0;
  state.activeEvent = null;
  clearTimer();

  state.round = shuffle([...questionDB]).slice(0, GAME_LENGTH);
  questionTotalEl.textContent = String(GAME_LENGTH);
  scoreEl.textContent = '0';
  comboEl.textContent = '0';
  feedbackEl.textContent = '';
  showScreen('game');
  renderQuestion();
}

function pickEvent() {
  const roll = Math.random();
  if (roll < 0.1) return 'flash';
  if (roll < 0.17) return 'jackpot';
  if (roll < 0.22) return 'pixel';
  if (roll < 0.27) return 'password';
  if (roll < 0.32) return 'hacker';
  return null;
}

function renderQuestion() {
  clearTimer();
  feedbackEl.textContent = '';
  eventBadgeEl.textContent = '';
  timerEl.textContent = '';

  if (state.index >= GAME_LENGTH) {
    endGame();
    return;
  }

  questionIndexEl.textContent = String(state.index + 1);
  progressEl.style.width = `${((state.index) / GAME_LENGTH) * 100}%`;

  const evt = pickEvent();
  state.activeEvent = evt;
  if (evt === 'pixel') {
    launchPixelBonus();
    return;
  }

  let current = state.round[state.index];

  if (evt === 'password') {
    current = {
      text: 'Mot de Passe: lequel est le plus sécurisé ?',
      options: ['chien123', 'Lune!Robot7#', 'prenom2000'],
      correct: 'Lune!Robot7#',
      difficulty: 'Moyen',
      type: 'password',
    };
    eventBadgeEl.textContent = '🔐 Événement: Mot de Passe';
  } else if (evt === 'hacker') {
    current = {
      text: 'Défi Hacker Junior: code secret de 3 chiffres. Indices: >100, pair, finit par 2.',
      options: ['142', '117', '153'],
      correct: '142',
      difficulty: 'Difficile',
      type: 'hacker',
    };
    eventBadgeEl.textContent = '🧩 Événement: Défi Hacker Junior';
  } else if (evt === 'flash') {
    eventBadgeEl.textContent = '⚡ Question Éclair (5s)';
  } else if (evt === 'jackpot') {
    eventBadgeEl.textContent = '💎 Jackpot x5';
  }

  questionText.textContent = `${current.text} (${current.difficulty})`;
  answersEl.innerHTML = '';
  current.options.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = choice;
    btn.onclick = () => answerQuestion(current, choice);
    answersEl.appendChild(btn);
  });

  if (evt === 'flash') {
    startFlashTimer(current);
  }
}

function startFlashTimer(current) {
  let remaining = 5;
  timerEl.textContent = `⏱️ ${remaining}s`;
  state.timer = setInterval(() => {
    remaining -= 1;
    timerEl.textContent = `⏱️ ${remaining}s`;
    if (remaining <= 0) {
      clearTimer();
      answerQuestion(current, null);
    }
  }, 1000);
}

function clearTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

function streakBonus(streak) {
  if (streak === 5) return 50;
  if (streak === 10) return 100;
  if (streak === 15) return 200;
  return 0;
}

function answerQuestion(question, selected) {
  clearTimer();
  const correct = selected === question.correct;
  let points = 0;

  if (correct) {
    state.correct += 1;
    state.streak += 1;
    state.maxStreak = Math.max(state.maxStreak, state.streak);
    points = 10;

    if (state.streak === 2) points *= 2;
    if (state.streak === 3) points *= 3;
    if (state.activeEvent === 'flash') points += 30;
    if (state.activeEvent === 'jackpot') points *= 5;

    points += streakBonus(state.streak);
    state.score += points;

    feedbackEl.textContent = `✅ Bravo ! +${points} points`;
    playSound(740, 0.08);
  } else {
    state.streak = 0;
    feedbackEl.textContent = `❌ Oups ! Bonne réponse: ${question.correct}`;
    playSound(240, 0.1);
  }

  scoreEl.textContent = String(state.score);
  comboEl.textContent = String(state.streak);
  state.index += 1;
  progressEl.style.width = `${(state.index / GAME_LENGTH) * 100}%`;
  setTimeout(renderQuestion, 650);
}

function launchPixelBonus() {
  eventBadgeEl.textContent = '🟨 Pixel Bonus: trouve le pixel différent';
  questionText.textContent = 'Clique sur le pixel différent dans la grille !';
  answersEl.innerHTML = '';

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(5, 40px)';
  grid.style.gap = '6px';

  const lucky = Math.floor(Math.random() * 25);
  for (let i = 0; i < 25; i += 1) {
    const cell = document.createElement('button');
    cell.style.width = '40px';
    cell.style.height = '40px';
    cell.style.padding = '0';
    cell.style.borderRadius = '8px';
    cell.style.background = i === lucky ? '#8b5cf6' : '#3b82f6';
    cell.onclick = () => {
      if (i === lucky) {
        state.score += 50;
        feedbackEl.textContent = '🎉 Pixel Bonus réussi ! +50 points';
        playSound(810, 0.08);
      } else {
        feedbackEl.textContent = 'Essaie encore la prochaine fois !';
      }
      scoreEl.textContent = String(state.score);
      state.streak = 0;
      comboEl.textContent = '0';
      state.index += 1;
      progressEl.style.width = `${(state.index / GAME_LENGTH) * 100}%`;
      setTimeout(renderQuestion, 650);
    };
    grid.appendChild(cell);
  }

  answersEl.appendChild(grid);
}

function rankFromScore(score) {
  if (score >= 1501) return 'Génie Informatique';
  if (score >= 1001) return 'Maître du Pixel';
  if (score >= 501) return 'Expert Numérique';
  if (score >= 201) return 'Apprenti Geek';
  return 'Explorateur';
}

function updateLeaderboard(score) {
  const currentBest = Number(localStorage.getItem(STORAGE_KEY) || 0);
  if (score > currentBest) {
    localStorage.setItem(STORAGE_KEY, String(score));
    spawnConfetti();
  }
  return Number(localStorage.getItem(STORAGE_KEY) || 0);
}

function endGame() {
  showScreen('end');
  const best = updateLeaderboard(state.score);
  const accuracy = Math.round((state.correct / GAME_LENGTH) * 100);
  document.getElementById('final-score').textContent = String(state.score);
  document.getElementById('final-rank').textContent = rankFromScore(state.score);
  document.getElementById('final-correct').textContent = String(state.correct);
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;
  document.getElementById('best-score').textContent = String(best);

  const badges = [];
  if (state.correct >= 8) badges.push('🎯 Bon viseur');
  if (state.maxStreak >= 3) badges.push('🔥 Combo Master');
  if (state.score >= 500) badges.push('🏅 Expert en devenir');
  if (state.score === best) badges.push('🎉 Nouveau record');
  if (!badges.length) badges.push('🌟 Continue tes efforts');

  document.getElementById('badges').innerHTML = badges.map((b) => `<span class="badge">${b}</span>`).join('');
}

function spawnConfetti() {
  const host = document.getElementById('confetti');
  host.replaceChildren();
  const colors = ['#3b82f6', '#10b981', '#fbbf24', '#8b5cf6'];
  for (let i = 0; i < 40; i += 1) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    p.style.left = `${Math.random() * 100}vw`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    host.appendChild(p);
  }
  setTimeout(() => { host.replaceChildren(); }, 1600);
}

function playSound(freq, duration) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'triangle';
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (error) {
    // Navigateur sans audio context
  }
}

function bindMenu() {
  document.getElementById('play-btn').onclick = startGame;
  document.getElementById('play-again').onclick = startGame;
  document.getElementById('home-btn').onclick = () => showScreen('home');
  document.getElementById('leaderboard-btn').onclick = () => {
    showModal('Classement', `<p>Record personnel: <strong>${Number(localStorage.getItem(STORAGE_KEY) || 0)}</strong></p>`);
  };
  document.getElementById('rewards-btn').onclick = () => {
    showModal('Récompenses', '<ul><li>0-200: Explorateur</li><li>201-500: Apprenti Geek</li><li>501-1000: Expert Numérique</li><li>1001-1500: Maître du Pixel</li><li>1501+: Génie Informatique</li></ul>');
  };
  document.getElementById('settings-btn').onclick = () => {
    showModal('Paramètres', `<p>Base de questions générée: <strong>${questionDB.length}</strong> questions</p><p>Sons: activés automatiquement</p>`);
  };
  document.getElementById('close-modal').onclick = closeModal;
}

bindMenu();
showScreen('home');
