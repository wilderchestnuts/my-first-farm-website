import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export interface AuthState {
  user: User | null;
  authorized: boolean;
  loading: boolean;
}

type Listener = (state: AuthState) => void;

let current: AuthState = { user: null, authorized: false, loading: true };
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l(current);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    current = { user: null, authorized: false, loading: false };
    notify();
    return;
  }
  current = { user, authorized: false, loading: true };
  notify();
  const authorized = await checkAuthorized(user.email);
  current = { user, authorized, loading: false };
  notify();
});

async function checkAuthorized(email: string | null): Promise<boolean> {
  if (!email) return false;
  const snap = await getDoc(doc(db, 'access', email));
  return snap.exists();
}

export function onAuthChange(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function getAuthState(): AuthState {
  return current;
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  await signOut(auth);
}
