import { createPlant, updatePlant, subscribePlants } from '../db/plants';
import { getCurrentPosition } from '../geo';
import { getAuthState } from '../auth';
import { navigate } from '../router';
import type { Cleanup } from '../router';
import type {
  GraftStatus,
  NewPlant,
  Plant,
  PlantingStatus,
  PlantType,
  StockType
} from '../types';
import { GRAFT_STATUS_LABELS, PLANT_TYPE_LABELS, STOCK_TYPE_LABELS } from '../types';

const BLANK: NewPlant = {
  label: '',
  plantType: 'chestnut',
  species: '',
  variety: '',
  stockType: 'unknown',
  graftStatus: 'not_grafted',
  scionVariety: '',
  plannedGraftVariety: '',
  status: 'planted',
  yearPlanted: null,
  rowLabel: '',
  lat: null,
  lng: null,
  createdBy: ''
};

export function renderPlantForm(
  container: HTMLElement,
  opts: { plantId?: string }
): Cleanup {
  container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h2>${opts.plantId ? 'Edit plant' : 'Add a plant'}</h2>`;
  container.appendChild(card);

  let cleanup: Cleanup | undefined;
  if (opts.plantId) {
    // Reuse the plants subscription rather than a one-off fetch, so edits
    // made elsewhere (e.g. another device) are reflected if this stays open.
    cleanup = subscribePlants((plants) => {
      const plant = plants.find((p) => p.id === opts.plantId);
      if (plant) buildForm(card, plant);
    });
  } else {
    buildForm(card, null);
  }
  return cleanup ?? (() => {});
}

function buildForm(card: HTMLElement, existing: Plant | null) {
  const existingForm = card.querySelector('form');
  if (existingForm) existingForm.remove();

  const data: NewPlant = existing
    ? { ...existing }
    : { ...BLANK };

  const form = document.createElement('form');
  form.className = 'plant-form';

  form.innerHTML = `
    <label>Label / name
      <input name="label" type="text" placeholder="e.g. R3-12 or 'Big tree by the gate'" value="${attr(data.label)}" />
    </label>

    <div class="row">
      <label>Type
        <select name="plantType">
          ${selectOptions(PLANT_TYPE_LABELS, data.plantType)}
        </select>
      </label>
      <label>Row / grid position
        <input name="rowLabel" type="text" placeholder="e.g. Row 3, position 12" value="${attr(data.rowLabel)}" />
      </label>
    </div>

    <div class="row">
      <label>Species
        <input name="species" type="text" placeholder="e.g. Castanea sativa x crenata" value="${attr(data.species)}" />
      </label>
      <label>Variety / cultivar
        <input name="variety" type="text" placeholder="e.g. Colossal" value="${attr(data.variety)}" />
      </label>
    </div>

    <div class="row">
      <label>Stock type
        <select name="stockType">${selectOptions(STOCK_TYPE_LABELS, data.stockType)}</select>
      </label>
      <label>Graft status
        <select name="graftStatus">${selectOptions(GRAFT_STATUS_LABELS, data.graftStatus)}</select>
      </label>
    </div>

    <div class="row" data-grafted-fields>
      <label>Scion grafted on (if grafted)
        <input name="scionVariety" type="text" placeholder="e.g. Marrone di Chiusa Pesio" value="${attr(data.scionVariety)}" />
      </label>
      <label>Planned graft variety (if not grafted yet)
        <input name="plannedGraftVariety" type="text" placeholder="e.g. planning to graft Bouche de Bétizac" value="${attr(data.plannedGraftVariety)}" />
      </label>
    </div>

    <div class="row">
      <label>Status
        <select name="status">
          <option value="planted" ${data.status === 'planted' ? 'selected' : ''}>Planted</option>
          <option value="planned" ${data.status === 'planned' ? 'selected' : ''}>Planned (not yet planted)</option>
        </select>
      </label>
      <label>Year planted
        <input name="yearPlanted" type="number" min="1990" max="2100" value="${data.yearPlanted ?? ''}" />
      </label>
    </div>

    <div class="row">
      <label>Latitude <span class="hint">optional — fill in by standing at the tree</span>
        <input name="lat" type="number" step="any" value="${data.lat ?? ''}" />
      </label>
      <label>Longitude
        <input name="lng" type="number" step="any" value="${data.lng ?? ''}" />
      </label>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-outline" data-use-location>📍 Use my current location</button>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Add plant'}</button>
      ${existing ? '<button type="button" class="btn" data-cancel>Cancel</button>' : ''}
    </div>
  `;

  card.appendChild(form);

  const useLocationBtn = form.querySelector<HTMLButtonElement>('[data-use-location]')!;
  useLocationBtn.onclick = async () => {
    useLocationBtn.textContent = 'Getting location…';
    try {
      const pos = await getCurrentPosition();
      (form.elements.namedItem('lat') as HTMLInputElement).value = String(pos.lat);
      (form.elements.namedItem('lng') as HTMLInputElement).value = String(pos.lng);
    } catch (e) {
      alert('Could not get location: ' + (e as Error).message);
    } finally {
      useLocationBtn.textContent = '📍 Use my current location';
    }
  };

  const cancelBtn = form.querySelector<HTMLButtonElement>('[data-cancel]');
  if (cancelBtn) cancelBtn.onclick = () => navigate(existing ? `/plant/${existing.id}` : '/list');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload: NewPlant = {
      label: String(fd.get('label') ?? ''),
      plantType: fd.get('plantType') as PlantType,
      species: String(fd.get('species') ?? ''),
      variety: String(fd.get('variety') ?? ''),
      stockType: fd.get('stockType') as StockType,
      graftStatus: fd.get('graftStatus') as GraftStatus,
      scionVariety: String(fd.get('scionVariety') ?? ''),
      plannedGraftVariety: String(fd.get('plannedGraftVariety') ?? ''),
      status: fd.get('status') as PlantingStatus,
      yearPlanted: fd.get('yearPlanted') ? Number(fd.get('yearPlanted')) : null,
      rowLabel: String(fd.get('rowLabel') ?? ''),
      lat: fd.get('lat') ? Number(fd.get('lat')) : null,
      lng: fd.get('lng') ? Number(fd.get('lng')) : null,
      createdBy: existing?.createdBy ?? getAuthState().user?.email ?? 'unknown'
    };

    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitBtn.disabled = true;
    try {
      if (existing) {
        await updatePlant(existing.id, payload);
        navigate(`/plant/${existing.id}`);
      } else {
        const id = await createPlant(payload);
        navigate(`/plant/${id}`);
      }
    } catch (err) {
      alert('Could not save: ' + (err as Error).message);
      submitBtn.disabled = false;
    }
  });
}

function selectOptions<T extends string>(labels: Record<T, string>, selected: T): string {
  return Object.entries(labels)
    .map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`)
    .join('');
}

function attr(value: string): string {
  return value.replace(/"/g, '&quot;');
}
