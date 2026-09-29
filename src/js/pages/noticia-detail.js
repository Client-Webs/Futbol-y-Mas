/**
 * Fresh Football - Noticia Detail & Comments Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { 
  getNewsById, 
  getComments, 
  addComment, 
  deleteComment, 
  getCurrentUser 
} from '../supabase.js';

let currentNewsId = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('noticias');
  currentUser = await getCurrentUser();

  const urlParams = new URLSearchParams(window.location.search);
  currentNewsId = urlParams.get('id');

  if (!currentNewsId) {
    document.getElementById('article-container').innerHTML = `
      <div class="empty-state py-12">
        <h3 class="text-white font-bold text-base mb-1">Noticia no especificada</h3>
        <p class="text-xs text-slate-400 mb-4">No se ha seleccionado ninguna noticia para visualizar.</p>
        <a href="/noticias.html" class="btn-neon text-xs">Ir a Noticias &rarr;</a>
      </div>
    `;
    return;
  }

  await loadArticle();
  renderCommentForm();
  await loadComments();
});

async function loadArticle() {
  const container = document.getElementById('article-container');
  try {
    const article = await getNewsById(currentNewsId);
    if (!article) {
      container.innerHTML = `
        <div class="empty-state py-12">
          <h3 class="text-white font-bold text-base mb-1">Noticia no encontrada</h3>
          <p class="text-xs text-slate-400 mb-4">La noticia solicitada no existe o ha sido despublicada.</p>
          <a href="/noticias.html" class="btn-neon text-xs">Ver otras noticias &rarr;</a>
        </div>
      `;
      return;
    }

    document.title = `${article.title} | Fresh Football`;

    container.innerHTML = `
      <!-- Unboxed Category and Date -->
      <div class="flex items-center gap-2 text-xs font-semibold text-neon">
        <span>${article.category}</span>
        <span class="text-slate-500">·</span>
        <span class="text-slate-400">${new Date(article.created_at).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      <h1 class="text-2xl sm:text-4xl font-black text-white leading-tight">
        ${article.title}
      </h1>

      <div class="flex items-center justify-between py-3 border-y border-[#1e2333] text-xs text-slate-400">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-neon/20 border border-neon/40 flex items-center justify-center font-bold text-neon text-[10px]">
            ${(article.author_name || 'F').charAt(0).toUpperCase()}
          </div>
          <span>Redacción: <strong class="text-white">${article.author_name || 'Fresh Football'}</strong></span>
        </div>
        <span class="text-slate-500">Exclusivo LaLiga</span>
      </div>

      <!-- Featured Image -->
      ${article.image_url ? `
        <div class="rounded-2xl overflow-hidden border border-[#232838] aspect-video w-full bg-slate-900">
          <img src="${article.image_url}" alt="${article.title}" class="w-full h-full object-cover" />
        </div>
      ` : ''}

      <!-- Excerpt -->
      ${article.excerpt ? `
        <p class="text-base sm:text-lg font-semibold text-slate-200 border-l-2 border-neon pl-4 italic leading-relaxed">
          ${article.excerpt}
        </p>
      ` : ''}

      <!-- Body Content -->
      <div class="text-slate-300 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
        ${article.content}
      </div>

      <!-- Tags -->
      ${article.tags && article.tags.length > 0 ? `
        <div class="flex flex-wrap items-center gap-2 pt-4">
          <span class="text-xs text-slate-500">Etiquetas:</span>
          ${article.tags.map(t => `<span class="text-xs text-neon font-medium">#${t}</span>`).join(' ')}
        </div>
      ` : ''}
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="py-8 text-center text-xs text-red-400">Error al cargar la noticia.</div>`;
  }
}

function renderCommentForm() {
  const formBox = document.getElementById('comment-form-container');
  if (!formBox) return;

  if (!currentUser) {
    formBox.innerHTML = `
      <div class="text-center py-4 space-y-2">
        <p class="text-xs text-slate-300">¿Quieres opinar sobre esta noticia?</p>
        <a href="/login.html" class="btn-neon text-xs py-2 px-4 inline-flex">
          Iniciar sesión para comentar
        </a>
      </div>
    `;
    return;
  }

  formBox.innerHTML = `
    <form id="comment-form" class="space-y-3">
      <div class="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <span>Comentar como:</span>
        <span class="text-neon font-bold">${currentUser.profile?.nickname || currentUser.email}</span>
      </div>
      <textarea 
        id="comment-input" 
        rows="3" 
        required 
        placeholder="Escribe tu opinión futbolera con respeto..." 
        class="fresh-input text-xs resize-none"
      ></textarea>
      <div class="flex justify-end">
        <button type="submit" id="submit-comment-btn" class="btn-neon text-xs py-2 px-5">
          Publicar Comentario
        </button>
      </div>
    </form>
  `;

  const form = document.getElementById('comment-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) return;

    if (content.length < 3) {
      showToast('El comentario es demasiado corto.', 'error');
      return;
    }

    const btn = document.getElementById('submit-comment-btn');
    btn.disabled = true;
    btn.innerText = 'Publicando...';

    try {
      await addComment({ newsId: currentNewsId, content });
      showToast('Comentario publicado correctamente.', 'success');
      input.value = '';
      await loadComments();
    } catch (err) {
      showToast(err.message || 'Error al publicar comentario', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Publicar Comentario';
    }
  });
}

async function loadComments() {
  const listContainer = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');
  if (!listContainer) return;

  try {
    const comments = await getComments(currentNewsId);
    if (countEl) countEl.innerText = `(${comments.length})`;

    if (comments.length === 0) {
      listContainer.innerHTML = `
        <div class="py-8 text-center text-xs text-slate-500 bg-[#0d0f16] rounded-xl border border-[#1e2333]">
          No hay comentarios todavía. ¡Sé el primero en debatir!
        </div>
      `;
      return;
    }

    const isAdmin = currentUser && (currentUser.profile?.role === 'admin' || currentUser.email?.includes('admin'));

    listContainer.innerHTML = comments.map(c => {
      const isOwner = currentUser && currentUser.id === c.author_id;
      const canDelete = isOwner || isAdmin;

      return `
        <div class="fresh-card p-4 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full overflow-hidden bg-[#1a1f2c] border border-[#232838] flex items-center justify-center text-neon font-bold text-xs">
                ${c.author_avatar 
                  ? `<img src="${c.author_avatar}" class="w-full h-full object-cover" />` 
                  : (c.author_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <span class="text-xs font-bold text-white block">${c.author_name}</span>
                <span class="text-[10px] text-slate-500">${new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            ${canDelete ? `
              <button 
                data-comment-id="${c.id}" 
                class="delete-comment-btn text-slate-500 hover:text-red-400 p-1 text-xs transition-colors"
                title="Eliminar comentario">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            ` : ''}
          </div>

          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-9">
            ${c.content}
          </p>
        </div>
      `;
    }).join('');

    // Attach delete listeners
    listContainer.querySelectorAll('.delete-comment-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Seguro que quieres eliminar este comentario?')) return;
        const id = btn.getAttribute('data-comment-id');
        const comment = comments.find(c => c.id === id);
        const isAdmin = currentUser && (currentUser.profile?.role === 'admin' || currentUser.email?.includes('admin'));

        console.log("DELETE COMMENT", {
          "comment.id": comment?.id,
          "comment.author_id": comment?.author_id,
          "currentUser.id": currentUser?.id,
          "isAdmin": isAdmin
        });

        try {
          await deleteComment(id);
          showToast('Comentario eliminado.', 'success');
          await loadComments();
        } catch (err) {
          showToast(err.message || 'Error al eliminar comentario', 'error');
        }
      });
    });

  } catch (err) {
    console.error(err);
    listContainer.innerHTML = `<div class="py-4 text-center text-xs text-red-400">Error al cargar comentarios.</div>`;
  }
}
