import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import type { MapOverlayConfig } from '../types';

const configDoc = doc(db, 'config', 'mapOverlay');

export function subscribeMapConfig(
  onChange: (config: MapOverlayConfig | null) => void
): Unsubscribe {
  return onSnapshot(configDoc, (snap) => {
    onChange(snap.exists() ? (snap.data() as MapOverlayConfig) : null);
  });
}

export async function saveMapConfig(config: MapOverlayConfig): Promise<void> {
  await setDoc(configDoc, config);
}
