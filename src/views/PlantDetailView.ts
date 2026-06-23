import { addCheckIn, deletePlant, subscribeCheckIns, subscribePlants } from '../db/plants';
import { getAuthState } from '../auth';
import { navigate } from '../router';
import type { Cleanup } from '../router';
import {
  GRAFT_STATUS_LABELS,
  PLANT_TYPE_LABELS,
  STOCK_TYPE_LABELS
} from '../types';
import type { CheckIn, Plant } from '../types';

export function renderPlantDetail(container: HTMLElement, params: Record<string, string>): Cleanup {
  container.innerHTML = '<p class="empty-state">Loading…</p>';
  const plantId = params.id;

  let checkIns: CheckIn[] = [];
  let plant: Plant | null = null;

  const unsubPlants = subscribePlants((plants) => {
    plant = plants.find((p) => p.id === plantId) ?? null;
    render();
  });
  const unsubCheckIns = subscribeCheckIns(plantId, (data) => {
    checkIns = data;
    render();
  });

  function render() {
    if (!plant) {
      container.innerHTML = '<p class="empty-state">Plant not found.</p>';
      return;
    }
    const p = plant;
    container.innerHTML = `
      <div class="card">
        <h2>${escapeHtml(p.label || p.rowLabel || 'Unnamed plant')}</h2>
        <p>
          <strong>${PLANT_TYPE_LABELS[p.plantType]}</strong>
          ${p.species ? ' · ' + escapeHtml(p.species) : ''}
          ${p.variety ? ' · ' + escapeHtml(p.variety) : ''}
        </p>
        <table>
          <tr><th>Row / position</th><td>${escapeHtml(p.rowLabel || '—')}</td></tr>
          <tr><th>Status</th><td>${p.status === 'planted' ? 'Planted' : 'Planned (not yet planted)'}</td></tr>
          <tr><th>Year planted</th><td>${p.yearPlanted ?? '—'}</td></tr>
          <tr><th>Stock</th><td>${STOCK_TYPE_LABELS[p.stockType]}</td></tr>
          <tr><th>Graft status</th><td>${GRAFT_STATUS_LABELS[p.graftStatus]}</td></tr>
          ${p.scionVariety ? `<tr><th>Scion grafted on</th><td>${escapeHtml(p.scionVariety)}</td></tr>` : ''}
          ${p.plannedGraftVariety ? `<tr><th>Planned graft variety</th><td>${escapeHtml(p.plannedGraftVariety)}</td></tr>` : ''}
          <tr><th>Location</th><td>${p.lat != null && p.lng != null ? `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}` : 'Not recorded yet'}</td></tr>
        </table>
        <div class="form-actions">
          <button class="btn btn-outline" data-edit>Edit</button>
          <button class="btn btn-danger" data-delete>Delete</button>
        </div>
      </div>

      <div class="card">
        <h3>Notes &amp; vigor check-ins</h3>
        <form class="plant-form" data-checkin-form>
          <div class="row">
            <label>Date
              <input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required />
            </label>
            <label>Vigor (1=poor, 5=excellent)
              <select name="vigor">
                <option value="">—</option>
                <option value="1">1 — poor / declining</option>
                <option value="2">2 — below average</option>
                <option value="3">3 — average</option>
                <option value="4">4 — good</option>
                <option value="5">5 — excellent / thriving</option>
              </select>
            </label>
          </div>
          <label>Note
            <textarea name="note" rows="2" placeholder="What did you observe?"></textarea>
          </label>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Add check-in</button>
          </div>
        </form>

        <ul class="checkin-list">
          ${checkIns.length === 0 ? '<p class="empty-state">No check-ins yet.</p>' : checkIns.map(renderCheckIn).join('')}
        </ul>
      </div>
    `;

    container.querySelector<HTMLButtonElement>('[data-edit]')!.onclick = () =>
      navigate(`/plant/${p.id}/edit`);
    container.querySelector<HTMLButtonElement>('[data-delete]')!.onclick = async () => {
      if (confirm(`Delete ${p.label || p.rowLabel || 'this plant'}? This cannot be undone.`)) {
        await deletePlant(p.id);
        navigate('/list');
      }
    };

    const checkinForm = container.querySelector<HTMLFormElement>('[data-checkin-form]')!;
    checkinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(checkinForm);
      const submitBtn = checkinForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitBtn.disabled = true;
      try {
        await addCheckIn(p.id, {
          date: String(fd.get('date')),
          vigor: fd.get('vigor') ? Number(fd.get('vigor')) : null,
          note: String(fd.get('note') ?? ''),
          author: getAuthState().user?.email ?? 'unknown'
        });
        checkinForm.reset();
        (checkinForm.elements.namedItem('date') as HTMLInputElement).value = new Date()
          .toISOString()
          .slice(0, 10);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  return () => {
    unsubPlants();
    unsubCheckIns();
  };
}

function renderCheckIn(c: CheckIn): string {
  return `
    <li class="checkin-item">
      ${c.vigor ? `<span class="vigor-badge vigor-${c.vigor}">${c.vigor}</span>` : ''}
      <div>
        <div class="meta">${c.date} · ${escapeHtml(c.author)}</div>
        ${c.note ? `<div>${escapeHtml(c.note)}</div>` : ''}
      </div>
    </li>
  `;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
