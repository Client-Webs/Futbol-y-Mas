import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {resolve} from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          noticias: resolve(__dirname, 'noticias.html'),
          noticia: resolve(__dirname, 'noticia.html'),
          resultados: resolve(__dirname, 'resultados.html'),
          clasificacion: resolve(__dirname, 'clasificacion.html'),
          comunidad: resolve(__dirname, 'comunidad.html'),
          porras: resolve(__dirname, 'porras.html'),
          encuestas: resolve(__dirname, 'encuestas.html'),
          trivial: resolve(__dirname, 'trivial.html'),
          memes: resolve(__dirname, 'memes.html'),
          perfil: resolve(__dirname, 'perfil.html'),
          login: resolve(__dirname, 'login.html'),
          admin: resolve(__dirname, 'admin.html'),
          admin_index: resolve(__dirname, 'admin/index.html'),
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

