/**
 * Fresh Football - Clasificación LaLiga Controller
 */
import { initNavigation } from '../navigation.js';
import { getStandings } from '../supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('clasificacion');
  await loadStandings();
});

async function loadStandings() {
  const tbody = document.getElementById('standings-body');
  try {
    const list = await getStandings();
    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="p-8">
            <div class="empty-state py-8">
              <h3 class="text-white font-bold text-base mb-1">No hay datos de clasificación disponibles</h3>
              <p class="text-xs text-slate-400 max-w-sm">La tabla oficial de LaLiga se actualizará con los partidos de la temporada.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((row) => {
      let zoneIndicator = 'border-l-2 border-transparent';
      let posColor = 'text-slate-300 font-bold';

      if (row.position <= 4) {
        zoneIndicator = 'border-l-2 border-blue-500 bg-blue-500/5';
        posColor = 'text-blue-400 font-black';
      } else if (row.position <= 6) {
        zoneIndicator = 'border-l-2 border-orange-500 bg-orange-500/5';
        posColor = 'text-orange-400 font-black';
      } else if (row.position === 7) {
        zoneIndicator = 'border-l-2 border-emerald-500 bg-emerald-500/5';
        posColor = 'text-emerald-400 font-black';
      } else if (row.position >= 18) {
        zoneIndicator = 'border-l-2 border-red-500 bg-red-500/5';
        posColor = 'text-red-400 font-black';
      }

      return `
        <tr class="hover:bg-[#151824] transition-colors ${zoneIndicator}">
          <td class="py-3 px-3 sm:px-4 text-center ${posColor} tabular-nums">${row.position}</td>
          <td class="py-3 px-3 sm:px-4 font-bold text-white flex items-center gap-3">
            ${row.shield ? `
              <img src="${row.shield}" alt="${row.team}" class="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0" />
            ` : `
              <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1b202d] border border-[#262c3e] flex items-center justify-center text-[10px] font-bold text-neon shrink-0">⚽</div>
            `}
            <span class="truncate">${row.team}</span>
          </td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-300 tabular-nums">${row.pj}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums">${row.pg}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums">${row.pe}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums">${row.pp}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums hidden md:table-cell">${row.gf}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums hidden md:table-cell">${row.gc}</td>
          <td class="py-3 px-2 sm:px-3 text-center font-semibold ${row.dg > 0 ? 'text-neon' : row.dg < 0 ? 'text-red-400' : 'text-slate-400'} tabular-nums">
            ${row.dg > 0 ? `+${row.dg}` : row.dg}
          </td>
          <td class="py-3 px-3 sm:px-4 text-right font-black text-neon text-sm sm:text-base tabular-nums">${row.points}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="10" class="py-8 text-center text-xs text-red-400">Error al cargar la clasificación.</td></tr>`;
  }
}
