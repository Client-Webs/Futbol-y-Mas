/**
 * Fresh Football - Encuestas Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { getPolls, votePoll, hasUserVoted, getCurrentUser } from '../supabase.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('encuestas');
  currentUser = await getCurrentUser();
  await loadPolls();
});

async function loadPolls() {
  const container = document.getElementById('polls-list');
  try {
    const polls = await getPolls();
    if (!polls || polls.length === 0) {
      container.innerHTML = `
        <div class="empty-state py-16">
          <div class="empty-state-icon">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <h3 class="text-white font-bold text-base mb-1">No hay encuestas activas</h3>
          <p class="text-xs text-slate-400 max-w-sm">Próximamente se publicarán nuevas encuestas para conocer tu opinión.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    for (const poll of polls) {
      const isClosed = poll.status === 'closed';
      const voted = await hasUserVoted(poll.id);
      const totalVotes = poll.poll_options.reduce((acc, curr) => acc + (curr.votes_count || 0), 0);
      const showResults = voted || isClosed;

      const card = document.createElement('div');
      card.className = 'fresh-card p-6 space-y-4';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${isClosed ? 'bg-slate-800 text-slate-400' : 'bg-neon/15 text-neon border border-neon/30'}">
              ${isClosed ? 'Cerrada' : 'Activa'}
            </span>
            <span class="text-xs text-slate-400">${new Date(poll.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
          </div>
          <span class="text-xs font-semibold text-slate-400">${totalVotes} votos totales</span>
        </div>

        <h3 class="text-lg font-bold text-white leading-snug">${poll.question}</h3>

        <div class="space-y-3" id="poll-opts-${poll.id}">
          ${poll.poll_options.map(opt => {
            const pct = totalVotes > 0 ? Math.round(((opt.votes_count || 0) / totalVotes) * 100) : 0;
            return `
              <div class="relative overflow-hidden rounded-xl border ${showResults ? 'border-[#232838]' : 'border-[#2e3549] hover:border-neon cursor-pointer'} bg-[#0f121a] p-3.5 transition-all"
                   data-poll-option-btn="${opt.id}" 
                   data-poll-id="${poll.id}">
                ${showResults ? `
                  <div class="absolute inset-y-0 left-0 bg-neon/15 transition-all duration-500" style="width: ${pct}%"></div>
                ` : ''}
                <div class="relative z-10 flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span class="text-white">${opt.option_text}</span>
                  ${showResults ? `
                    <span class="text-neon tabular-nums font-bold">${pct}% <span class="text-slate-400 font-normal">(${opt.votes_count})</span></span>
                  ` : `
                    <span class="text-neon flex items-center gap-1 font-bold">Votar &rarr;</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${!currentUser && !showResults ? `
          <p class="text-xs text-slate-400 text-center pt-2"><a href="/login.html" class="text-neon underline">Inicia sesión</a> para participar en esta encuesta.</p>
        ` : ''}
      `;

      if (!showResults) {
        card.querySelectorAll('[data-poll-option-btn]').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!currentUser) {
              showToast('Debes iniciar sesión para votar.', 'error');
              setTimeout(() => window.location.href = '/login.html', 700);
              return;
            }
            const pollId = btn.getAttribute('data-poll-id');
            const optionId = btn.getAttribute('data-poll-option-btn');
            try {
              await votePoll({ pollId, optionId });
              showToast('¡Voto registrado con éxito!', 'success');
              await loadPolls();
            } catch (err) {
              showToast(err.message || 'Error al votar', 'error');
            }
          });
        });
      }

      container.appendChild(card);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="py-12 text-center text-xs text-red-400">Error al cargar encuestas.</div>`;
  }
}
