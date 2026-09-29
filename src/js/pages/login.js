/**
 * Fresh Football - Login & Register Controller
 */
import { initNavigation, showToast } from '../navigation.js';
import { signInUser, signUpUser, getCurrentUser, resetPasswordForEmail } from '../supabase.js';

let currentMode = 'login'; // 'login' | 'register'

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('login');

  const existingUser = await getCurrentUser();
  if (existingUser) {
    window.location.href = '/perfil.html';
    return;
  }

  setupTabs();
  setupForm();
  setupRecovery();
});

function setupTabs() {
  const tabs = document.querySelectorAll('#auth-tabs button');
  const nicknameGroup = document.getElementById('nickname-group');
  const submitBtn = document.getElementById('auth-submit-btn');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-white';
      });
      tab.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-neon text-black';

      currentMode = tab.getAttribute('data-mode');
      if (currentMode === 'register') {
        nicknameGroup.classList.remove('hidden');
        document.getElementById('auth-nickname').setAttribute('required', 'true');
        submitBtn.innerText = 'Crear Cuenta y Entrar';
      } else {
        nicknameGroup.classList.add('hidden');
        document.getElementById('auth-nickname').removeAttribute('required');
        submitBtn.innerText = 'Iniciar Sesión';
      }
    });
  });
}

function setupForm() {
  const form = document.getElementById('auth-form');
  const submitBtn = document.getElementById('auth-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const nickname = document.getElementById('auth-nickname').value.trim();

    submitBtn.disabled = true;
    submitBtn.innerText = 'Procesando...';

    try {
      if (currentMode === 'register') {
        if (!nickname) {
          showToast('Introduce un apodo.', 'error');
          return;
        }
        await signUpUser({ email, password, nickname });
        showToast('¡Cuenta creada con éxito! Bienvenido a Fresh Football.', 'success');
      } else {
        await signInUser({ email, password });
        showToast('¡Bienvenido de nuevo!', 'success');
      }

      setTimeout(() => {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/index.html';
        window.location.href = redirect;
      }, 700);

    } catch (err) {
      showToast(err.message || 'Error en la autenticación', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = currentMode === 'register' ? 'Crear Cuenta y Entrar' : 'Iniciar Sesión';
    }
  });
}

function setupRecovery() {
  const toggleBtn = document.getElementById('forgot-password-btn');
  const box = document.getElementById('recovery-box');
  const sendBtn = document.getElementById('send-recovery-btn');

  if (toggleBtn && box) {
    toggleBtn.addEventListener('click', () => {
      box.classList.toggle('hidden');
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      if (!email) {
        showToast('Escribe tu correo en el campo de arriba.', 'error');
        return;
      }
      sendBtn.disabled = true;
      sendBtn.innerText = 'Enviando...';
      try {
        await resetPasswordForEmail(email);
        showToast('Enlace enviado. Revisa tu bandeja de entrada o spam.', 'success');
        box.classList.add('hidden');
      } catch (err) {
        showToast(err.message || 'Error al solicitar recuperación', 'error');
      } finally {
        sendBtn.disabled = false;
        sendBtn.innerText = 'Enviar enlace de recuperación';
      }
    });
  }
}
