/**
 * Fresh Football - Noticias Page Logic
 */
import { initNavigation } from '../navigation.js';
import { getNews } from '../supabase.js';

let allNews = [];
let activeCategory = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('noticias');
  setupFilters();
  await fetchNews();
});

async function fetchNews() {
  const container = document.getElementById('news-grid');
  try {
    allNews = await getNews({ limit: 100 });
    renderNews();
  } catch (err) {
    console.error(err);
    if (container) {
      container.innerHTML = `<div class="col-span-full text-center py-12 text-xs text-red-400">Error al cargar noticias.</div>`;
    }
  }
}

function renderNews() {
  const container = document.getElementById('news-grid');
  if (!container) return;

  let filtered = allNews;
  if (activeCategory !== 'all') {
    filtered = filtered.filter(n => n.category === activeCategory);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(n => 
      n.title.toLowerCase().includes(q) || 
      (n.content && n.content.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full empty-state py-16">
        <div class="empty-state-icon">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        </div>
        <h3 class="text-white font-bold text-base mb-1">Todavía no hay noticias publicadas</h3>
        <p class="text-xs text-slate-400 max-w-sm">La redacción de Fresh Football publicará pronto las últimas exclusivas y fichajes de LaLiga.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <article class="fresh-card overflow-hidden flex flex-col group">
      <a href="/noticia.html?id=${item.id}" class="block relative aspect-video w-full overflow-hidden bg-slate-900">
        ${item.image_url ? `
          <img src="${item.image_url}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ` : `
          <div class="w-full h-full flex items-center justify-center bg-[#131722] text-slate-600">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
        `}
      </a>

      <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div class="space-y-2">
          <!-- Unboxed metadata -->
          <div class="flex items-center gap-2 text-xs font-semibold text-neon">
            <span>${item.category}</span>
            <span aria-hidden="true" class="text-slate-500">·</span>
            <span class="text-slate-400">${new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
          </div>

          <h2 class="text-base font-bold text-white group-hover:text-neon transition-colors leading-snug">
            <a href="/noticia.html?id=${item.id}">${item.title}</a>
          </h2>

          <p class="text-xs text-slate-400 line-clamp-3 leading-relaxed">
            ${item.excerpt || item.content.substring(0, 130) + '...'}
          </p>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-[#1e2333]">
          <span class="truncate max-w-[150px]">Por ${item.author_name || 'Fresh Football'}</span>
          <a href="/noticia.html?id=${item.id}" class="text-neon font-bold flex items-center gap-1 hover:underline">
            <span>Leer</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </article>
  `).join('');
}

function setupFilters() {
  const catButtons = document.querySelectorAll('#category-filters button');
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => {
        b.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-[#12151e] border border-[#232838] text-slate-300 hover:text-white';
      });
      btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-neon text-black';
      activeCategory = btn.getAttribute('data-cat');
      renderNews();
    });
  });

  const searchInput = document.getElementById('news-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderNews();
    });
  }
}
