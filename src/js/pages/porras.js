/**
 * Fresh Football - Porras & Predictions Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { 
  getMatches, 
  getPredictions, 
  submitPrediction, 
  getPorrasRanking, 
  getCurrentUser 
} from '../supabase.js';

let currentUser = null;
let allMatches = [];
let userPredictions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('porras');
  currentUser = await getCurrentUser();
  setupTabs();
  await loadPorrasData();
});

function setupTabs() {
  const tabs = document.querySelectorAll('#porras-tabs button');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.className = 'px-4 py-2 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-white';
      });
      tab.className = 'px-4 py-2 text-xs font-bold border-b-2 border-neon text-neon';

      const target = tab.getAttribute('data-tab');
      document.getElementById('tab-matches').classList.toggle('hidden', target !== 'matches');
      document.getElementById('tab-my-predictions').classList.toggle('hidden', target !== 'my-predictions');
      document.getElementById('tab-ranking').classList.toggle('hidden', target !== 'ranking');

      if (target === 'my-predictions') renderMyPredictions();
      if (target === 'ranking') renderRanking();
    });
  });
}

async function loadPorrasData() {
  try {
    allMatches = await getMatches();
    if (currentUser) {
      userPredictions = await getPredictions({ userId: currentUser.id });
    }
    renderMatchesTab();
  } catch (err) {
    console.error(err);
    document.getElementById('tab-matches').innerHTML = `<div class="py-12 text-center text-xs text-red-400">Error al cargar partidos de porras.</div>`;
  }
}

function renderMatchesTab() {
  const container = document.getElementById('tab-matches');
  if (!container) return;

  if (allMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-state py-16">
        <div class="empty-state-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>
        </div>
        <h3 class="text-white font-bold text-base mb-1">No hay porras disponibles en este momento</h3>
        <p class="text-xs text-slate-400 max-w-sm">Los partidos de LaLiga se publicarán en cuanto esté disponible el calendario.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = allMatches.map(m => {
    const existingPred = userPredictions.find(p => p.match_id === m.id);
    const isFinished = m.status === 'finished';
    const isLive = m.status === 'live';
    const deadline = new Date(m.match_date);
    const isPastDeadline = new Date() > deadline || isFinished || isLive;

    return `
      <div class="fresh-card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Match info -->
        <div class="w-full md:w-52 space-y-1 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-neon uppercase">Jornada ${m.matchday}</span>
            <span class="text-slate-500">·</span>
            <span class="text-slate-400">${deadline.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p class="text-[11px] text-slate-500">
            ${isFinished ? 'Partido terminado' : isLive ? 'Partido en curso' : `Cierre: ${deadline.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>

        <!-- Matchup display -->
        <div class="flex-1 w-full grid grid-cols-5 items-center gap-2">
          <div class="col-span-2 flex items-center justify-end gap-2 text-right">
            <span class="text-xs sm:text-sm font-bold text-white truncate">${m.home_team}</span>
            ${m.home_shield ? `<img src="${m.home_shield}" class="w-6 h-6 object-contain shrink-0" />` : ''}
          </div>

          <div class="col-span-1 text-center font-bold text-xs">
            ${isFinished ? `
              <span class="text-sm font-extrabold text-white tabular-nums">${m.home_score} - ${m.away_score}</span>
            ` : `
              <span class="text-slate-500">VS</span>
            `}
          </div>

          <div class="col-span-2 flex items-center justify-start gap-2 text-left">
            ${m.away_shield ? `<img src="${m.away_shield}" class="w-6 h-6 object-contain shrink-0" />` : ''}
            <span class="text-xs sm:text-sm font-bold text-white truncate">${m.away_team}</span>
          </div>
        </div>

        <!-- Prediction form / state -->
        <div class="w-full md:w-auto shrink-0 flex items-center justify-end">
          ${existingPred ? `
            <div class="flex items-center gap-3 bg-[#0a0d14] border border-[#232838] py-2 px-3.5 rounded-xl">
              <div class="text-right">
                <span class="block text-[10px] text-slate-500 font-semibold uppercase">Tu pronóstico</span>
                <span class="text-sm font-black text-neon tabular-nums">${existingPred.predicted_home_score} - ${existingPred.predicted_away_score}</span>
              </div>
              ${isFinished ? `
                <div class="pl-2 border-l border-[#232838] text-right">
                  <span class="block text-[9px] text-slate-500 uppercase">Puntos</span>
                  <span class="text-xs font-bold text-white tabular-nums">+${existingPred.points_awarded || 0}</span>
                </div>
              ` : ''}
            </div>
          ` : isPastDeadline ? `
            <span class="text-xs text-slate-500 italic">Porra cerrada</span>
          ` : currentUser ? `
            <form class="flex items-center gap-2" data-porra-form="${m.id}">
              <input type="number" min="0" max="20" required placeholder="0" class="fresh-input w-12 py-1.5 px-2 text-center text-xs font-bold" name="home_score" />
              <span class="text-slate-500 font-bold">-</span>
              <input type="number" min="0" max="20" required placeholder="0" class="fresh-input w-12 py-1.5 px-2 text-center text-xs font-bold" name="away_score" />
              <button type="submit" class="btn-neon text-xs py-1.5 px-3">Guardar</button>
            </form>
          ` : `
            <a href="/login.html" class="btn-secondary text-xs py-1.5 px-3">Inicia sesión para jugar</a>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Handle Porra submissions
  container.querySelectorAll('[data-porra-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const matchId = form.getAttribute('data-porra-form');
      const homeScore = form.querySelector('[name="home_score"]').value;
      const awayScore = form.querySelector('[name="away_score"]').value;

      try {
        await submitPrediction({ matchId, homeScore, awayScore });
        showToast('¡Porra guardada correctamente!', 'success');
        await loadPorrasData();
      } catch (err) {
        showToast(err.message || 'Error al guardar porra', 'error');
      }
    });
  });
}

async function renderMyPredictions() {
  const container = document.getElementById('tab-my-predictions');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state py-12">
        <h3 class="text-white font-bold text-base mb-1">Inicia sesión</h3>
        <p class="text-xs text-slate-400 mb-4">Debes estar registrado para ver tu historial de porras.</p>
        <a href="/login.html" class="btn-neon text-xs">Iniciar Sesión &rarr;</a>
      </div>
    `;
    return;
  }

  try {
    userPredictions = await getPredictions({ userId: currentUser.id });
    if (userPredictions.length === 0) {
      container.innerHTML = `
        <div class="empty-state py-12">
          <h3 class="text-white font-bold text-base mb-1">Aún no has hecho ninguna porra</h3>
          <p class="text-xs text-slate-400 mb-4">Participa en los partidos de la jornada para sumar puntos.</p>
          <button onclick="document.querySelector('[data-tab=matches]').click()" class="btn-neon text-xs">Ver partidos abiertos &rarr;</button>
        </div>
      `;
      return;
    }

    container.innerHTML = userPredictions.map(p => {
      const m = p.matches || {};
      return `
        <div class="fresh-card p-4 flex items-center justify-between gap-4">
          <div>
            <span class="text-[11px] font-bold text-neon uppercase">Jornada ${m.matchday || '-'}</span>
            <h4 class="text-sm font-bold text-white">${m.home_team || 'Local'} vs ${m.away_team || 'Visitante'}</h4>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <span class="block text-[10px] text-slate-500 uppercase">Tu Pronóstico</span>
              <span class="text-sm font-black text-neon tabular-nums">${p.predicted_home_score} - ${p.predicted_away_score}</span>
            </div>

            <div class="text-right">
              <span class="block text-[10px] text-slate-500 uppercase">Resultado Real</span>
              <span class="text-sm font-bold text-white tabular-nums">${m.status === 'finished' ? `${m.home_score} - ${m.away_score}` : 'Pendiente'}</span>
            </div>

            <div class="text-right pl-2 border-l border-[#232838]">
              <span class="block text-[10px] text-slate-500 uppercase">Puntos</span>
              <span class="text-sm font-extrabold ${p.points_awarded > 0 ? 'text-neon' : 'text-slate-400'} tabular-nums">+${p.points_awarded || 0}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="py-8 text-center text-xs text-red-400">Error al cargar tus porras.</div>`;
  }
}

async function renderRanking() {
  const container = document.getElementById('tab-ranking');
  if (!container) return;

  try {
    const list = await getPorrasRanking();
    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state py-12">
          <h3 class="text-white font-bold text-base mb-1">Ranking sin participantes todavía</h3>
          <p class="text-xs text-slate-400">Sé el primero en acertar marcadores para liderar la tabla.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="fresh-card overflow-hidden">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr class="bg-[#0a0c12] border-b border-[#232838] text-slate-400 font-bold uppercase text-[11px]">
              <th class="py-3 px-4 text-center w-12">Pos</th>
              <th class="py-3 px-4">Usuario</th>
              <th class="py-3 px-4 text-right font-black text-neon">Puntos Totales</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#171b26]">
            ${list.map((u, idx) => `
              <tr class="hover:bg-[#151824] transition-colors">
                <td class="py-3 px-4 text-center font-bold ${idx === 0 ? 'text-yellow-400 text-base' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-400'}">
                  ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </td>
                <td class="py-3 px-4 font-bold text-white flex items-center gap-3">
                  <div class="w-7 h-7 rounded-full bg-[#1b202d] border border-[#262c3e] flex items-center justify-center text-xs font-bold text-neon overflow-hidden">
                    ${u.avatar_url ? `<img src="${u.avatar_url}" class="w-full h-full object-cover" />` : (u.nickname || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span>${u.nickname}</span>
                </td>
                <td class="py-3 px-4 text-right font-black text-neon text-base tabular-nums">${u.points || 0} pts</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="py-8 text-center text-xs text-red-400">Error al cargar el ranking.</div>`;
  }
}
