/**
 * Fresh Football - Perfil Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { 
  getCurrentUser, 
  updateProfile, 
  uploadImage, 
  signOutUser, 
  getPredictions 
} from '../supabase.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('perfil');
  currentUser = await getCurrentUser();

  if (!currentUser) {
    window.location.href = '/login.html';
    return;
  }

  setupLogout();
  await renderProfile();
});

function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOutUser();
      showToast('Sesión cerrada correctamente.', 'info');
      setTimeout(() => window.location.href = '/index.html', 500);
    });
  }
}

async function renderProfile() {
  const container = document.getElementById('profile-container');
  if (!container) return;

  const profile = currentUser.profile || {};
  const userPreds = await getPredictions({ userId: currentUser.id }).catch(() => []);
  const regDate = profile.created_at ? new Date(profile.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Reciente';

  container.innerHTML = `
    <!-- Top Identity Card -->
    <div class="fresh-card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div class="relative group">
        <div class="w-24 h-24 rounded-2xl overflow-hidden bg-[#161a25] border-2 border-neon/40 shadow-neon-sm flex items-center justify-center text-3xl font-black text-neon">
          ${profile.avatar_url 
            ? `<img src="${profile.avatar_url}" id="current-avatar-img" class="w-full h-full object-cover" />` 
            : `<span id="avatar-fallback-letter">${(profile.nickname || currentUser.email || 'U').charAt(0).toUpperCase()}</span>`}
        </div>
      </div>

      <div class="flex-1 text-center sm:text-left space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <h2 class="text-xl sm:text-2xl font-black text-white">${profile.nickname || 'Sin apodo'}</h2>
          ${profile.role === 'admin' ? `
            <span class="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-neon text-black uppercase self-center sm:self-auto">Administrador</span>
          ` : `
            <span class="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 uppercase self-center sm:self-auto">Aficionado</span>
          `}
        </div>

        <p class="text-xs text-slate-400 font-mono">${currentUser.email}</p>
        <p class="text-xs text-slate-500">Miembro desde: ${regDate}</p>

        <!-- Stats Badges -->
        <div class="pt-3 grid grid-cols-2 gap-3 max-w-xs mx-auto sm:mx-0">
          <div class="p-2.5 rounded-xl bg-[#0b0e14] border border-[#232838] text-center">
            <span class="block text-base font-black text-neon tabular-nums">${profile.points || 0} pts</span>
            <span class="text-[10px] text-slate-400 uppercase">Puntos Globales</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[#0b0e14] border border-[#232838] text-center">
            <span class="block text-base font-black text-white tabular-nums">${userPreds.length}</span>
            <span class="text-[10px] text-slate-400 uppercase">Porras Realizadas</span>
          </div>
        </div>
      </div>
    </div>

    ${profile.role === 'admin' ? `
      <!-- Admin Private Access Hub -->
      <div class="fresh-card p-5 border-neon/40 bg-gradient-to-r from-[#0c1017] to-[#121622] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-neon animate-pulse"></span>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Acceso a Administración</h4>
          </div>
          <p class="text-xs text-slate-300">Tienes permisos para gestionar noticias, partidos, resultados, encuestas y moderar debates.</p>
        </div>
        <a href="/admin.html" class="btn-neon text-xs py-2 px-4 shrink-0 shadow-neon-sm flex items-center gap-1.5 self-start sm:self-auto">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Abrir Panel Admin</span>
        </a>
      </div>
    ` : ''}

    <!-- Edit Profile Form -->
    <div class="fresh-card p-6 space-y-4">
      <h3 class="text-sm font-bold text-white uppercase tracking-wider">Modificar Datos de Perfil</h3>
      <form id="edit-profile-form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Apodo público</label>
          <input 
            type="text" 
            id="nickname-input" 
            required 
            value="${profile.nickname || ''}" 
            class="fresh-input text-xs" 
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Cambiar Foto de Avatar (Supabase Storage)</label>
          <input 
            type="file" 
            id="avatar-file-input" 
            accept="image/*" 
            class="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#161a25] file:text-slate-200 hover:file:bg-[#202534]" 
          />
        </div>

        <div class="flex justify-end">
          <button type="submit" id="save-profile-btn" class="btn-neon text-xs py-2.5 px-5">
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  `;

  // Attach Form Submit
  const form = document.getElementById('edit-profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = document.getElementById('nickname-input').value.trim();
    const file = document.getElementById('avatar-file-input').files[0];

    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.innerText = 'Guardando...';

    try {
      let avatarUrl = profile.avatar_url;
      if (file) {
        showToast('Subiendo avatar...', 'info');
        avatarUrl = await uploadImage(file, 'avatars');
      }

      await updateProfile({ nickname, avatar_url: avatarUrl });
      showToast('Perfil actualizado correctamente.', 'success');
      currentUser = await getCurrentUser();
      await renderProfile();
    } catch (err) {
      showToast(err.message || 'Error al actualizar perfil', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerText = 'Guardar Cambios';
    }
  });
}
