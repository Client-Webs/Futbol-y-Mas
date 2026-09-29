/**
 * Fresh Football - Admin Panel Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { 
  getCurrentUser, 
  getNews, 
  createNews, 
  updateNews, 
  deleteNews,
  getMatches, 
  saveMatch, 
  deleteMatch,
  importMatchdayBatch,
  getStandings, 
  saveStandings,
  saveStandingTeam,
  deleteStandingTeam,
  recalculateStandingsFromMatches,
  checkStandingsConsistency,
  importStandingsBatch,
  getAllProfiles,
  getDashboardStats,
  getPolls, 
  createPoll, 
  closePoll, 
  deletePoll,
  getDebates, 
  deleteDebate,
  getComments, 
  deleteComment,
  getPredictions,
  getTriviaQuestions, 
  saveTriviaQuestion, 
  deleteTriviaQuestion,
  getMemes, 
  deleteMeme,
  normalizeTeamName,
  normalizeMatchStatus,
  isConfigured, 
  SUPABASE_URL, 
  SUPABASE_KEY,
  getTeams,
  saveTeam,
  deleteTeam
} from '../supabase.js';

let currentUser = null;
let currentTab = 'news';
let allTeams = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('admin');
  currentUser = await getCurrentUser();

  const isAdmin = currentUser && (currentUser.profile?.role === 'admin' || currentUser.email?.includes('admin'));

  const authCheckingState = document.getElementById('auth-checking-state');
  const unauthorizedBox = document.getElementById('unauthorized-box');
  const adminDashboard = document.getElementById('admin-dashboard');

  if (authCheckingState) authCheckingState.classList.add('hidden');

  if (!isAdmin) {
    if (unauthorizedBox) unauthorizedBox.classList.remove('hidden');
    if (adminDashboard) adminDashboard.classList.add('hidden');
    showToast('Acceso denegado: se requieren permisos de administrador.', 'error');
    setTimeout(() => {
      if (!currentUser) {
        window.location.href = '/login.html?redirect=/admin.html';
      } else {
        window.location.href = '/index.html';
      }
    }, 2200);
    return;
  }

  // If verified admin, reveal dashboard
  if (adminDashboard) adminDashboard.classList.remove('hidden');

  setupTabs();
  setupTeamsAdmin();
  setupNewsAdmin();
  setupMatchesAdmin();
  setupStandingsAdmin();
  setupUsersAdmin();
  setupPollsAdmin();
  setupDebatesAdmin();
  setupCommentsAdmin();
  setupPorrasAdmin();
  setupTriviaAdmin();
  setupMemesAdmin();
  setupSupabaseConfigTab();

  // Load dashboard counters and first tab
  await populateTeamSelectors();
  await setupDashboardCounters();
  await loadNewsAdmin();
});

function setupTabs() {
  const tabs = document.querySelectorAll('#admin-tabs button');
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      tabs.forEach(t => {
        t.className = 'px-3.5 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white whitespace-nowrap';
      });
      tab.className = 'px-3.5 py-2 text-xs font-bold rounded-lg bg-neon text-black whitespace-nowrap';

      currentTab = tab.getAttribute('data-tab');

      // Hide all contents
      document.querySelectorAll('[id^="tab-"][id$="-content"]').forEach(el => el.classList.add('hidden'));

      // Show active
      const activeEl = document.getElementById(`tab-${currentTab}-content`);
      if (activeEl) activeEl.classList.remove('hidden');

      // Refresh dashboard counters on tab switch
      setupDashboardCounters();

      // Trigger data load
      if (currentTab === 'news') await loadNewsAdmin();
      if (currentTab === 'teams') await loadTeamsAdmin();
      if (currentTab === 'matches') await loadMatchesAdmin();
      if (currentTab === 'standings') await loadStandingsAdmin();
      if (currentTab === 'users') await loadUsersAdmin();
      if (currentTab === 'polls') await loadPollsAdmin();
      if (currentTab === 'debates') await loadDebatesAdmin();
      if (currentTab === 'comments') await loadCommentsAdmin();
      if (currentTab === 'porras') await loadPorrasAdmin();
      if (currentTab === 'trivia') await loadTriviaAdmin();
      if (currentTab === 'memes') await loadMemesAdmin();
      if (currentTab === 'supabase') await loadSupabaseSchemaPreview();
    });
  });

  // Handle hash navigation
  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    const tabBtn = document.querySelector(`[data-tab="${hash}"]`);
    if (tabBtn) tabBtn.click();
  }
}

/* ==========================================================================
   DASHBOARD STATS (REAL SUPABASE COUNTERS)
   ========================================================================== */
async function setupDashboardCounters() {
  try {
    const stats = await getDashboardStats();
    const setStat = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val !== undefined && val !== null ? val : 0;
    };
    setStat('stat-users', stats.users);
    setStat('stat-teams', stats.teams);
    setStat('stat-news', stats.news);
    setStat('stat-matches', stats.matches);
    setStat('stat-comments', stats.comments);
    setStat('stat-debates', stats.debates);
    setStat('stat-polls', stats.polls);
    setStat('stat-memes', stats.memes);
    setStat('stat-trivia', stats.trivia);
  } catch (e) {
    console.error('Error fetching dashboard stats', e);
  }
}

/* ==========================================================================
   EQUIPOS ADMIN (GESTIÓN COMPLETA DE EQUIPOS LALIGA)
   ========================================================================== */
function setupTeamsAdmin() {
  const showAddBtn = document.getElementById('btn-show-add-team');
  const formBox = document.getElementById('team-form-box');
  const cancelBtn = document.getElementById('team-cancel');
  const form = document.getElementById('admin-team-form');

  showAddBtn?.addEventListener('click', () => {
    form.reset();
    document.getElementById('team-id').value = '';
    document.getElementById('team-form-title').innerText = 'Añadir Nuevo Equipo';
    formBox.classList.remove('hidden');
    formBox.scrollIntoView({ behavior: 'smooth' });
  });

  cancelBtn?.addEventListener('click', () => {
    formBox.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('team-id').value;
    const name = document.getElementById('team-name').value.trim();
    const short_name = document.getElementById('team-short-name').value.trim();
    const shield = document.getElementById('team-shield').value.trim();

    try {
      await saveTeam({
        ...(id ? { id } : {}),
        name,
        short_name,
        shield
      });

      showToast(`Equipo "${name}" guardado correctamente.`, 'success');
      formBox.classList.add('hidden');
      await loadTeamsAdmin();
      await setupDashboardCounters();
      await populateTeamSelectors();
    } catch (err) {
      showToast(err.message || 'Error al guardar equipo', 'error');
    }
  });

  // Search and Sort Listeners
  const searchInput = document.getElementById('team-search');
  const sortSelect = document.getElementById('team-sort-select');

  searchInput?.addEventListener('input', () => {
    filterAndRenderTeams();
  });

  sortSelect?.addEventListener('change', () => {
    filterAndRenderTeams();
  });
}

async function loadTeamsAdmin() {
  const tbody = document.getElementById('admin-teams-table-body');
  if (!tbody) return;

  try {
    allTeams = await getTeams();
    filterAndRenderTeams();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-red-400">Error al cargar equipos.</td></tr>`;
  }
}

