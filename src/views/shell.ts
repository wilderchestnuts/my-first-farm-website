import { signOutUser } from '../auth';
import type { User } from 'firebase/auth';

const TABS = [
  { path: '/map', label: 'Map' },
  { path: '/list', label: 'List' },
  { path: '/add', label: 'Add plant' },
  { path: '/import', label: 'Import' }
];

export function renderShell(root: HTMLElement, user: User): HTMLElement {
  root.innerHTML = '';

  const topbar = document.createElement('div');
  topbar.className = 'topbar';

  const title = document.createElement('h1');
  title.textContent = '🌳 Wilder Chestnuts';
  topbar.appendChild(title);

  const tabs = document.createElement('nav');
  tabs.className = 'tabs';
  const currentHash = window.location.hash.replace(/^#/, '') || '/map';
  for (const tab of TABS) {
    const a = document.createElement('a');
    a.href = `#${tab.path}`;
    a.textContent = tab.label;
    if (currentHash.startsWith(tab.path)) a.classList.add('active');
    tabs.appendChild(a);
  }
  topbar.appendChild(tabs);

  const userBox = document.createElement('div');
  userBox.style.display = 'flex';
  userBox.style.gap = '0.5rem';
  userBox.style.alignItems = 'center';
  const who = document.createElement('span');
  who.textContent = user.displayName ?? user.email ?? '';
  who.style.fontSize = '0.85rem';
  const signOutBtn = document.createElement('button');
  signOutBtn.className = 'btn';
  signOutBtn.textContent = 'Sign out';
  signOutBtn.onclick = () => signOutUser();
  userBox.append(who, signOutBtn);
  topbar.appendChild(userBox);

  root.appendChild(topbar);

  const main = document.createElement('main');
  root.appendChild(main);

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace(/^#/, '') || '/map';
    tabs.querySelectorAll('a').forEach((a) => {
      const path = a.getAttribute('href')!.replace(/^#/, '');
      a.classList.toggle('active', hash.startsWith(path));
    });
  });

  return main;
}
