import { signInWithGoogle } from '../auth';
import { firebaseConfigured } from '../firebase';
import type { AuthState } from '../auth';

export function renderLogin(root: HTMLElement, state: AuthState) {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'login-screen';

  if (!firebaseConfigured) {
    wrap.innerHTML = `
      <h1>Wilder Chestnuts Farm Map</h1>
      <p>Firebase isn't configured yet. Copy <code>.env.example</code> to <code>.env</code> and
      fill in your Firebase project's web app config, then restart the dev server.</p>
      <p>See README.md for step-by-step setup.</p>
    `;
    root.appendChild(wrap);
    return;
  }

  if (state.user && !state.authorized) {
    wrap.innerHTML = `
      <h1>Almost there</h1>
      <p>Signed in as <strong>${state.user.email}</strong>, but this account isn't on the
      farm's access list yet.</p>
      <p>Ask the farm owner to add <code>${state.user.email}</code> to the
      <code>access</code> collection in Firestore.</p>
    `;
    root.appendChild(wrap);
    return;
  }

  wrap.innerHTML = `<h1>🌳 Wilder Chestnuts Farm Map</h1><p>Sign in to view and edit the farm map.</p>`;
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = 'Sign in with Google';
  btn.onclick = () => signInWithGoogle().catch((e) => alert(e.message));
  wrap.appendChild(btn);
  root.appendChild(wrap);
}