function filterAndRenderTeams() {
  const tbody = document.getElementById('admin-teams-table-body');
  if (!tbody) return;

  const searchVal = (document.getElementById('team-search')?.value || '').toLowerCase().trim();
  const sortVal = document.getElementById('team-sort-select')?.value || 'name-asc';

  let filtered = [...allTeams];

  if (searchVal) {
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(searchVal) || 
      (t.short_name && t.short_name.toLowerCase().includes(searchVal)) ||
      t.id.toLowerCase().includes(searchVal)
    );
  }

  if (sortVal === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortVal === 'name-desc') {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortVal === 'created-desc') {
    filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-500 font-medium">No se encontraron equipos.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const shieldHtml = t.shield 
      ? `<img src="${t.shield}" class="w-8 h-8 object-contain mx-auto" alt="Escudo de ${t.name}" onerror="this.src=''" />`
      : `<div class="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 mx-auto font-bold uppercase">S/E</div>`;
    
    const formattedDate = t.created_at ? new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

    return `
      <tr class="hover:bg-[#0c0e17] transition-colors text-xs border-b border-[#171b26]">
        <td class="py-3 px-4 text-center">${shieldHtml}</td>
        <td class="py-3 px-4 font-bold text-white">${t.name}</td>
        <td class="py-3 px-4 text-slate-300 font-medium">${t.short_name || '-'}</td>
        <td class="py-3 px-4 text-slate-400 font-mono text-[10px] select-all">${t.id}</td>
        <td class="py-3 px-4 text-slate-400 text-[11px]">${formattedDate}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <button data-edit-team="${t.id}" class="p-1 hover:text-neon text-slate-400 transition-colors" title="Editar Equipo">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
            <button data-delete-team="${t.id}" class="p-1 hover:text-red-400 text-slate-400 transition-colors" title="Eliminar Equipo">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach Action Listeners
  tbody.querySelectorAll('[data-edit-team]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-team');
      const t = allTeams.find(x => x.id === id);
      if (!t) return;

      document.getElementById('team-id').value = t.id;
      document.getElementById('team-name').value = t.name;
      document.getElementById('team-short-name').value = t.short_name || '';
      document.getElementById('team-shield').value = t.shield || '';

      document.getElementById('team-form-title').innerText = 'Editar Equipo';
      const formBox = document.getElementById('team-form-box');
      formBox.classList.remove('hidden');
      formBox.scrollIntoView({ behavior: 'smooth' });
    });
  });

  tbody.querySelectorAll('[data-delete-team]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-team');
      const t = allTeams.find(x => x.id === id);
      if (!t) return;

      if (!confirm(`¿Seguro que quieres eliminar este equipo?\n\nEquipo: ${t.name}`)) return;

      try {
        await deleteTeam(id);
        showToast('Equipo eliminado correctamente.', 'success');
        await loadTeamsAdmin();
        await setupDashboardCounters();
        await populateTeamSelectors();
      } catch (err) {
        showToast(err.message || 'Error al eliminar el equipo', 'error');
      }
    });
  });
}

async function populateTeamSelectors() {
  const homeSelect = document.getElementById('match-form-home-team');
  const awaySelect = document.getElementById('match-form-away-team');
  const standingsSelect = document.getElementById('standing-team-name');

  if (!homeSelect && !awaySelect && !standingsSelect) return;

  try {
    const teams = await getTeams();
    const optionsHtml = teams.map(t => `<option value="${t.id}">${t.name} (${t.short_name || t.name})</option>`).join('');

    if (homeSelect) {
      const currentVal = homeSelect.value;
      homeSelect.innerHTML = '<option value="">Seleccionar equipo local...</option>' + optionsHtml;
      if (currentVal) homeSelect.value = currentVal;
    }
    if (awaySelect) {
      const currentVal = awaySelect.value;
      awaySelect.innerHTML = '<option value="">Seleccionar equipo visitante...</option>' + optionsHtml;
      if (currentVal) awaySelect.value = currentVal;
    }
    if (standingsSelect) {
      const currentVal = standingsSelect.value;
      standingsSelect.innerHTML = '<option value="">Selecciona equipo de LaLiga...</option>' + optionsHtml;
      if (currentVal) standingsSelect.value = currentVal;
    }
  } catch (err) {
    console.error('Error populating team selectors:', err);
  }
}

/* ==========================================================================
   USERS ADMIN (REAL PROFILES FROM SUPABASE)
   ========================================================================== */
function setupUsersAdmin() {
  const refreshBtn = document.getElementById('btn-refresh-users');
  refreshBtn?.addEventListener('click', async () => {
    await loadUsersAdmin();
    await setupDashboardCounters();
    showToast('Lista de usuarios actualizada.', 'info');
  });
}

async function loadUsersAdmin() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  try {
    const profiles = await getAllProfiles();
    if (!profiles || profiles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-500 font-medium">Todavía no hay usuarios registrados en Supabase.</td></tr>`;
      return;
    }

    tbody.innerHTML = profiles.map(p => {
      const dateFormatted = p.created_at 
        ? new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) 
        : 'Reciente';

      const initial = (p.nickname || p.email || 'U').charAt(0).toUpperCase();

      return `
        <tr class="hover:bg-[#141722] transition-colors">
          <td class="py-3 px-4 font-bold text-white flex items-center gap-3">
            <div class="w-7 h-7 rounded-full bg-[#1b202d] border border-[#262c3e] flex items-center justify-center text-xs font-bold text-neon overflow-hidden shrink-0">
              ${p.avatar_url ? `<img src="${p.avatar_url}" class="w-full h-full object-cover" />` : initial}
            </div>
            <div class="min-w-0">
              <span class="truncate block">${p.nickname || 'Sin nombre'}</span>
            </div>
          </td>
          <td class="py-3 px-4 text-slate-300 font-mono text-xs">${p.email || '—'}</td>
          <td class="py-3 px-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.role === 'admin' ? 'bg-neon text-black font-black' : 'bg-slate-800 text-slate-400'}">
              ${p.role === 'admin' ? 'Admin' : 'Usuario'}
            </span>
          </td>
          <td class="py-3 px-3 text-right font-black text-neon tabular-nums">${p.points || 0} pts</td>
          <td class="py-3 px-4 text-right text-slate-400 text-xs">${dateFormatted}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-400">Error al cargar usuarios de Supabase.</td></tr>`;
  }
}

/* ==========================================================================
   2. NOTICIAS MANAGEMENT
   ========================================================================== */
function setupNewsAdmin() {
  const showBtn = document.getElementById('btn-show-create-news');
  const formBox = document.getElementById('news-form-box');
  const cancelBtn = document.getElementById('news-form-cancel');
  const form = document.getElementById('admin-news-form');

  showBtn?.addEventListener('click', () => {
    form.reset();
    document.getElementById('edit-news-id').value = '';
    document.getElementById('news-form-title').innerText = 'Crear Noticia';
    formBox.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formBox.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-news-id').value;
    const title = document.getElementById('news-form-title-input').value.trim();
    const category = document.getElementById('news-form-category').value;
    const imageUrl = document.getElementById('news-form-image').value.trim();
    const excerpt = document.getElementById('news-form-excerpt').value.trim();
    const content = document.getElementById('news-form-content').value.trim();
    const published = document.getElementById('news-form-published').checked;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
      if (id) {
        await updateNews(id, { title, category, image_url: imageUrl, excerpt, content, published });
        showToast('Noticia actualizada.', 'success');
      } else {
        await createNews({
          title,
          slug,
          category,
          image_url: imageUrl,
          excerpt,
          content,
          published,
          author_id: currentUser.id,
          author_name: currentUser.profile?.nickname || 'Fresh Football Redacción'
        });
        showToast('Noticia creada correctamente.', 'success');
      }
      formBox.classList.add('hidden');
      await loadNewsAdmin();
    } catch (err) {
      showToast(err.message || 'Error al guardar noticia', 'error');
    }
  });
}

async function loadNewsAdmin() {
  const tbody = document.getElementById('admin-news-table-body');
  if (!tbody) return;

  try {
    const list = await getNews({ limit: 100 });
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">No hay noticias registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(n => `
      <tr class="hover:bg-[#141722] transition-colors">
        <td class="py-3 px-4 font-bold text-white max-w-xs truncate">${n.title}</td>
        <td class="py-3 px-3 text-neon font-semibold">${n.category}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${n.published ? 'bg-neon/15 text-neon' : 'bg-slate-800 text-slate-400'}">
            ${n.published ? 'Publicada' : 'Borrador'}
          </span>
        </td>
        <td class="py-3 px-3 text-slate-400">${new Date(n.created_at).toLocaleDateString('es-ES')}</td>
        <td class="py-3 px-4 text-right space-x-2">
          <button data-edit-news="${n.id}" class="text-xs text-neon hover:underline font-semibold">Editar</button>
          <button data-delete-news="${n.id}" class="text-xs text-red-400 hover:underline font-semibold">Eliminar</button>
        </td>
      </tr>
    `).join('');

    // Attach edit
    tbody.querySelectorAll('[data-edit-news]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-news');
        const item = list.find(x => x.id === id);
        if (!item) return;
        document.getElementById('edit-news-id').value = item.id;
        document.getElementById('news-form-title-input').value = item.title;
        document.getElementById('news-form-category').value = item.category;
        document.getElementById('news-form-image').value = item.image_url || '';
        document.getElementById('news-form-excerpt').value = item.excerpt || '';
        document.getElementById('news-form-content').value = item.content;
        document.getElementById('news-form-published').checked = item.published;
        document.getElementById('news-form-title').innerText = 'Editar Noticia';
        document.getElementById('news-form-box').classList.remove('hidden');
      });
    });

    // Attach delete
    tbody.querySelectorAll('[data-delete-news]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta noticia?')) return;
        const id = btn.getAttribute('data-delete-news');
        await deleteNews(id);
        showToast('Noticia eliminada.', 'info');
        await loadNewsAdmin();
      });
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-red-400">Error al cargar noticias.</td></tr>`;
  }
}

/* ==========================================================================
   3. RESULTADOS & MATCHES ADMIN (WITH CHATGPT PARSER & FILTERS)
   ========================================================================== */
let allAdminMatches = [];
let parsedMatchdayResult = null;

