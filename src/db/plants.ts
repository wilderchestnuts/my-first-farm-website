import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CheckIn, NewCheckIn, NewPlant, Plant } from '../types';

const plantsCol = collection(db, 'plants');

export function subscribePlants(onChange: (plants: Plant[]) => void): Unsubscribe {
  const q = query(plantsCol, orderBy('rowLabel'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Plant, 'id'>) })));
  });
}

export async function createPlant(data: NewPlant): Promise<string> {
  const ref = await addDoc(plantsCol, {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return ref.id;
}

export async function updatePlant(id: string, data: Partial<NewPlant>): Promise<void> {
  await updateDoc(doc(plantsCol, id), { ...data, updatedAt: Date.now() });
}

export async function deletePlant(id: string): Promise<void> {
  await deleteDoc(doc(plantsCol, id));
}

export function subscribeCheckIns(
  plantId: string,
  onChange: (checkIns: CheckIn[]) => void
): Unsubscribe {
  const q = query(collection(db, 'plants', plantId, 'checkIns'), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CheckIn, 'id'>) })));
  });
}

export async function addCheckIn(plantId: string, data: NewCheckIn): Promise<void> {
  await addDoc(collection(db, 'plants', plantId, 'checkIns'), {
    ...data,
    createdAt: Date.now()
  });
}

export interface ImportRow {
  plant: NewPlant;
  initialNote?: string;
}

export async function bulkImportPlants(rows: ImportRow[], author: string): Promise<void> {
  // Firestore batches cap at 500 writes; chunk defensively for large imports
  // (each row uses up to 2 writes, so keep well under the limit).
  for (let i = 0; i < rows.length; i += 200) {
    const batch = writeBatch(db);
    for (const { plant, initialNote } of rows.slice(i, i + 200)) {
      const ref = doc(plantsCol);
      batch.set(ref, { ...plant, createdBy: author, createdAt: Date.now(), updatedAt: Date.now() });
      if (initialNote) {
        const checkInRef = doc(collection(ref, 'checkIns'));
        batch.set(checkInRef, {
          date: new Date().toISOString().slice(0, 10),
          vigor: null,
          note: initialNote,
          author,
          createdAt: Date.now()
        });
      }
    }
    await batch.commit();
  }
}
