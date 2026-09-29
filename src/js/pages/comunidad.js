/**
 * Fresh Football - Debates & Comunidad Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { 
  getDebates, 
  createDebate, 
  getDebateComments, 
  addDebateComment, 
  deleteDebate, 
  deleteDebateComment,
  getCurrentUser 
} from '../supabase.js';

let currentUser = null;
let allDebates = [];
let expandedDebateId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('comunidad');
  currentUser = await getCurrentUser();
  setupNewDebateForm();
  await loadDebates();
});

function setupNewDebateForm() {
  const openBtn = document.getElementById('open-new-debate-btn');
  const box = document.getElementById('new-debate-box');
  const cancelBtn = document.getElementById('cancel-debate-btn');
  const form = document.getElementById('new-debate-form');

  if (openBtn && box) {
    openBtn.addEventListener('click', () => {
      if (!currentUser) {
        showToast('Debes iniciar sesión para abrir un debate.', 'error');
        setTimeout(() => window.location.href = '/login.html', 700);
        return;
      }
      box.classList.toggle('hidden');
    });
  }

  if (cancelBtn && box) {
    cancelBtn.addEventListener('click', () => {
      box.classList.add('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('debate-title-input').value.trim();
      const content = document.getElementById('debate-content-input').value.trim();
      if (!title || !content) return;

      const submitBtn = document.getElementById('submit-debate-btn');
      submitBtn.disabled = true;
      submitBtn.innerText = 'Publicando...';

      try {
        await createDebate({ title, content });
        showToast('¡Debate publicado con éxito!', 'success');
        form.reset();
        box.classList.add('hidden');
        await loadDebates();
      } catch (err) {
        showToast(err.message || 'Error al crear el debate', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Publicar Debate';
      }
    });
  }
}

async function loadDebates() {
  const container = document.getElementById('debates-feed');
  try {
    allDebates = await getDebates();
    renderDebates();
  } catch (err) {
    console.error(err);
    if (container) {
      container.innerHTML = `<div class="py-12 text-center text-xs text-red-400">Error al cargar debates.</div>`;
    }
  }
}

function renderDebates() {
  const container = document.getElementById('debates-feed');
  if (!container) return;

  if (allDebates.length === 0) {
    container.innerHTML = `
      <div class="empty-state py-16">
        <div class="empty-state-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/></svg>
        </div>
        <h3 class="text-white font-bold text-base mb-1">No hay debates todavía</h3>
        <p class="text-xs text-slate-400 max-w-sm mb-4">Inicia la primera conversación y debate sobre fichajes, tácticas o polémicas arbitrales de LaLiga.</p>
        <button id="empty-state-open-debate" class="btn-neon text-xs">Abrir el Primer Debate &rarr;</button>
      </div>
    `;
    const btn = document.getElementById('empty-state-open-debate');
    if (btn) {
      btn.addEventListener('click', () => {
        document.getElementById('open-new-debate-btn')?.click();
      });
    }
    return;
  }

  const isAdmin = currentUser && (currentUser.profile?.role === 'admin' || currentUser.email?.includes('admin'));

  container.innerHTML = allDebates.map(d => {
    const isAuthor = currentUser && currentUser.id === d.author_id;
    const canDelete = isAuthor || isAdmin;
    const isExpanded = expandedDebateId === d.id;

    return `
      <div class="fresh-card p-5 space-y-4" data-debate-card="${d.id}">
        <!-- Author info & unboxed date -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-[#181d2a] border border-[#232838] flex items-center justify-center font-bold text-neon text-xs overflow-hidden">
              ${d.author_avatar ? `<img src="${d.author_avatar}" class="w-full h-full object-cover" />` : (d.author_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <span class="text-xs font-bold text-white block">${d.author_name}</span>
              <span class="text-[10px] text-slate-400">${new Date(d.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          ${canDelete ? `
            <button data-delete-debate="${d.id}" class="text-slate-500 hover:text-red-400 p-1 text-xs" title="Eliminar debate">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          ` : ''}
        </div>

        <div class="space-y-1.5">
          <h3 class="text-base font-bold text-white leading-snug">${d.title}</h3>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">${d.content}</p>
        </div>

        <!-- Thread Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-[#1e2333]">
          <button data-toggle-thread="${d.id}" class="inline-flex items-center gap-1.5 text-xs font-bold text-neon hover:underline">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span>${isExpanded ? 'Ocultar respuestas' : 'Ver respuestas'}</span>
            <span class="text-slate-400 font-normal">(${d.comments_count || 0})</span>
          </button>
        </div>

        <!-- Responses Box (if expanded) -->
        <div id="thread-${d.id}" class="${isExpanded ? 'block' : 'hidden'} pt-3 space-y-3">
          <div class="space-y-2.5" id="responses-list-${d.id}">
            <div class="py-2 text-center text-xs text-slate-500">Cargando respuestas...</div>
          </div>

          <!-- Add Response Form -->
          <div class="pt-2">
            ${currentUser ? `
              <form class="flex gap-2" data-reply-form="${d.id}">
                <input type="text" required placeholder="Escribe tu respuesta..." class="fresh-input text-xs py-2 flex-1" />
                <button type="submit" class="btn-neon text-xs py-2 px-3 shrink-0">Responder</button>
              </form>
            ` : `
              <p class="text-xs text-slate-400 text-center"><a href="/login.html" class="text-neon underline">Inicia sesión</a> para responder a este debate.</p>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Event handlers
  container.querySelectorAll('[data-delete-debate]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Seguro que deseas eliminar este debate?')) return;
      const id = btn.getAttribute('data-delete-debate');
      try {
        await deleteDebate(id);
        showToast('Debate eliminado.', 'info');
        await loadDebates();
      } catch (err) {
        showToast(err.message || 'Error al eliminar', 'error');
      }
    });
  });

  container.querySelectorAll('[data-toggle-thread]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const debateId = btn.getAttribute('data-toggle-thread');
      const threadEl = document.getElementById(`thread-${debateId}`);
      if (threadEl.classList.contains('hidden')) {
        threadEl.classList.remove('hidden');
        btn.querySelector('span').innerText = 'Ocultar respuestas';
        await loadThreadResponses(debateId);
      } else {
        threadEl.classList.add('hidden');
        btn.querySelector('span').innerText = 'Ver respuestas';
      }
    });
  });

  container.querySelectorAll('[data-reply-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const debateId = form.getAttribute('data-reply-form');
      const input = form.querySelector('input');
      const content = input.value.trim();
      if (!content) return;

      try {
        await addDebateComment({ debateId, content });
        showToast('Respuesta publicada.', 'success');
        input.value = '';
        await loadThreadResponses(debateId);
        // update count locally
        const debate = allDebates.find(d => d.id === debateId);
        if (debate) debate.comments_count = (debate.comments_count || 0) + 1;
      } catch (err) {
        showToast(err.message || 'Error al responder', 'error');
      }
    });
  });
}

async function loadThreadResponses(debateId) {
  const container = document.getElementById(`responses-list-${debateId}`);
  if (!container) return;

  try {
    const comments = await getDebateComments(debateId);
    if (comments.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-500 py-1">No hay respuestas todavía. ¡Aporta tu opinión!</p>`;
      return;
    }

    const isAdmin = currentUser && (currentUser.profile?.role === 'admin' || currentUser.email?.includes('admin'));

    container.innerHTML = comments.map(c => {
      const isOwner = currentUser && currentUser.id === c.author_id;
      const canDelete = isOwner || isAdmin;

      return `
        <div class="p-3 rounded-xl bg-[#0e1017] border border-[#1e2333] space-y-1">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-white">${c.author_name}</span>
            <div class="flex items-center gap-2">
              <span class="text-slate-500">${new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              ${canDelete ? `
                <button data-delete-debate-comment="${c.id}" class="text-slate-500 hover:text-red-400 p-0.5 text-xs transition-colors" title="Eliminar respuesta">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              ` : ''}
            </div>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">${c.content}</p>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-delete-debate-comment]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Seguro que quieres eliminar este comentario?')) return;
        const id = btn.getAttribute('data-delete-debate-comment');
        const comment = comments.find(c => c.id === id);

        console.log("DELETE DEBATE COMMENT", {
          "comment.id": comment?.id,
          "comment.author_id": comment?.author_id,
          "currentUser.id": currentUser?.id,
          "isAdmin": isAdmin
        });

        try {
          await deleteDebateComment(id);
          showToast('Comentario eliminado.', 'success');
          await loadThreadResponses(debateId);
        } catch (err) {
          showToast(err.message || 'Error al eliminar comentario', 'error');
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="text-xs text-red-400">Error al cargar respuestas.</p>`;
  }
}