function setupMatchesAdmin() {
  const showBtn = document.getElementById('btn-show-create-match');
  const formBox = document.getElementById('match-form-box');
  const cancelBtn = document.getElementById('match-form-cancel');
  const form = document.getElementById('admin-match-form');

  // ChatGPT Import UI Elements
  const toggleImportBtn = document.getElementById('btn-toggle-import-jornada');
  const importBox = document.getElementById('chatgpt-import-box');
  const copyPromptBtn = document.getElementById('btn-copy-chatgpt-prompt');
  const promptDisplay = document.getElementById('chatgpt-prompt-display');
  const copyActualPromptBtn = document.getElementById('btn-copy-actual-prompt');
  const promptTextEl = document.getElementById('chatgpt-prompt-text');
  const textarea = document.getElementById('chatgpt-matchday-textarea');
  const clearBtn = document.getElementById('btn-clear-chatgpt');
  const analyzeBtn = document.getElementById('btn-analyze-matchday');
  const previewBox = document.getElementById('matchday-preview-box');
  const cancelPreviewBtn = document.getElementById('btn-cancel-preview');
  const saveMatchdayBtn = document.getElementById('btn-save-matchday');

  toggleImportBtn?.addEventListener('click', () => {
    importBox?.classList.toggle('hidden');
  });

  copyPromptBtn?.addEventListener('click', () => {
    promptDisplay?.classList.toggle('hidden');
  });

  const generateSearchBtn = document.getElementById('btn-generate-chatgpt-search');
  generateSearchBtn?.addEventListener('click', () => {
    const season = document.getElementById('import-season-input')?.value || '2026/2027';
    const matchday = document.getElementById('import-matchday-input')?.value || '7';
    const competition = document.getElementById('import-competition-input')?.value || 'LaLiga';

    const prompt = `Necesito los partidos reales de ${competition}.

Temporada: ${season}
Jornada: ${matchday}

BUSCA ESTA INFORMACIÓN EN INTERNET.

No te estoy proporcionando los partidos. Tienes que encontrarlos tú mediante búsqueda web.

Consulta fuentes fiables y actuales y contrasta la información cuando sea necesario.

Necesito TODOS los partidos de esta jornada.

No inventes datos.

Comprueba:
- equipos
- fecha
- hora
- estadio
- estado del partido

Devuelve ÚNICAMENTE la información en el siguiente formato:

COMPETICIÓN: ${competition}
JORNADA: ${matchday}
TEMPORADA: ${season}

PARTIDOS:

1.
LOCAL:
VISITANTE:
FECHA: DD/MM/YYYY
HORA: HH:MM
ESTADIO:
ESTADO: scheduled

2.
LOCAL:
VISITANTE:
FECHA: DD/MM/YYYY
HORA: HH:MM
ESTADIO:
ESTADO: scheduled

Continúa hasta incluir TODOS los partidos.

Valores permitidos para ESTADO:

scheduled
live
finished

Si el partido ha terminado:

GOLES_LOCAL:
GOLES_VISITANTE:

Si algún dato no está disponible con suficiente fiabilidad, déjalo vacío en vez de inventarlo.

NO escribas explicaciones antes ni después.

NO escribas una tabla.

NO escribas texto adicional.`;

    if (promptTextEl) promptTextEl.innerText = prompt;
    if (promptDisplay) promptDisplay.classList.remove('hidden');

    navigator.clipboard.writeText(prompt);
    showToast('Prompt copiado. Ábrelo en ChatGPT y deja que busque la jornada.', 'success');
  });

  copyActualPromptBtn?.addEventListener('click', () => {
    if (promptTextEl) {
      navigator.clipboard.writeText(promptTextEl.innerText);
      showToast('Prompt copiado. Ábrelo en ChatGPT y deja que busque la jornada.', 'success');
    }
  });

  clearBtn?.addEventListener('click', () => {
    if (textarea) textarea.value = '';
    if (previewBox) previewBox.classList.add('hidden');
    parsedMatchdayResult = null;
  });

  cancelPreviewBtn?.addEventListener('click', () => {
    if (previewBox) previewBox.classList.add('hidden');
  });

  analyzeBtn?.addEventListener('click', async () => {
    const text = textarea?.value?.trim();
    if (!text) {
      showToast('Por favor, pega el texto estructurado generado por ChatGPT.', 'error');
      return;
    }

    try {
      parsedMatchdayResult = parseMatchdayStructuredText(text);
      await renderMatchdayPreview(parsedMatchdayResult);
      if (previewBox) previewBox.classList.remove('hidden');
      showToast('Jornada analizada correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al analizar el texto.', 'error');
    }
  });

  saveMatchdayBtn?.addEventListener('click', async () => {
    if (!parsedMatchdayResult || parsedMatchdayResult.matches.length === 0) {
      showToast('No hay partidos válidos para guardar.', 'error');
      return;
    }

    const hasCriticalErrors = parsedMatchdayResult.matches.some(m => m.errors.length > 0);
    if (hasCriticalErrors) {
      if (!confirm('Algunos partidos tienen errores o advertencias. ¿Deseas guardar de todos modos los correctos?')) {
        return;
      }
    }

    const updateExisting = document.getElementById('matchday-update-existing')?.checked || false;

    try {
      saveMatchdayBtn.disabled = true;
      saveMatchdayBtn.innerText = 'Guardando en Supabase...';

      const validMatches = parsedMatchdayResult.matches.filter(m => m.errors.length === 0 || m.home_team && m.away_team);
      const stats = await importMatchdayBatch(validMatches, updateExisting);

      showToast(`Jornada guardada: ${stats.newCount} nuevos, ${stats.updatedCount} actualizados y ${stats.skippedCount} omitidos.`, 'success');
      if (importBox) importBox.classList.add('hidden');
      if (textarea) textarea.value = '';
      if (previewBox) previewBox.classList.add('hidden');
      parsedMatchdayResult = null;
      await loadMatchesAdmin();
    } catch (err) {
      showToast(err.message || 'Error al guardar la jornada en Supabase', 'error');
    } finally {
      saveMatchdayBtn.disabled = false;
      saveMatchdayBtn.innerText = 'Guardar jornada en Supabase';
    }
  });

  showBtn?.addEventListener('click', () => {
    form.reset();
    document.getElementById('edit-match-id').value = '';
    document.getElementById('match-form-title').innerText = 'Registrar Partido';
    formBox.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formBox.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-match-id').value;
    const season = document.getElementById('match-form-season')?.value.trim() || '2026/2027';
    const matchday = parseInt(document.getElementById('match-form-jornada').value, 10);
    const matchDate = document.getElementById('match-form-date').value;
    const status = document.getElementById('match-form-status').value;
    const stadium = document.getElementById('match-form-stadium')?.value.trim() || '';

    const home_team_id = document.getElementById('match-form-home-team').value;
    const homeShield = document.getElementById('match-form-home-shield').value.trim();
    const homeScoreRaw = document.getElementById('match-form-home-score').value;
    const homeScore = homeScoreRaw !== '' ? parseInt(homeScoreRaw, 10) : null;

    const away_team_id = document.getElementById('match-form-away-team').value;
    const awayShield = document.getElementById('match-form-away-shield').value.trim();
    const awayScoreRaw = document.getElementById('match-form-away-score').value;
    const awayScore = awayScoreRaw !== '' ? parseInt(awayScoreRaw, 10) : null;

    if (status === 'finished' && homeScore !== null && awayScore !== null) {
      if (!confirm(`¿Confirmar resultado ${homeScore}-${awayScore}? Este resultado se utilizará para calcular la clasificación.`)) {
        return;
      }
    }

    const payload = {
      ...(id ? { id } : {}),
      season,
      matchday,
      match_date: new Date(matchDate).toISOString(),
      status,
      stadium,
      home_team_id,
      away_team_id,
      home_shield: homeShield,
      home_score: homeScore,
      away_shield: awayShield,
      away_score: awayScore
    };

    try {
      await saveMatch(payload);
      showToast('Partido guardado con éxito.', 'success');
      formBox.classList.add('hidden');
      
      if (status === 'finished') {
        if (confirm('¿Deseas recalcular la clasificación oficial ahora para reflejar este resultado?')) {
          await recalculateStandingsFromMatches(season);
          showToast('Clasificación recalculada con éxito.', 'success');
        }
      }

      await loadMatchesAdmin();
      await setupDashboardCounters();
    } catch (err) {
      showToast(err.message || 'Error al guardar partido', 'error');
    }
  });

  // Filters setup
  const filterSeason = document.getElementById('admin-filter-season');
  const filterJornada = document.getElementById('admin-filter-matchday');
  const filterStatus = document.getElementById('admin-filter-status');
  const sortMatches = document.getElementById('admin-sort-matches');
  const searchTeam = document.getElementById('admin-search-team');

  [filterSeason, filterJornada, filterStatus, sortMatches].forEach(el => {
    el?.addEventListener('change', filterAndRenderMatchesAdmin);
  });
  searchTeam?.addEventListener('input', filterAndRenderMatchesAdmin);
}

