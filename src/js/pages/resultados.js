/**
 * Fresh Football - Resultados LaLiga Controller
 */
import { initNavigation } from '../navigation.js';
import { getMatches } from '../supabase.js';

let currentMatchday = 1;
let currentStatus = 'all';
let allMatches = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('resultados');
  setupMatchdaySelect();
  await loadMatches();
});

function setupMatchdaySelect() {
  const select = document.getElementById('matchday-select');
  if (!select) return;

  select.innerHTML = '';
  for (let i = 1; i <= 38; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `Jornada ${i}`;
    select.appendChild(opt);
  }

  select.value = currentMatchday;

  select.addEventListener('change', (e) => {
    currentMatchday = parseInt(e.target.value, 10);
    renderMatches();
  });

  const prevBtn = document.getElementById('prev-matchday');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentMatchday > 1) {
        currentMatchday--;
        select.value = currentMatchday;
        renderMatches();
      }
    });
  }

  const nextBtn = document.getElementById('next-matchday');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentMatchday < 38) {
        currentMatchday++;
        select.value = currentMatchday;
        renderMatches();
      }
    });
  }

  const statusBtns = document.querySelectorAll('#status-filters button');
  statusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      statusBtns.forEach(b => {
        b.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#12151e] border border-[#232838] text-slate-300 hover:text-white';
      });
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-neon text-black';
      currentStatus = btn.getAttribute('data-status');
      renderMatches();
    });
  });
}

async function loadMatches() {
  const container = document.getElementById('matches-list');
  try {
    allMatches = await getMatches();
    
    // Auto detect highest matchday with matches or fallback to 1
    if (allMatches.length > 0) {
      const matchdays = allMatches.map(m => m.matchday);
      const maxJornada = Math.max(...matchdays);
      currentMatchday = maxJornada;
      const select = document.getElementById('matchday-select');
      if (select) select.value = currentMatchday;
    }

    renderMatches();
  } catch (err) {
    console.error(err);
    if (container) {
      container.innerHTML = `<div class="py-12 text-center text-xs text-red-400">Error al cargar partidos.</div>`;
    }
  }
}

function renderMatches() {
  const container = document.getElementById('matches-list');
  if (!container) return;

  let filtered = allMatches.filter(m => Number(m.matchday) === Number(currentMatchday));

  if (currentStatus !== 'all') {
    filtered = filtered.filter(m => m.status === currentStatus);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state py-16">
        <div class="empty-state-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
        <h3 class="text-white font-bold text-base mb-1">No hay resultados disponibles</h3>
        <p class="text-xs text-slate-400 max-w-sm">No se han registrado resultados para la Jornada ${currentMatchday} todavía.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(m => {
    const dateFormatted = new Date(m.match_date).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    let statusBadge = '';
    if (m.status === 'finished') {
      statusBadge = `<span class="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">Finalizado</span>`;
    } else if (m.status === 'live') {
      statusBadge = `<span class="text-[10px] font-bold text-black bg-neon px-2 py-0.5 rounded animate-pulse">En Juego</span>`;
    } else {
      statusBadge = `<span class="text-[10px] font-semibold text-slate-400 bg-[#12151f] px-2 py-0.5 rounded border border-[#232838]">Por Jugar</span>`;
    }

    return `
      <div class="fresh-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Date & Jornada Info -->
        <div class="w-full sm:w-44 flex sm:flex-col justify-between items-center sm:items-start text-xs border-b sm:border-b-0 sm:border-r border-[#1f2434] pb-2 sm:pb-0 sm:pr-4">
          <span class="text-[11px] font-bold text-neon uppercase">Jornada ${m.matchday}</span>
          <span class="text-slate-300 font-medium">${dateFormatted}</span>
          <div class="mt-1">${statusBadge}</div>
        </div>

        <!-- Teams & Score Matchup -->
        <div class="flex-1 w-full grid grid-cols-7 items-center gap-2">
          <!-- Home Team (Cols 1-3) -->
          <div class="col-span-3 flex items-center justify-end gap-2.5 text-right">
            <span class="text-sm sm:text-base font-bold text-white truncate max-w-[120px] sm:max-w-none">${m.home_team}</span>
            ${m.home_shield ? `
              <img src="${m.home_shield}" alt="${m.home_team}" class="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
            ` : `
              <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#161a25] border border-[#262c3e] flex items-center justify-center text-xs font-bold text-neon shrink-0">⚽</div>
            `}
          </div>

          <!-- Score (Col 4) -->
          <div class="col-span-1 flex flex-col items-center justify-center">
            <div class="px-3 py-1.5 rounded-xl bg-[#090b10] border border-[#232838] shadow-inner text-center min-w-[58px]">
              ${m.status === 'finished' ? `
                <span class="text-base sm:text-lg font-black text-white tabular-nums">${m.home_score} - ${m.away_score}</span>
              ` : m.status === 'live' ? `
                <span class="text-base sm:text-lg font-black text-neon tabular-nums">${m.home_score ?? 0} - ${m.away_score ?? 0}</span>
              ` : `
                <span class="text-xs font-bold text-slate-400">VS</span>
              `}
            </div>
          </div>

          <!-- Away Team (Cols 5-7) -->
          <div class="col-span-3 flex items-center justify-start gap-2.5 text-left">
            ${m.away_shield ? `
              <img src="${m.away_shield}" alt="${m.away_team}" class="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
            ` : `
              <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#161a25] border border-[#262c3e] flex items-center justify-center text-xs font-bold text-neon shrink-0">⚽</div>
            `}
            <span class="text-sm sm:text-base font-bold text-white truncate max-w-[120px] sm:max-w-none">${m.away_team}</span>
          </div>
        </div>

        <!-- Action / Porra button -->
        <div class="w-full sm:w-auto flex justify-end">
          <a href="/porras.html" class="w-full sm:w-auto btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5" title="Hacer predicción para este partido">
            <span>Hacer Porra</span>
            <svg class="w-3.5 h-3.5 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
        </div>
      </div>
    `;
  }).join('');
}
