/**
 * Fresh Football - Memes Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { 
  getMemes, 
  createMeme, 
  likeMeme, 
  deleteMeme, 
  uploadImage, 
  getCurrentUser 
} from '../supabase.js';

let currentUser = null;
let allMemes = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('memes');
  currentUser = await getCurrentUser();
  setupUploadBox();
  await loadMemes();
});

function setupUploadBox() {
  const openBtn = document.getElementById('open-upload-meme-btn');
  const box = document.getElementById('upload-meme-box');
  const cancelBtn = document.getElementById('cancel-meme-btn');
  const form = document.getElementById('upload-meme-form');

  if (openBtn && box) {
    openBtn.addEventListener('click', () => {
      if (!currentUser) {
        showToast('Debes iniciar sesión para compartir memes.', 'error');
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
      const title = document.getElementById('meme-title-input').value.trim();
      const fileInput = document.getElementById('meme-file-input');
      const urlInput = document.getElementById('meme-url-input');

      let imageUrl = urlInput.value.trim();
      const file = fileInput.files[0];

      if (!file && !imageUrl) {
        showToast('Selecciona un archivo o pega una URL de imagen.', 'error');
        return;
      }

      const submitBtn = document.getElementById('submit-meme-btn');
      submitBtn.disabled = true;
      submitBtn.innerText = 'Subiendo...';

      try {
        if (file) {
          imageUrl = await uploadImage(file, 'memes');
        }

        await createMeme({ title, imageUrl });
        showToast('¡Meme publicado con éxito!', 'success');
        form.reset();
        box.classList.add('hidden');
        await loadMemes();
      } catch (err) {
        showToast(err.message || 'Error al subir meme', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Publicar Meme';
      }
    });
  }
}

async function loadMemes() {
  const container = document.getElementById('memes-grid');
  try {
    allMemes = await getMemes();
    renderMemes();
  } catch (err) {
    console.error(err);
    if (container) {
      container.innerHTML = `<div class="col-span-full py-12 text-center text-xs text-red-400">Error al cargar memes.</div>`;
    }
  }
}

function renderMemes() {
  const container = document.getElementById('memes-grid');
  if (!container) return;

  if (allMemes.length === 0) {
    container.innerHTML = `
      <div class="col-span-full empty-state py-16">
        <div class="empty-state-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 class="text-white font-bold text-base mb-1">Todavía no hay memes publicados</h3>
        <p class="text-xs text-slate-400 max-w-sm mb-4">Sé el primero en compartir el mejor humor sobre LaLiga con la comunidad.</p>
        <button id="empty-state-upload-meme" class="btn-neon text-xs">Subir el Primer Meme &rarr;</button>
      </div>
    `;
    document.getElementById('empty-state-upload-meme')?.addEventListener('click', () => {
      document.getElementById('open-upload-meme-btn')?.click();
    });
    return;
  }

  const isAdmin = currentUser && (currentUser.profile?.role === 'admin' || currentUser.email?.includes('admin'));

  container.innerHTML = allMemes.map(m => {
    const isAuthor = currentUser && currentUser.id === m.author_id;
    const canDelete = isAuthor || isAdmin;

    return `
      <div class="fresh-card overflow-hidden flex flex-col group">
        <div class="relative aspect-square w-full bg-[#0a0c12] overflow-hidden flex items-center justify-center">
          <img src="${m.image_url}" alt="${m.title}" class="w-full h-full object-contain" loading="lazy" />
        </div>

        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <h4 class="text-sm font-bold text-white leading-snug line-clamp-2">${m.title}</h4>

          <div class="flex items-center justify-between text-xs pt-3 border-t border-[#1e2333]">
            <div class="text-slate-400 text-[11px] truncate max-w-[120px]">
              <span>Por ${m.author_name}</span>
            </div>

            <div class="flex items-center gap-2">
              <button 
                data-like-meme="${m.id}" 
                class="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#141722] hover:bg-[#1f2434] text-slate-300 hover:text-red-400 transition-colors">
                <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span class="font-bold tabular-nums">${m.likes_count || 0}</span>
              </button>

              ${canDelete ? `
                <button data-delete-meme="${m.id}" class="text-slate-500 hover:text-red-400 p-1" title="Eliminar meme">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach like handlers
  container.querySelectorAll('[data-like-meme]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-like-meme');
      await likeMeme(id);
      showToast('¡Reacción añadida! 😂', 'success');
      await loadMemes();
    });
  });

  // Attach delete handlers
  container.querySelectorAll('[data-delete-meme]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Deseas eliminar este meme?')) return;
      const id = btn.getAttribute('data-delete-meme');
      await deleteMeme(id);
      showToast('Meme eliminado.', 'info');
      await loadMemes();
    });
  });
}