function parseMatchdayStructuredText(text) {
  let competition = 'LaLiga';
  let matchday = 1;
  let season = '2026/2027';

  const compMatch = text.match(/COMPETICIÓN:\s*(.+)/i);
  if (compMatch) competition = compMatch[1].trim();

  const jMatch = text.match(/JORNADA:\s*([0-9]+)/i);
  if (jMatch) matchday = parseInt(jMatch[1], 10);

  const sMatch = text.match(/TEMPORADA:\s*([0-9\/]+)/i);
  if (sMatch) season = sMatch[1].trim();

  const matchBlocks = [];
  const lines = text.split('\n');
  let currentBlockLines = [];

  for (let line of lines) {
    if (/^\s*[0-9]+\.\s*$/.test(line) || /^\s*[0-9]+\.\s+[A-Z]/.test(line)) {
      if (currentBlockLines.length > 0) {
        matchBlocks.push(currentBlockLines.join('\n'));
        currentBlockLines = [];
      }
      if (/^\s*[0-9]+\.\s+[A-Z]/.test(line)) {
        currentBlockLines.push(line.replace(/^\s*[0-9]+\.\s*/, ''));
      }
    } else {
      currentBlockLines.push(line);
    }
  }
  if (currentBlockLines.length > 0) {
    matchBlocks.push(currentBlockLines.join('\n'));
  }

  let blocksToProcess = matchBlocks;
  if (blocksToProcess.length <= 1) {
    const rawParts = text.split(/\n\s*[0-9]+\.\s*\n/);
    if (rawParts.length > 1) {
      blocksToProcess = rawParts.slice(1);
    } else {
      const localSplits = text.split(/(?=LOCAL:)/i);
      if (localSplits.length > 1) {
        blocksToProcess = localSplits.filter(s => s.trim().length > 0);
      }
    }
  }

  const matchesList = [];
  let index = 0;

  for (const block of blocksToProcess) {
    index++;
    const getField = (fieldKey) => {
      const regex = new RegExp(`${fieldKey}:\\s*(.+)`, 'i');
      const m = block.match(regex);
      return m ? m[1].trim() : '';
    };

    const local = getField('LOCAL');
    const visitante = getField('VISITANTE');
    const fechaStr = getField('FECHA');
    const horaStr = getField('HORA') || '20:00';
    const estadio = getField('ESTADIO');
    const estadoRaw = getField('ESTADO') || 'programado';
    const golesLocalStr = getField('GOLES_LOCAL');
    const golesVisStr = getField('GOLES_VISITANTE');

    const matchErrors = [];
    if (!local) matchErrors.push(`Falta equipo local`);
    if (!visitante) matchErrors.push(`Falta equipo visitante`);
    if (local && visitante && local.toLowerCase() === visitante.toLowerCase()) {
      matchErrors.push(`Local y visitante iguales`);
    }
    if (!fechaStr) matchErrors.push(`Falta fecha`);

    const normLocal = normalizeTeamName(local);
    const normVisitante = normalizeTeamName(visitante);

    const homeTeamObj = allTeams.find(t => t.name.toLowerCase() === normLocal.toLowerCase());
    const awayTeamObj = allTeams.find(t => t.name.toLowerCase() === normVisitante.toLowerCase());

    if (local && !homeTeamObj) {
      matchErrors.push(`No se ha encontrado el equipo "${local}" en la base de datos.`);
    }
    if (visitante && !awayTeamObj) {
      matchErrors.push(`No se ha encontrado el equipo "${visitante}" en la base de datos.`);
    }

    let matchDateISO = new Date().toISOString();
    if (fechaStr) {
      const partsDate = fechaStr.split('/');
      if (partsDate.length === 3) {
        const day = partsDate[0].padStart(2, '0');
        const month = partsDate[1].padStart(2, '0');
        const year = partsDate[2];
        const [hours, minutes] = (horaStr || '20:00').split(':');
        const isoString = `${year}-${month}-${day}T${(hours||'20').padStart(2,'0')}:${(minutes||'00').padStart(2,'0')}:00Z`;
        const parsedDate = new Date(isoString);
        if (!isNaN(parsedDate.getTime())) {
          matchDateISO = parsedDate.toISOString();
        } else {
          matchErrors.push(`Fecha inválida`);
        }
      } else {
        matchErrors.push(`Formato fecha (DD/MM/YYYY)`);
      }
    }

    let homeScore = null;
    let awayScore = null;
    if (golesLocalStr !== '') {
      const parsedH = parseInt(golesLocalStr, 10);
      if (!isNaN(parsedH)) homeScore = parsedH;
      else matchErrors.push(`Goles local inválidos`);
    }
    if (golesVisStr !== '') {
      const parsedA = parseInt(golesVisStr, 10);
      if (!isNaN(parsedA)) awayScore = parsedA;
      else matchErrors.push(`Goles visitante inválidos`);
    }

    let status = 'scheduled';
    const est = estadoRaw.toLowerCase();
    if (est.includes('finalizado') || est.includes('finished')) status = 'finished';
    else if (est.includes('juego') || est.includes('live')) status = 'live';
    else if (est.includes('aplazado') || est.includes('postponed')) status = 'postponed';
    else if (est.includes('cancelado') || est.includes('cancelled')) status = 'cancelled';
    else status = 'scheduled';

    matchesList.push({
      itemNumber: index,
      competition,
      matchday,
      season,
      home_team_id: homeTeamObj?.id || null,
      away_team_id: awayTeamObj?.id || null,
      home_team: homeTeamObj?.name || local,
      away_team: awayTeamObj?.name || visitante,
      home_shield: homeTeamObj?.shield || '',
      away_shield: awayTeamObj?.shield || '',
      match_date: matchDateISO,
      fecha_str: fechaStr,
      hora_str: horaStr,
      stadium: estadio,
      status,
      home_score: homeScore,
      away_score: awayScore,
      errors: matchErrors
    });
  }

  const errors = [];
  if (!matchday || isNaN(matchday)) errors.push("Jornada no detectada.");
  if (matchesList.length === 0) errors.push("No se encontraron partidos válidos.");

  return { competition, matchday, season, matches: matchesList, errors };
}

