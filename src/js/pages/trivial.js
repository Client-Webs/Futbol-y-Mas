/**
 * Fresh Football - Trivial Quiz Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { 
  getTriviaQuestions, 
  submitTriviaAttempt, 
  getTriviaLeaderboard, 
  getCurrentUser 
} from '../supabase.js';

let currentUser = null;
let questions = [];
let currentIndex = 0;
let score = 0;
let correctCount = 0;
let hasAnsweredCurrent = false;

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('trivial');
  currentUser = await getCurrentUser();
  await loadQuestions();
  await loadLeaderboard();
});

async function loadQuestions() {
  const container = document.getElementById('trivia-container');
  try {
    questions = await getTriviaQuestions();
    if (!questions || questions.length === 0) {
      container.innerHTML = `
        <div class="empty-state py-16">
          <div class="empty-state-icon">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <h3 class="text-white font-bold text-base mb-1">No hay preguntas de trivial disponibles</h3>
          <p class="text-xs text-slate-400 max-w-sm">Próximamente se añadirán nuevas preguntas y retos sobre LaLiga.</p>
        </div>
      `;
      return;
    }

    currentIndex = 0;
    score = 0;
    correctCount = 0;
    document.getElementById('trivia-stats-summary')?.classList.remove('hidden');
    renderQuestion();
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="py-12 text-center text-xs text-red-400">Error al cargar preguntas de trivial.</div>`;
  }
}

function renderQuestion() {
  const container = document.getElementById('trivia-container');
  const scoreDisplay = document.getElementById('current-score');
  if (scoreDisplay) scoreDisplay.innerText = `${score} pts`;

  if (currentIndex >= questions.length) {
    renderCompletionScreen();
    return;
  }

  const q = questions[currentIndex];
  hasAnsweredCurrent = false;

  const options = [
    { key: 'a', text: q.option_a },
    { key: 'b', text: q.option_b },
    { key: 'c', text: q.option_c },
    { key: 'd', text: q.option_d },
  ].filter(opt => Boolean(opt.text));

  container.innerHTML = `
    <div class="fresh-card p-6 space-y-6">
      <div class="flex items-center justify-between text-xs text-slate-400 border-b border-[#232838] pb-4">
        <span class="font-bold text-neon uppercase">Pregunta ${currentIndex + 1} de ${questions.length}</span>
        <span class="font-semibold">+${q.points || 10} puntos</span>
      </div>

      <h3 class="text-lg sm:text-xl font-bold text-white leading-snug">
        ${q.question}
      </h3>

      <div class="space-y-3" id="trivia-options-box">
        ${options.map(opt => `
          <button 
            data-opt="${opt.key}" 
            class="w-full text-left p-4 rounded-xl bg-[#0f121a] border border-[#232838] hover:border-neon text-xs sm:text-sm font-semibold text-slate-200 transition-all flex items-center justify-between group">
            <span>${opt.text}</span>
            <span class="w-6 h-6 rounded-full bg-[#1b1f2b] border border-[#2e3549] text-[11px] font-bold text-slate-400 flex items-center justify-center group-hover:border-neon group-hover:text-neon uppercase">${opt.key}</span>
          </button>
        `).join('')}
      </div>

      <!-- Feedback container -->
      <div id="trivia-feedback" class="hidden p-4 rounded-xl space-y-2 text-xs"></div>

      <!-- Next Button -->
      <div id="trivia-next-box" class="hidden flex justify-end">
        <button id="trivia-next-btn" class="btn-neon text-xs py-2 px-5">
          ${currentIndex + 1 === questions.length ? 'Finalizar Trivial &rarr;' : 'Siguiente Pregunta &rarr;'}
        </button>
      </div>
    </div>
  `;

  // Attach option clicks
  const optionButtons = container.querySelectorAll('[data-opt]');
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (hasAnsweredCurrent) return;
      hasAnsweredCurrent = true;
      const chosen = btn.getAttribute('data-opt');
      handleAnswer(q, chosen, optionButtons);
    });
  });

  const nextBtn = document.getElementById('trivia-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentIndex++;
      renderQuestion();
    });
  }
}

function handleAnswer(q, chosen, optionButtons) {
  const isCorrect = chosen.toLowerCase() === q.correct_option.toLowerCase();
  const feedbackEl = document.getElementById('trivia-feedback');
  const nextBox = document.getElementById('trivia-next-box');

  optionButtons.forEach(b => {
    const optKey = b.getAttribute('data-opt').toLowerCase();
    if (optKey === q.correct_option.toLowerCase()) {
      b.className = 'w-full text-left p-4 rounded-xl bg-neon/15 border border-neon text-xs sm:text-sm font-bold text-white flex items-center justify-between';
    } else if (optKey === chosen && !isCorrect) {
      b.className = 'w-full text-left p-4 rounded-xl bg-red-500/15 border border-red-500 text-xs sm:text-sm font-bold text-red-200 flex items-center justify-between';
    } else {
      b.className = 'w-full text-left p-4 rounded-xl bg-[#0b0d13] border border-[#1b1f2b] text-xs sm:text-sm font-semibold text-slate-500 opacity-60 flex items-center justify-between';
    }
  });

  if (isCorrect) {
    correctCount++;
    score += (q.points || 10);
    const scoreDisplay = document.getElementById('current-score');
    if (scoreDisplay) scoreDisplay.innerText = `${score} pts`;

    feedbackEl.className = 'p-4 rounded-xl bg-neon/10 border border-neon/30 text-white space-y-1 block';
    feedbackEl.innerHTML = `
      <div class="font-bold text-neon flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>¡Respuesta Correcta! (+${q.points || 10} pts)</span>
      </div>
      ${q.explanation ? `<p class="text-slate-300 text-xs">${q.explanation}</p>` : ''}
    `;
  } else {
    feedbackEl.className = 'p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-white space-y-1 block';
    feedbackEl.innerHTML = `
      <div class="font-bold text-red-400 flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        <span>Incorrecto</span>
      </div>
      <p class="text-slate-300 text-xs">La opción correcta era la <strong>${q.correct_option.toUpperCase()}</strong>. ${q.explanation || ''}</p>
    `;
  }

  nextBox.classList.remove('hidden');
}

async function renderCompletionScreen() {
  const container = document.getElementById('trivia-container');

  if (currentUser) {
    try {
      await submitTriviaAttempt({
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount
      });
      showToast('¡Resultado guardado en tu perfil!', 'success');
      await loadLeaderboard();
    } catch (e) {
      console.error(e);
    }
  }

  container.innerHTML = `
    <div class="fresh-card p-8 text-center space-y-6">
      <div class="w-16 h-16 rounded-full bg-neon/20 border border-neon/40 flex items-center justify-center text-3xl mx-auto">
        🏆
      </div>

      <div class="space-y-2">
        <h2 class="text-2xl font-black text-white">¡Trivial Completado!</h2>
        <p class="text-xs text-slate-400">Has respondido a todas las preguntas de esta ronda.</p>
      </div>

      <div class="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        <div class="p-4 rounded-xl bg-[#0e1017] border border-[#232838]">
          <span class="block text-2xl font-black text-neon tabular-nums">${score}</span>
          <span class="text-xs text-slate-400">Puntos Totales</span>
        </div>
        <div class="p-4 rounded-xl bg-[#0e1017] border border-[#232838]">
          <span class="block text-2xl font-black text-white tabular-nums">${correctCount} / ${questions.length}</span>
          <span class="text-xs text-slate-400">Aciertos</span>
        </div>
      </div>

      ${!currentUser ? `
        <p class="text-xs text-slate-400"><a href="/login.html" class="text-neon underline">Inicia sesión</a> para que tus puntos queden registrados en el ranking de la comunidad.</p>
      ` : ''}

      <div class="pt-4 flex justify-center gap-3">
        <button id="retry-trivia-btn" class="btn-secondary text-xs">Jugar Otra Vez</button>
        <a href="/porras.html" class="btn-neon text-xs">Probar Porras &rarr;</a>
      </div>
    </div>
  `;

  document.getElementById('retry-trivia-btn')?.addEventListener('click', () => {
    loadQuestions();
  });
}

async function loadLeaderboard() {
  const container = document.getElementById('trivia-leaderboard');
  if (!container) return;

  try {
    const list = await getTriviaLeaderboard();
    if (list.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-500 py-2">No hay intentos registrados aún.</p>`;
      return;
    }

    container.innerHTML = list.map((a, i) => `
      <div class="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1118] border border-[#202534] text-xs">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-400 w-5 text-center">${i + 1}</span>
          <span class="font-semibold text-white">${a.user_nickname}</span>
          <span class="text-slate-500 text-[10px]">(${a.correct_answers}/${a.total_questions} aciertos)</span>
        </div>
        <span class="font-bold text-neon tabular-nums">${a.score} pts</span>
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}
