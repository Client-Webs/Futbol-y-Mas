/**
 * Fresh Football - Global Navigation, Header, Mobile Tab Bar & Footer
 */
import { getCurrentUser, signOutUser, isConfigured } from './supabase.js';

export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg class="w-5 h-5 text-neon shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
  } else {
    iconSvg = `<svg class="w-5 h-5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span class="leading-snug">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

export async function initNavigation(activePage = 'inicio') {
  const user = await getCurrentUser();
  const isAdmin = user && (user.profile?.role === 'admin' || user.email?.includes('admin'));

  // Header Zone
  const header = document.querySelector('header');
  if (header) {
    header.className = 'sticky top-0 z-40 bg-[#08090c]/90 backdrop-blur-md border-b border-[#232838]';
    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Zone 1: Official Brand Logo -->
        <a href="/index.html" class="flex items-center hover:opacity-90 transition-opacity shrink-0" aria-label="Fresh Football">
          <img 
            src="/logo.png" 
            alt="Fresh Football" 
            class="h-10 sm:h-12 w-auto max-w-[160px] sm:max-w-[200px] object-contain shrink-0" 
          />
        </a>

        <!-- Zone 2: Navigation Links -->
        <nav class="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-300">
          <a href="/index.html" class="hover:text-neon transition-colors ${activePage === 'inicio' ? 'text-neon font-bold' : ''}">Inicio</a>
          <a href="/noticias.html" class="hover:text-neon transition-colors ${activePage === 'noticias' ? 'text-neon font-bold' : ''}">Noticias</a>
          <a href="/resultados.html" class="hover:text-neon transition-colors ${activePage === 'resultados' ? 'text-neon font-bold' : ''}">Resultados</a>
          <a href="/clasificacion.html" class="hover:text-neon transition-colors ${activePage === 'clasificacion' ? 'text-neon font-bold' : ''}">Clasificación</a>
          <a href="/comunidad.html" class="hover:text-neon transition-colors ${activePage === 'comunidad' ? 'text-neon font-bold' : ''}">Debates</a>
          <a href="/porras.html" class="hover:text-neon transition-colors ${activePage === 'porras' ? 'text-neon font-bold' : ''}">Porras</a>
          
          <div class="relative group">
            <button class="flex items-center gap-1 hover:text-neon transition-colors focus:outline-none">
              <span>Más</span>
              <svg class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute left-0 top-full pt-2 hidden group-hover:block w-44 z-50">
              <div class="bg-[#10131a] border border-[#232838] rounded-xl shadow-xl py-2 px-1">
                <a href="/encuestas.html" class="block px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#161a24] hover:text-neon transition-colors ${activePage === 'encuestas' ? 'text-neon' : ''}">Encuestas</a>
                <a href="/trivial.html" class="block px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#161a24] hover:text-neon transition-colors ${activePage === 'trivial' ? 'text-neon' : ''}">Trivial LaLiga</a>
                <a href="/memes.html" class="block px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#161a24] hover:text-neon transition-colors ${activePage === 'memes' ? 'text-neon' : ''}">Memes & Humor</a>
              </div>
            </div>
          </div>
        </nav>

        <!-- Zone 3: Primary Actions -->
        <div class="flex items-center gap-3">
          ${user ? `
            ${isAdmin ? `
              <!-- Option visible ONLY when verified admin is logged in -->
              <a href="/admin.html" title="Panel de Administración" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neon bg-[#10141f] border border-neon/40 rounded-xl hover:bg-neon hover:text-black transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                <span class="hidden sm:inline">Admin</span>
              </a>
            ` : ''}

            <a href="/perfil.html" class="flex items-center gap-2 p-1 pl-2 bg-[#12151e] border border-[#232838] hover:border-neon/40 rounded-xl transition-all">
              <span class="text-xs font-semibold text-slate-200 truncate max-w-[100px] hidden sm:inline">${user.profile?.nickname || 'Mi Cuenta'}</span>
              <div class="w-8 h-8 rounded-lg overflow-hidden bg-[#1c202d] border border-[#232838] flex items-center justify-center text-neon font-bold text-xs">
                ${user.profile?.avatar_url 
                  ? `<img src="${user.profile.avatar_url}" class="w-full h-full object-cover" />`
                  : (user.profile?.nickname || 'U').charAt(0).toUpperCase()}
              </div>
            </a>
            <button id="nav-logout-btn" title="Cerrar sesión" class="p-2 text-slate-400 hover:text-red-400 hover:bg-[#161a24] rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          ` : `
            <a href="/login.html" class="btn-neon text-xs py-2 px-4">
              Iniciar Sesión
            </a>
          `}
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await signOutUser();
        showToast('Sesión cerrada correctamente.', 'info');
        setTimeout(() => window.location.href = '/index.html', 500);
      });
    }
  }

  // Mobile Bottom Tab Bar (fixed at bottom for thumb ergonomics)
  let bottomBar = document.getElementById('mobile-bottom-bar');
  if (!bottomBar) {
    bottomBar = document.createElement('div');
    bottomBar.id = 'mobile-bottom-bar';
    document.body.appendChild(bottomBar);
  }
  bottomBar.className = 'lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#08090c]/95 backdrop-blur-lg border-t border-[#232838] px-2 py-1.5';
  bottomBar.innerHTML = `
    <div class="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto">
      <a href="/index.html" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'inicio' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        <span class="text-[10px] font-semibold mt-1">Inicio</span>
      </a>

      <a href="/noticias.html" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'noticias' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        <span class="text-[10px] font-semibold mt-1">Noticias</span>
      </a>

      <a href="/resultados.html" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'resultados' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <span class="text-[10px] font-semibold mt-1">Partidos</span>
      </a>

      <a href="/comunidad.html" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'comunidad' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/></svg>
        <span class="text-[10px] font-semibold mt-1">Debates</span>
      </a>

      <a href="${user ? '/perfil.html' : '/login.html'}" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'perfil' || activePage === 'login' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        <span class="text-[10px] font-semibold mt-1">${user ? 'Perfil' : 'Entrar'}</span>
      </a>
    </div>
  `;

  // Global Footer
  const footer = document.querySelector('footer');
  if (footer) {
    footer.className = 'bg-[#090b10] border-t border-[#232838] pt-12 pb-24 lg:pb-12 text-slate-400 text-sm';
    footer.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          <!-- Col 1: Identity & World Titles -->
          <div class="md:col-span-5 space-y-4">
            <div class="flex items-center">
              <img src="/logo.png" alt="Fresh Football" class="h-14 sm:h-16 w-auto max-w-[200px] object-contain" />
            </div>

            <p class="text-slate-300 text-sm leading-relaxed">
              🚨 Noticias | Fichajes | Rumores<br>
              🏆 Todo acerca de LaLiga<br>
              🧠 Trivials | Encuestas | Debates<br>
              😂 Memes y mucho más
            </p>

            <!-- Títulos mundiales showcase -->
            <div class="p-3.5 rounded-xl bg-[#10131a] border border-[#232838] space-y-2">
              <div class="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider text-neon">
                <span>🏆🏆 TÍTULOS DE MUNDIALES</span>
              </div>
              <p class="text-xs text-slate-300 leading-normal">
                Nuestra primera estrella 💫 la ganamos en el mundial de canales de fútbol x el mundo. ⚽⭐
              </p>
              <p class="text-xs text-slate-300 leading-normal">
                La segunda en el canal de Total Fútbol, tras una goleada.
              </p>
              <p class="text-xs text-slate-300 leading-normal">
                Y la tercera en el mundial de Info Fútbol.
              </p>
              <div class="pt-1 text-[11px] text-neon font-semibold">
                📲 Todo el fútbol en un solo lugar. 💙 Únete a la familia.
              </div>
            </div>
          </div>

          <!-- Col 2: Navigation Links -->
          <div class="md:col-span-3 space-y-3">
            <h4 class="text-white font-bold text-xs uppercase tracking-wider">Explorar</h4>
            <ul class="space-y-2 text-xs">
              <li><a href="/noticias.html" class="hover:text-neon transition-colors">Noticias de LaLiga</a></li>
              <li><a href="/resultados.html" class="hover:text-neon transition-colors">Calendario & Resultados</a></li>
              <li><a href="/clasificacion.html" class="hover:text-neon transition-colors">Clasificación Oficial</a></li>
              <li><a href="/porras.html" class="hover:text-neon transition-colors">Porras de la Jornada</a></li>
              <li><a href="/comunidad.html" class="hover:text-neon transition-colors">Debates de la Comunidad</a></li>
            </ul>
          </div>

          <!-- Col 3: Interactive Features -->
          <div class="md:col-span-2 space-y-3">
            <h4 class="text-white font-bold text-xs uppercase tracking-wider">Participa</h4>
            <ul class="space-y-2 text-xs">
              <li><a href="/trivial.html" class="hover:text-neon transition-colors">Trivial de Fútbol</a></li>
              <li><a href="/encuestas.html" class="hover:text-neon transition-colors">Encuestas Activas</a></li>
              <li><a href="/memes.html" class="hover:text-neon transition-colors">Zona Memes</a></li>
              <li><a href="/perfil.html" class="hover:text-neon transition-colors">Mi Perfil</a></li>
            </ul>
          </div>

          <!-- Col 4: Backend Status & Supabase -->
          <div class="md:col-span-2 space-y-3">
            <h4 class="text-white font-bold text-xs uppercase tracking-wider">Comunidad</h4>
            <div class="p-3 bg-[#10131a] rounded-xl border border-[#232838] space-y-2">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-neon shadow-neon-sm"></span>
                <span class="text-xs font-semibold text-white">Fresh Football Club</span>
              </div>
              <p class="text-[11px] text-slate-400">
                La mayor comunidad de LaLiga en español. Noticias, porras y debates cada jornada.
              </p>
            </div>
          </div>
        </div>

        <!-- WhatsApp Channel Banner -->
        <div class="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-[#10131a] to-[#10131a] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div class="flex items-center gap-3.5 text-center sm:text-left">
            <div class="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            </div>
            <div>
              <h4 class="text-white font-bold text-sm">Únete al canal de Fresh Football ⚽</h4>
              <p class="text-xs text-slate-300">Entrevistas, fichajes en directo y la mejor comunidad en WhatsApp.</p>
            </div>
          </div>
          <a href="https://whatsapp.com/channel/0029Vb8kun4HAdNPAnI5eY34" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 shrink-0">
            <span>Unirme ahora</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </div>

        <div class="border-t border-[#1e2330] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© ${new Date().getFullYear()} Fresh Football. Todos los derechos reservados. ⚽</p>
          <p class="text-slate-400">
            Web creada por <a href="https://webshumar.vercel.app" target="_blank" rel="noopener noreferrer" class="text-neon font-semibold hover:text-white transition-colors underline decoration-neon/50 underline-offset-4">WebsHuMar</a> ✦
          </p>
        </div>
      </div>
    `;
  }
}