async function renderMatchdayPreview(result) {
  const summaryEl = document.getElementById('matchday-preview-summary');
  const tbody = document.getElementById('matchday-preview-tbody');
  if (!summaryEl || !tbody) return;

  const total = result.matches.length;
  const errorCount = result.matches.filter(m => m.errors.length > 0).length;

  summaryEl.innerHTML = `
    <div>
      <span class="text-xs font-bold text-white">${total} partidos detectados</span>
      <span class="text-xs text-slate-400 ml-2">· Jornada ${result.matchday} (${result.season})</span>
    </div>
    <div>
      ${errorCount > 0 
        ? `<span class="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">${errorCount} partidos con errores</span>`
        : `<span class="px-2 py-1 rounded bg-neon/15 text-neon text-xs font-bold">Todos los partidos listos para guardar</span>`}
    </div>
  `;

  const existing = await getMatches();

  tbody.innerHTML = result.matches.map(m => {
    const isDuplicate = existing.some(ex => 
      Number(ex.matchday) === Number(result.matchday) &&
      ex.home_team.toLowerCase() === m.home_team.toLowerCase() &&
      ex.away_team.toLowerCase() === m.away_team.toLowerCase()
    );

    let statusBadge = '';
    if (m.status === 'finished') statusBadge = 'Finalizado';
    else if (m.status === 'live') statusBadge = 'En Vivo';
    else statusBadge = 'Programado';

    const hasErr = m.errors.length > 0;

    return `
      <tr class="hover:bg-[#141722] ${hasErr ? 'bg-red-500/5' : ''}">
        <td class="py-2.5 px-3 font-bold text-neon">J.${result.matchday}</td>
        <td class="py-2.5 px-3 text-slate-300">${m.fecha_str} ${m.hora_str}</td>
        <td class="py-2.5 px-3 font-bold text-white">${m.home_team}</td>
        <td class="py-2.5 px-3 font-bold text-white">${m.away_team}</td>
        <td class="py-2.5 px-3 text-slate-400">${m.stadium || '-'}</td>
        <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">${statusBadge}</span></td>
        <td class="py-2.5 px-3 font-bold text-center">${m.home_score !== null ? `${m.home_score}-${m.away_score}` : '—'}</td>
        <td class="py-2.5 px-3">
          ${hasErr ? `<span class="text-red-400 font-semibold" title="${m.errors.join(', ')}">⚠️ ${m.errors[0]}</span>` : 
            isDuplicate ? `<span class="text-amber-400 font-semibold">🔄 Ya existe</span>` : 
            `<span class="text-neon font-semibold">✓ Válido</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

async function loadMatchesAdmin() {
  const tbody = document.getElementById('admin-matches-table-body');
  const filterJornada = document.getElementById('admin-filter-matchday');
  if (!tbody) return;

  try {
    allAdminMatches = await getMatches();

    if (filterJornada && filterJornada.options.length <= 1) {
      filterJornada.innerHTML = '<option value="all">Todas las jornadas</option>';
      for (let i = 1; i <= 38; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = `Jornada ${i}`;
        filterJornada.appendChild(opt);
      }
    }

    filterAndRenderMatchesAdmin();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-400">Error al cargar partidos.</td></tr>`;
  }
}

function filterAndRenderMatchesAdmin() {
  const tbody = document.getElementById('admin-matches-table-body');
  if (!tbody) return;

  const seasonVal = document.getElementById('admin-filter-season')?.value || 'all';
  const jornadaVal = document.getElementById('admin-filter-matchday')?.value || 'all';
  const statusVal = document.getElementById('admin-filter-status')?.value || 'all';
  const sortVal = document.getElementById('admin-sort-matches')?.value || 'date-asc';
  const searchVal = (document.getElementById('admin-search-team')?.value || '').toLowerCase().trim();

  let filtered = [...allAdminMatches];

  if (seasonVal !== 'all') {
    filtered = filtered.filter(m => (m.season || '2026/2027') === seasonVal);
  }
  if (jornadaVal !== 'all') {
    filtered = filtered.filter(m => Number(m.matchday) === Number(jornadaVal));
  }
  if (statusVal !== 'all') {
    filtered = filtered.filter(m => m.status === statusVal);
  }
  if (searchVal) {
    filtered = filtered.filter(m => 
      m.home_team.toLowerCase().includes(searchVal) || 
      m.away_team.toLowerCase().includes(searchVal) ||
      (m.stadium && m.stadium.toLowerCase().includes(searchVal))
    );
  }

  // Sort
  filtered.sort((a, b) => {
    if (sortVal === 'date-desc') return new Date(b.match_date).getTime() - new Date(a.match_date).getTime();
    if (sortVal === 'date-asc') return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
    if (sortVal === 'matchday-desc') return Number(b.matchday) - Number(a.matchday);
    return Number(a.matchday) - Number(b.matchday);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500 font-medium">No se encontraron partidos con los filtros seleccionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    const dateFormatted = new Date(m.match_date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isFinished = m.status === 'finished';
    const isLive = m.status === 'live';

    return `
      <tr class="hover:bg-[#141722] transition-colors" data-match-row="${m.id}">
        <td class="py-3 px-3">
          <span class="font-bold text-neon block">J.${m.matchday}</span>
          <span class="text-[10px] text-slate-500">${m.season || '2026/2027'}</span>
        </td>
        <td class="py-3 px-3 text-xs">
          <div class="text-slate-300 font-medium">${dateFormatted}</div>
          <div class="text-[11px] text-slate-500 truncate max-w-[140px]">${m.stadium || 'Estadio sin definir'}</div>
        </td>
        <td class="py-3 px-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <div class="flex items-center gap-2 font-bold text-white text-xs">
              <span class="w-24 sm:w-28 text-right truncate" title="${m.home_team}">${m.home_team}</span>
              <div class="flex items-center gap-1 shrink-0">
                <input type="number" min="0" data-inline-home="${m.id}" value="${m.home_score !== null ? m.home_score : ''}" placeholder="-" class="fresh-input py-1 px-1 w-11 text-center text-xs font-bold" />
                <span class="text-slate-500 font-bold">-</span>
                <input type="number" min="0" data-inline-away="${m.id}" value="${m.away_score !== null ? m.away_score : ''}" placeholder="-" class="fresh-input py-1 px-1 w-11 text-center text-xs font-bold" />
              </div>
              <span class="w-24 sm:w-28 text-left truncate" title="${m.away_team}">${m.away_team}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-1 sm:mt-0 shrink-0">
              <select data-inline-status="${m.id}" class="fresh-input py-1 px-1 text-[11px]">
                <option value="scheduled" ${m.status === 'scheduled' ? 'selected' : ''}>Programado</option>
                <option value="live" ${m.status === 'live' ? 'selected' : ''}>En Vivo</option>
                <option value="finished" ${m.status === 'finished' ? 'selected' : ''}>Finalizado</option>
              </select>
              <button data-quick-save="${m.id}" class="btn-neon text-[11px] py-1 px-2.5 font-bold whitespace-nowrap">Guardar</button>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isFinished ? 'bg-slate-800 text-slate-300' : isLive ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'}">
            ${isFinished ? 'Finalizado' : isLive ? 'En Vivo' : 'Programado'}
          </span>
        </td>
        <td class="py-3 px-4 text-right space-x-2 whitespace-nowrap">
          <button data-edit-match="${m.id}" class="text-xs text-neon hover:underline font-semibold">Editar</button>
          <button data-delete-match="${m.id}" class="text-xs text-red-400 hover:underline font-semibold">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');

  // Quick save inline result handlers
  tbody.querySelectorAll('[data-quick-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-quick-save');
      const m = allAdminMatches.find(x => x.id === id);
      if (!m) return;

      const homeVal = document.querySelector(`[data-inline-home="${id}"]`)?.value.trim();
      const awayVal = document.querySelector(`[data-inline-away="${id}"]`)?.value.trim();
      const statusVal = document.querySelector(`[data-inline-status="${id}"]`)?.value || 'scheduled';

      const homeScore = homeVal !== '' && !isNaN(Number(homeVal)) ? parseInt(homeVal, 10) : null;
      const awayScore = awayVal !== '' && !isNaN(Number(awayVal)) ? parseInt(awayVal, 10) : null;

      if (statusVal === 'finished' && homeScore !== null && awayScore !== null) {
        if (!confirm(`¿Confirmar resultado ${homeScore}-${awayScore}? Este resultado se utilizará para calcular la clasificación.`)) {
          return;
        }
      }

      try {
        btn.disabled = true;
        btn.innerText = '...';
        await saveMatch({
          id: m.id,
          competition: m.competition || 'LaLiga',
          season: m.season || '2026/2027',
          matchday: m.matchday,
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          home_team: m.home_team,
          away_team: m.away_team,
          home_shield: m.home_shield || '',
          away_shield: m.away_shield || '',
          match_date: m.match_date,
          stadium: m.stadium || '',
          home_score: homeScore,
          away_score: awayScore,
          status: statusVal
        });

        showToast('Resultado guardado correctamente.', 'success');

        if (statusVal === 'finished') {
          if (confirm('¿Deseas recalcular la clasificación oficial ahora para actualizar las estadísticas de la temporada?')) {
            await recalculateStandingsFromMatches(m.season || '2026/2027');
            showToast('Clasificación recalculada con éxito.', 'success');
          }
        }

        await loadMatchesAdmin();
        await setupDashboardCounters();
      } catch (err) {
        showToast(err.message || 'Error al guardar resultado', 'error');
        btn.disabled = false;
        btn.innerText = 'Guardar';
      }
    });
  });

  // Edit match modal handler
  tbody.querySelectorAll('[data-edit-match]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-match');
      const m = allAdminMatches.find(x => x.id === id);
      if (!m) return;
      document.getElementById('edit-match-id').value = m.id;
      document.getElementById('match-form-season').value = m.season || '2026/2027';
      document.getElementById('match-form-jornada').value = m.matchday;
      document.getElementById('match-form-status').value = m.status;
      document.getElementById('match-form-stadium').value = m.stadium || '';
      const homeId = m.home_team_id || (allTeams.find(t => t.name.toLowerCase() === (m.home_team || '').toLowerCase())?.id || '');
      document.getElementById('match-form-home-team').value = homeId;
      document.getElementById('match-form-home-shield').value = m.home_shield || '';
      document.getElementById('match-form-home-score').value = m.home_score !== null ? m.home_score : '';
      const awayId = m.away_team_id || (allTeams.find(t => t.name.toLowerCase() === (m.away_team || '').toLowerCase())?.id || '');
      document.getElementById('match-form-away-team').value = awayId;
      document.getElementById('match-form-away-shield').value = m.away_shield || '';
      document.getElementById('match-form-away-score').value = m.away_score !== null ? m.away_score : '';
      
      const d = new Date(m.match_date);
      const iso = !isNaN(d.getTime()) ? d.toISOString().substring(0, 16) : '';
      document.getElementById('match-form-date').value = iso;

      document.getElementById('match-form-title').innerText = 'Editar Partido';
      document.getElementById('match-form-box').classList.remove('hidden');
      document.getElementById('match-form-box').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Delete match handler
  tbody.querySelectorAll('[data-delete-match]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-match');
      const m = allAdminMatches.find(x => x.id === id);
      if (!m) return;

      if (!confirm(`¿Eliminar definitivamente el partido ${m.home_team} vs ${m.away_team}?`)) return;
      try {
        await deleteMatch(id);
        showToast('Partido eliminado.', 'info');

        if (m.status === 'finished') {
          if (confirm('El partido eliminado estaba finalizado. ¿Deseas recalcular la clasificación para actualizar las estadísticas de los equipos?')) {
            await recalculateStandingsFromMatches(m.season || '2026/2027');
            showToast('Clasificación actualizada tras eliminar el partido.', 'success');
          }
        }

        await loadMatchesAdmin();
        await setupDashboardCounters();
      } catch (err) {
        showToast(err.message || 'Error al eliminar partido', 'error');
      }
    });
  });
}

/* ==========================================================================
   4. CLASIFICACIÓN ADMIN (GESTIÓN COMPLETA, RECÁLCULO SEGURO & COMPROBACIÓN)
   ========================================================================== */
function setupStandingsAdmin() {
  const showAddBtn = document.getElementById('btn-show-add-team');
  const formBox = document.getElementById('standings-team-form-box');
  const cancelBtn = document.getElementById('standing-team-cancel');
  const form = document.getElementById('admin-standing-team-form');

  const gfInput = document.getElementById('standing-team-gf');
  const gcInput = document.getElementById('standing-team-gc');
  const dgInput = document.getElementById('standing-team-dg');
  const pgInput = document.getElementById('standing-team-pg');
  const peInput = document.getElementById('standing-team-pe');
  const ptsInput = document.getElementById('standing-team-points');

  // Automatically compute DG = GF - GC
  const updateDg = () => {
    const gf = parseInt(gfInput.value, 10) || 0;
    const gc = parseInt(gcInput.value, 10) || 0;
    dgInput.value = gf - gc;
  };
  gfInput?.addEventListener('input', updateDg);
  gcInput?.addEventListener('input', updateDg);

  // Auto suggest points = PG*3 + PE when adding new team
  const updateSuggestedPoints = () => {
    if (!document.getElementById('standing-team-id').value) {
      const pg = parseInt(pgInput.value, 10) || 0;
      const pe = parseInt(peInput.value, 10) || 0;
      ptsInput.value = pg * 3 + pe;
    }
  };
  pgInput?.addEventListener('input', updateSuggestedPoints);
  peInput?.addEventListener('input', updateSuggestedPoints);

  showAddBtn?.addEventListener('click', () => {
    form.reset();
    document.getElementById('standing-team-id').value = '';
    document.getElementById('standings-team-form-title').innerText = 'Añadir Equipo a la Clasificación';
    dgInput.value = '0';
    ptsInput.value = '0';
    formBox.classList.remove('hidden');
    formBox.scrollIntoView({ behavior: 'smooth' });
  });

  cancelBtn?.addEventListener('click', () => {
    formBox.classList.add('hidden');
  });

  // Team Form Submit
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('standing-team-id').value;
    const position = parseInt(document.getElementById('standing-team-position').value, 10);
    const team_id = document.getElementById('standing-team-name').value;
    const shield = document.getElementById('standing-team-shield').value.trim();

    const pj = Math.max(0, parseInt(document.getElementById('standing-team-pj').value, 10) || 0);
    const pg = Math.max(0, parseInt(document.getElementById('standing-team-pg').value, 10) || 0);
    const pe = Math.max(0, parseInt(document.getElementById('standing-team-pe').value, 10) || 0);
    const pp = Math.max(0, parseInt(document.getElementById('standing-team-pp').value, 10) || 0);
    const gf = Math.max(0, parseInt(document.getElementById('standing-team-gf').value, 10) || 0);
    const gc = Math.max(0, parseInt(document.getElementById('standing-team-gc').value, 10) || 0);
    const dg = parseInt(document.getElementById('standing-team-dg').value, 10) || (gf - gc);
    const points = Math.max(0, parseInt(document.getElementById('standing-team-points').value, 10) || 0);

    try {
      await saveStandingTeam({
        ...(id ? { id } : {}),
        position,
        team_id,
        shield,
        pj,
        pg,
        pe,
        pp,
        gf,
        gc,
        dg,
        points
      });

      showToast(`Equipo guardado correctamente en la clasificación de Supabase.`, 'success');
      formBox.classList.add('hidden');
      await loadStandingsAdmin();
    } catch (err) {
      showToast(err.message || 'Error al guardar equipo en la clasificación', 'error');
    }
  });

  // Recalculate Standings Button
  const recalcBtn = document.getElementById('btn-recalculate-standings');
  recalcBtn?.addEventListener('click', async () => {
    const season = document.getElementById('standings-season-select')?.value || '2026/2027';
    const msg = `Se recalculará la clasificación utilizando todos los partidos finalizados de la temporada seleccionada (${season}). Los valores actuales de la clasificación serán reemplazados.\n\n¿Deseas continuar?`;
    if (!confirm(msg)) return;

    try {
      recalcBtn.disabled = true;
      recalcBtn.innerText = 'Recalculando...';
      const res = await recalculateStandingsFromMatches(season);
      showToast(`Clasificación recalculada: ${res.finishedMatchesCount} partidos finalizados procesados para ${res.teamsCount} equipos.`, 'success');
      await loadStandingsAdmin();
    } catch (err) {
      showToast(err.message || 'Error al recalcular la clasificación', 'error');
    } finally {
      recalcBtn.disabled = false;
      recalcBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        <span>Recalcular clasificación</span>
      `;
    }
  });

  // Check Consistency Button
  const checkBtn = document.getElementById('btn-check-consistency');
  const consistencyBox = document.getElementById('standings-consistency-box');
  const consistencyContent = document.getElementById('standings-consistency-content');
  const closeConsistencyBtn = document.getElementById('btn-close-consistency-box');

  closeConsistencyBtn?.addEventListener('click', () => {
    consistencyBox?.classList.add('hidden');
  });

  checkBtn?.addEventListener('click', async () => {
    const season = document.getElementById('standings-season-select')?.value || '2026/2027';
    try {
      const res = await checkStandingsConsistency(season);
      if (!consistencyBox || !consistencyContent) return;

      consistencyBox.classList.remove('hidden');

      if (res.valid && res.issues.length === 0 && res.warnings.length === 0) {
        consistencyContent.innerHTML = `
          <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-2">
            <span>✓</span>
            <span>La clasificación es 100% coherente con los partidos finalizados (${res.summary.finishedMatches} partidos registrados en ${season}).</span>
          </div>
        `;
      } else {
        let html = '';
        if (res.issues.length > 0) {
          html += `
            <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-1">
              <h5 class="font-bold text-red-400 text-xs uppercase tracking-wider">Inconsistencias Críticas:</h5>
              <ul class="list-disc list-inside text-red-300 space-y-1">
                ${res.issues.map(i => `<li>${i}</li>`).join('')}
              </ul>
            </div>
          `;
        }
        if (res.warnings.length > 0) {
          html += `
            <div class="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 space-y-1 mt-2">
              <h5 class="font-bold text-yellow-400 text-xs uppercase tracking-wider">Advertencias / Avisos:</h5>
              <ul class="list-disc list-inside text-yellow-300 space-y-1">
                ${res.warnings.map(w => `<li>${w}</li>`).join('')}
              </ul>
            </div>
          `;
        }
        html += `
          <div class="pt-2 text-right">
            <button id="btn-fix-recalc-inline" class="btn-neon text-xs py-1.5 px-3 font-bold">Recalcular desde partidos finalizados ahora</button>
          </div>
        `;
        consistencyContent.innerHTML = html;

        document.getElementById('btn-fix-recalc-inline')?.addEventListener('click', () => {
          consistencyBox.classList.add('hidden');
          recalcBtn.click();
        });
      }
    } catch (e) {
      showToast(e.message || 'Error al comprobar clasificación', 'error');
    }
  });

  // Structured Text Importer for Standings
  const toggleImportStandingsBtn = document.getElementById('btn-toggle-import-standings');
  const importBox = document.getElementById('standings-import-box');
  const clearImportBtn = document.getElementById('btn-clear-standings-import');
  const analyzeImportBtn = document.getElementById('btn-analyze-standings-import');
  const textarea = document.getElementById('standings-import-textarea');
  const previewBox = document.getElementById('standings-import-preview-box');
  const previewSummary = document.getElementById('standings-import-preview-summary');
  const previewTbody = document.getElementById('standings-import-preview-tbody');
  const cancelPreviewBtn = document.getElementById('btn-cancel-standings-import-preview');
  const confirmSaveBtn = document.getElementById('btn-confirm-save-imported-standings');

  let parsedStandingsRows = [];

  toggleImportStandingsBtn?.addEventListener('click', () => {
    importBox?.classList.toggle('hidden');
  });

  clearImportBtn?.addEventListener('click', () => {
    if (textarea) textarea.value = '';
    previewBox?.classList.add('hidden');
    parsedStandingsRows = [];
  });

  cancelPreviewBtn?.addEventListener('click', () => {
    previewBox?.classList.add('hidden');
  });

  analyzeImportBtn?.addEventListener('click', () => {
    const text = textarea?.value?.trim();
    if (!text) {
      showToast('Pega el texto estructurado de la clasificación para analizarlo.', 'error');
      return;
    }

    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = [];

    for (const line of lines) {
      if (/^\s*(posici[oó]n|equipo):\s*/i.test(line) && currentBlock.length > 0 && currentBlock.some(l => /equipo:/i.test(l))) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) blocks.push(currentBlock.join('\n'));

    parsedStandingsRows = [];
    let autoPos = 1;

    for (const block of blocks) {
      const getField = (field) => {
        const m = block.match(new RegExp(`${field}:\\s*(.+)`, 'i'));
        return m ? m[1].trim() : '';
      };

      const team = getField('equipo');
      if (!team) continue;

      const posRaw = getField('posici[oó]n');
      const pos = posRaw ? parseInt(posRaw, 10) : autoPos++;
      const pj = Math.max(0, parseInt(getField('pj') || 0, 10));
      const pg = Math.max(0, parseInt(getField('pg') || 0, 10));
      const pe = Math.max(0, parseInt(getField('pe') || 0, 10));
      const pp = Math.max(0, parseInt(getField('pp') || 0, 10));
      const gf = Math.max(0, parseInt(getField('gf') || 0, 10));
      const gc = Math.max(0, parseInt(getField('gc') || 0, 10));
      const dgRaw = getField('dg');
      const dg = dgRaw !== '' ? parseInt(dgRaw, 10) : (gf - gc);
      const ptsRaw = getField('puntos');
      const points = ptsRaw !== '' ? parseInt(ptsRaw, 10) : (pg * 3 + pe);
      const shield = getField('escudo');

      parsedStandingsRows.push({
        position: pos,
        team: normalizeTeamName(team),
        shield,
        pj,
        pg,
        pe,
        pp,
        gf,
        gc,
        dg,
        points
      });
    }

    if (parsedStandingsRows.length === 0) {
      showToast('No se pudieron detectar equipos en el formato indicado.', 'error');
      return;
    }

    if (previewSummary) previewSummary.innerText = `${parsedStandingsRows.length} equipos detectados y listos para guardar.`;
    if (previewTbody) {
      previewTbody.innerHTML = parsedStandingsRows.map(r => `
        <tr class="hover:bg-[#141722]">
          <td class="py-2.5 px-2 text-center font-bold text-neon">${r.position}</td>
          <td class="py-2.5 px-3 font-bold text-white">${r.team}</td>
          <td class="py-2.5 px-2 text-center text-slate-300">${r.pj}</td>
          <td class="py-2.5 px-2 text-center text-slate-400">${r.pg}</td>
          <td class="py-2.5 px-2 text-center text-slate-400">${r.pe}</td>
          <td class="py-2.5 px-2 text-center text-slate-400">${r.pp}</td>
          <td class="py-2.5 px-2 text-center text-slate-400">${r.gf}</td>
          <td class="py-2.5 px-2 text-center text-slate-400">${r.gc}</td>
          <td class="py-2.5 px-2 text-center font-bold text-slate-300">${r.dg}</td>
          <td class="py-2.5 px-3 text-right font-black text-neon">${r.points}</td>
        </tr>
      `).join('');
    }
    previewBox?.classList.remove('hidden');
    showToast('Clasificación analizada correctamente.', 'success');
  });

  confirmSaveBtn?.addEventListener('click', async () => {
    if (parsedStandingsRows.length === 0) return;
    try {
      confirmSaveBtn.disabled = true;
      confirmSaveBtn.innerText = 'Guardando en Supabase...';
      await importStandingsBatch(parsedStandingsRows);
      showToast(`¡${parsedStandingsRows.length} equipos guardados en Supabase!`, 'success');
      importBox.classList.add('hidden');
      previewBox.classList.add('hidden');
      if (textarea) textarea.value = '';
      parsedStandingsRows = [];
      await loadStandingsAdmin();
    } catch (err) {
      showToast(err.message || 'Error al guardar clasificación importada', 'error');
    } finally {
      confirmSaveBtn.disabled = false;
      confirmSaveBtn.innerText = 'Guardar clasificación en Supabase';
    }
  });
}

async function loadStandingsAdmin() {
  const tbody = document.getElementById('admin-standings-body');
  if (!tbody) return;

  try {
    const list = await getStandings();
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="py-12 text-center text-slate-500 font-medium">No hay clasificación disponible. Puedes añadir equipos manualmente, importarlos o pulsar "Recalcular clasificación".</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(r => `
      <tr data-team="${r.team}" class="hover:bg-[#141722] transition-colors">
        <td class="py-2.5 px-2 text-center font-bold text-neon tabular-nums">${r.position}</td>
        <td class="py-2.5 px-3 font-bold text-white flex items-center gap-2.5">
          ${r.shield ? `
            <img src="${r.shield}" alt="${r.team}" class="w-5 h-5 object-contain shrink-0" />
          ` : `
            <div class="w-5 h-5 rounded-full bg-[#1b202d] border border-[#262c3e] flex items-center justify-center text-[10px] font-bold text-neon shrink-0">⚽</div>
          `}
          <span class="truncate">${r.team}</span>
        </td>
        <td class="py-2.5 px-2 text-center text-slate-300 tabular-nums">${r.pj}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 tabular-nums">${r.pg}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 tabular-nums">${r.pe}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 tabular-nums">${r.pp}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 tabular-nums">${r.gf}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 tabular-nums">${r.gc}</td>
        <td class="py-2.5 px-2 text-center font-bold text-slate-300 tabular-nums">${r.dg}</td>
        <td class="py-2.5 px-3 text-center font-black text-neon text-sm tabular-nums">${r.points}</td>
        <td class="py-2.5 px-4 text-right space-x-2 whitespace-nowrap">
          <button data-edit-standing="${r.team}" class="text-xs text-neon hover:underline font-semibold">Editar</button>
          <button data-delete-standing="${r.team}" class="text-xs text-red-400 hover:underline font-semibold">Eliminar</button>
        </td>
      </tr>
    `).join('');

    // Edit standing click handler
    tbody.querySelectorAll('[data-edit-standing]').forEach(btn => {
      btn.addEventListener('click', () => {
        const teamName = btn.getAttribute('data-edit-standing');
        const r = list.find(x => x.team === teamName);
        if (!r) return;

        document.getElementById('standing-team-id').value = r.id || '';
        document.getElementById('standing-team-position').value = r.position;
        const teamId = r.team_id || (allTeams.find(t => t.name.toLowerCase() === (r.team || '').toLowerCase())?.id || '');
        document.getElementById('standing-team-name').value = teamId;
        document.getElementById('standing-team-shield').value = r.shield || '';
        document.getElementById('standing-team-pj').value = r.pj;
        document.getElementById('standing-team-pg').value = r.pg;
        document.getElementById('standing-team-pe').value = r.pe;
        document.getElementById('standing-team-pp').value = r.pp;
        document.getElementById('standing-team-gf').value = r.gf;
        document.getElementById('standing-team-gc').value = r.gc;
        document.getElementById('standing-team-dg').value = r.dg;
        document.getElementById('standing-team-points').value = r.points;

        document.getElementById('standings-team-form-title').innerText = `Editar Equipo: ${r.team}`;
        const box = document.getElementById('standings-team-form-box');
        box?.classList.remove('hidden');
        box?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Delete standing click handler
    tbody.querySelectorAll('[data-delete-standing]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const teamName = btn.getAttribute('data-delete-standing');
        const r = list.find(x => x.team === teamName);
        if (!confirm(`¿Eliminar al equipo "${teamName}" de la clasificación en Supabase?`)) return;

        try {
          await deleteStandingTeam(r?.id || teamName);
          showToast(`Equipo "${teamName}" eliminado de la clasificación.`, 'info');
          await loadStandingsAdmin();
        } catch (err) {
          showToast(err.message || 'Error al eliminar equipo', 'error');
        }
      });
    });

  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="11" class="py-8 text-center text-red-400">Error al cargar clasificación.</td></tr>`;
  }
}

/* ==========================================================================
   5. ENCUESTAS ADMIN
   ========================================================================== */
function setupPollsAdmin() {
  const showBtn = document.getElementById('btn-show-create-poll');
  const formBox = document.getElementById('poll-form-box');
  const cancelBtn = document.getElementById('poll-form-cancel');
  const form = document.getElementById('admin-poll-form');

  showBtn?.addEventListener('click', () => {
    form.reset();
    formBox.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formBox.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = document.getElementById('poll-form-question').value.trim();
    const optInputs = form.querySelectorAll('.poll-opt-input');
    const options = Array.from(optInputs).map(i => i.value.trim()).filter(Boolean);

    if (options.length < 2) {
      showToast('Introduce al menos 2 opciones.', 'error');
      return;
    }

    try {
      await createPoll({ question, options });
      showToast('Encuesta creada.', 'success');
      formBox.classList.add('hidden');
      await loadPollsAdmin();
    } catch (err) {
      showToast(err.message || 'Error al crear encuesta', 'error');
    }
  });
}

async function loadPollsAdmin() {
  const container = document.getElementById('admin-polls-list');
  if (!container) return;

  try {
    const list = await getPolls();
    if (list.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay encuestas.</div>`;
      return;
    }

    container.innerHTML = list.map(p => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4">
        <div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'closed' ? 'bg-slate-800 text-slate-400' : 'bg-neon/15 text-neon'}">${p.status}</span>
          <h4 class="text-sm font-bold text-white mt-1">${p.question}</h4>
          <p class="text-xs text-slate-400">Opciones: ${p.poll_options.map(o => `${o.option_text} (${o.votes_count || 0})`).join(' · ')}</p>
        </div>

        <div class="flex items-center gap-2">
          ${p.status === 'active' ? `
            <button data-close-poll="${p.id}" class="btn-secondary text-xs py-1.5 px-3">Cerrar</button>
          ` : ''}
          <button data-delete-poll="${p.id}" class="text-xs text-red-400 hover:underline p-1 font-semibold">Eliminar</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-close-poll]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-close-poll');
        await closePoll(id);
        showToast('Encuesta cerrada.', 'info');
        await loadPollsAdmin();
      });
    });

    container.querySelectorAll('[data-delete-poll]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta encuesta?')) return;
        const id = btn.getAttribute('data-delete-poll');
        await deletePoll(id);
        showToast('Encuesta eliminada.', 'info');
        await loadPollsAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

/* ==========================================================================
   6. DEBATES & COMMENTS ADMIN
   ========================================================================== */
function setupDebatesAdmin() {}

async function loadDebatesAdmin() {
  const container = document.getElementById('admin-debates-list');
  if (!container) return;

  try {
    const list = await getDebates();
    if (list.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay debates.</div>`;
      return;
    }

    container.innerHTML = list.map(d => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4">
        <div>
          <span class="text-xs text-slate-400">Autor: <strong class="text-white">${d.author_name}</strong> · ${new Date(d.created_at).toLocaleDateString('es-ES')}</span>
          <h4 class="text-sm font-bold text-white mt-1">${d.title}</h4>
          <p class="text-xs text-slate-400 line-clamp-1">${d.content}</p>
        </div>

        <button data-admin-del-debate="${d.id}" class="text-xs text-red-400 hover:underline p-1 font-semibold">
          Eliminar
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-admin-del-debate]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este debate?')) return;
        const id = btn.getAttribute('data-admin-del-debate');
        await deleteDebate(id);
        showToast('Debate eliminado.', 'info');
        await loadDebatesAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

function setupCommentsAdmin() {}

async function loadCommentsAdmin() {
  const container = document.getElementById('admin-comments-list');
  if (!container) return;

  // Since comments are linked to news, fetch news and collect all comments
  try {
    const news = await getNews({ limit: 50 });
    let allComments = [];
    for (const n of news) {
      const comments = await getComments(n.id);
      comments.forEach(c => allComments.push({ ...c, newsTitle: n.title }));
    }

    if (allComments.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay comentarios en noticias.</div>`;
      return;
    }

    container.innerHTML = allComments.map(c => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4">
        <div>
          <span class="text-[11px] text-neon font-bold">En noticia: ${c.newsTitle}</span>
          <p class="text-xs text-slate-300 mt-1">"${c.content}"</p>
          <span class="text-[10px] text-slate-500">Por ${c.author_name} · ${new Date(c.created_at).toLocaleDateString('es-ES')}</span>
        </div>

        <button data-admin-del-comment="${c.id}" class="text-xs text-red-400 hover:underline font-semibold">
          Eliminar
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-admin-del-comment]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este comentario?')) return;
        const id = btn.getAttribute('data-admin-del-comment');
        await deleteComment(id);
        showToast('Comentario eliminado.', 'info');
        await loadCommentsAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

/* ==========================================================================
   7. PORRAS ADMIN
   ========================================================================== */
function setupPorrasAdmin() {}

async function loadPorrasAdmin() {
  const container = document.getElementById('admin-porras-list');
  if (!container) return;

  try {
    const predictions = await getPredictions();
    if (predictions.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay predicciones registradas todavía.</div>`;
      return;
    }

    container.innerHTML = predictions.map(p => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4 text-xs">
        <div>
          <span class="font-bold text-white">${p.user_nickname}</span>
          <span class="text-slate-500">· Partido: ${p.matches ? `${p.matches.home_team} vs ${p.matches.away_team}` : p.match_id}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-bold text-neon tabular-nums">${p.predicted_home_score} - ${p.predicted_away_score}</span>
          <span class="text-slate-400">(+${p.points_awarded || 0} pts)</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

/* ==========================================================================
   8. TRIVIAL ADMIN
   ========================================================================== */
function setupTriviaAdmin() {
  const showBtn = document.getElementById('btn-show-create-trivia');
  const formBox = document.getElementById('trivia-form-box');
  const cancelBtn = document.getElementById('trivia-form-cancel');
  const form = document.getElementById('admin-trivia-form');

  showBtn?.addEventListener('click', () => {
    form.reset();
    formBox.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formBox.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = document.getElementById('trivia-q-input').value.trim();
    const optionA = document.getElementById('trivia-opt-a').value.trim();
    const optionB = document.getElementById('trivia-opt-b').value.trim();
    const optionC = document.getElementById('trivia-opt-c').value.trim();
    const optionD = document.getElementById('trivia-opt-d').value.trim();
    const correctOption = document.getElementById('trivia-correct-select').value;
    const points = parseInt(document.getElementById('trivia-points').value, 10);
    const explanation = document.getElementById('trivia-explanation').value.trim();

    try {
      await saveTriviaQuestion({
        question,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_option: correctOption,
        points,
        explanation
      });
      showToast('Pregunta de trivial creada.', 'success');
      formBox.classList.add('hidden');
      await loadTriviaAdmin();
    } catch (err) {
      showToast(err.message || 'Error al guardar pregunta', 'error');
    }
  });
}

async function loadTriviaAdmin() {
  const container = document.getElementById('admin-trivia-list');
  if (!container) return;

  try {
    const list = await getTriviaQuestions();
    if (list.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay preguntas de trivial creadas.</div>`;
      return;
    }

    container.innerHTML = list.map(q => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4">
        <div>
          <span class="text-neon font-bold text-[10px] uppercase">Opción Correcta: ${q.correct_option.toUpperCase()} (+${q.points || 10} pts)</span>
          <h4 class="text-sm font-bold text-white mt-0.5">${q.question}</h4>
          <p class="text-xs text-slate-400">A: ${q.option_a} | B: ${q.option_b} ${q.option_c ? `| C: ${q.option_c}` : ''} ${q.option_d ? `| D: ${q.option_d}` : ''}</p>
        </div>

        <button data-del-trivia="${q.id}" class="text-xs text-red-400 hover:underline p-1 font-semibold">
          Eliminar
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-del-trivia]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta pregunta?')) return;
        const id = btn.getAttribute('data-del-trivia');
        await deleteTriviaQuestion(id);
        showToast('Pregunta eliminada.', 'info');
        await loadTriviaAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

/* ==========================================================================
   9. MEMES ADMIN
   ========================================================================== */
function setupMemesAdmin() {}

async function loadMemesAdmin() {
  const container = document.getElementById('admin-memes-list');
  if (!container) return;

  try {
    const list = await getMemes();
    if (list.length === 0) {
      container.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-500">No hay memes subidos.</div>`;
      return;
    }

    container.innerHTML = list.map(m => `
      <div class="fresh-card p-3 space-y-2">
        <div class="aspect-square rounded-lg bg-black overflow-hidden flex items-center justify-center">
          <img src="${m.image_url}" class="w-full h-full object-contain" />
        </div>
        <h5 class="text-xs font-bold text-white truncate">${m.title}</h5>
        <div class="flex items-center justify-between pt-1">
          <span class="text-[10px] text-slate-400">${m.author_name}</span>
          <button data-admin-del-meme="${m.id}" class="text-xs text-red-400 hover:underline font-semibold">Eliminar</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-admin-del-meme]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este meme?')) return;
        const id = btn.getAttribute('data-admin-del-meme');
        await deleteMeme(id);
        showToast('Meme eliminado.', 'info');
        await loadMemesAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

/* ==========================================================================
   10. SUPABASE CONFIG & SCHEMA TAB
   ========================================================================== */
function setupSupabaseConfigTab() {
  const statusBadge = document.getElementById('supabase-status-badge');
  const urlInput = document.getElementById('config-supabase-url');
  const keyInput = document.getElementById('config-supabase-key');
  const form = document.getElementById('supabase-config-form');
  const clearBtn = document.getElementById('clear-supabase-config-btn');
  const copyBtn = document.getElementById('copy-sql-btn');

  if (statusBadge) {
    if (isConfigured) {
      statusBadge.className = 'px-2.5 py-1 rounded text-xs font-bold bg-neon text-black shadow-neon-sm';
      statusBadge.innerText = 'Conectado a Supabase';
    } else {
      statusBadge.className = 'px-2.5 py-1 rounded text-xs font-bold bg-amber-400 text-black';
      statusBadge.innerText = 'Modo Local / Sin Conectar';
    }
  }

  if (urlInput) urlInput.value = localStorage.getItem('fresh_supabase_url') || (SUPABASE_URL.includes('your-project') ? '' : SUPABASE_URL);
  if (keyInput) keyInput.value = localStorage.getItem('fresh_supabase_key') || (SUPABASE_KEY.includes('your-anon') ? '' : SUPABASE_KEY);

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    const key = keyInput.value.trim();

    if (url && key) {
      localStorage.setItem('fresh_supabase_url', url);
      localStorage.setItem('fresh_supabase_key', key);
      showToast('Credenciales guardadas. Recargando...', 'success');
      setTimeout(() => window.location.reload(), 800);
    } else {
      showToast('Por favor introduce URL y clave pública de Supabase.', 'error');
    }
  });

  clearBtn?.addEventListener('click', () => {
    localStorage.removeItem('fresh_supabase_url');
    localStorage.removeItem('fresh_supabase_key');
    showToast('Configuración limpiada.', 'info');
    setTimeout(() => window.location.reload(), 500);
  });

  copyBtn?.addEventListener('click', () => {
    const sqlText = document.getElementById('sql-preview-box')?.innerText;
    if (sqlText) {
      navigator.clipboard.writeText(sqlText);
      showToast('¡SQL copiado al portapapeles!', 'success');
    }
  });
}

async function loadSupabaseSchemaPreview() {
  const box = document.getElementById('sql-preview-box');
  if (!box) return;

  try {
    const res = await fetch('/supabase/schema.sql');
    if (res.ok) {
      box.innerText = await res.text();
    } else {
      box.innerText = '-- Ver archivo /supabase/schema.sql';
    }
  } catch (e) {
    box.innerText = '-- El archivo /supabase/schema.sql está disponible en la raíz del proyecto.';
  }
}
