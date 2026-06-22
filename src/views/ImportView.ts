import { parseCsv, toCsv } from '../csv';
import { bulkImportPlants, type ImportRow } from '../db/plants';
import { getAuthState } from '../auth';
import { navigate } from '../router';
import type { Cleanup } from '../router';
import type { GraftStatus, NewPlant, PlantType, PlantingStatus, StockType } from '../types';

const TEMPLATE_HEADERS = [
  'label',
  'rowLabel',
  'plantType',
  'species',
  'variety',
  'stockType',
  'graftStatus',
  'scionVariety',
  'plannedGraftVariety',
  'status',
  'yearPlanted',
  'lat',
  'lng',
  'note'
];

const TEMPLATE_EXAMPLE = [
  'R3-12',
  'Row 3, position 12',
  'chestnut',
  'Castanea sativa x crenata',
  'Colossal',
  'grafted',
  'grafted',
  'Marrone di Chiusa Pesio',
  '',
  'planted',
  '2023',
  '',
  '',
  'Imported from field sheet'
];

const PLANT_TYPES: PlantType[] = ['chestnut', 'understory', 'companion', 'other'];
const STOCK_TYPES: StockType[] = ['seedling', 'grafted', 'tissue_culture', 'unknown'];
const GRAFT_STATUSES: GraftStatus[] = [
  'not_applicable',
  'not_grafted',
  'planned',
  'grafted',
  'failed_regraft_needed'
];
const PLANTING_STATUSES: PlantingStatus[] = ['planted', 'planned'];

export function renderImportView(container: HTMLElement): Cleanup {
  container.innerHTML = `
    <div class="card">
      <h2>Import plants from a spreadsheet</h2>
      <p>Export your Google Sheet as CSV with these column headers (any order, extra columns are ignored):</p>
      <p class="hint">${TEMPLATE_HEADERS.join(', ')}</p>
      <button class="btn btn-outline" data-download-template>Download CSV template</button>
    </div>

    <div class="card">
      <label>Paste CSV here, or choose a file
        <input type="file" accept=".csv,text/csv" data-csv-file />
      </label>
      <textarea data-csv-text rows="8" placeholder="label,rowLabel,plantType,..."></textarea>
      <div class="form-actions">
        <button class="btn btn-primary" data-parse>Preview import</button>
      </div>
    </div>

    <div data-preview></div>
  `;

  container.querySelector<HTMLButtonElement>('[data-download-template]')!.onclick = () => {
    downloadCsv('farmmap-import-template.csv', toCsv(TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE]));
  };

  const fileInput = container.querySelector<HTMLInputElement>('[data-csv-file]')!;
  const textArea = container.querySelector<HTMLTextAreaElement>('[data-csv-text]')!;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (file) textArea.value = await file.text();
  });

  const previewEl = container.querySelector('[data-preview]') as HTMLElement;
  container.querySelector<HTMLButtonElement>('[data-parse]')!.onclick = () => {
    try {
      const rows = parseCsv(textArea.value);
      if (rows.length < 2) {
        previewEl.innerHTML = '<p class="empty-state">No data rows found.</p>';
        return;
      }
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const dataRows = rows.slice(1);
      const parsed = dataRows.map((r) => parseRow(headers, r));
      renderPreview(previewEl, parsed);
    } catch (e) {
      previewEl.innerHTML = `<p class="empty-state">Could not parse CSV: ${(e as Error).message}</p>`;
    }
  };

  return () => {};
}

interface ParsedRow {
  plant: NewPlant;
  initialNote: string;
  warnings: string[];
}

function parseRow(headers: string[], values: string[]): ParsedRow {
  const get = (name: string): string => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? (values[idx] ?? '').trim() : '';
  };
  const warnings: string[] = [];

  const plantType = normalizeEnum(get('planttype'), PLANT_TYPES, 'chestnut', 'plantType', warnings);
  const stockType = normalizeEnum(get('stocktype'), STOCK_TYPES, 'unknown', 'stockType', warnings);
  const graftStatus = normalizeEnum(
    get('graftstatus'),
    GRAFT_STATUSES,
    'not_grafted',
    'graftStatus',
    warnings
  );
  const status = normalizeEnum(get('status'), PLANTING_STATUSES, 'planted', 'status', warnings);

  const yearRaw = get('yearplanted');
  const year = yearRaw ? Number(yearRaw) : null;
  if (yearRaw && Number.isNaN(year)) warnings.push(`Invalid yearPlanted "${yearRaw}"`);

  const latRaw = get('lat');
  const lngRaw = get('lng');
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;

  return {
    plant: {
      label: get('label'),
      rowLabel: get('rowlabel'),
      plantType,
      species: get('species'),
      variety: get('variety'),
      stockType,
      graftStatus,
      scionVariety: get('scionvariety'),
      plannedGraftVariety: get('plannedgraftvariety'),
      status,
      yearPlanted: year && !Number.isNaN(year) ? year : null,
      lat: lat != null && !Number.isNaN(lat) ? lat : null,
      lng: lng != null && !Number.isNaN(lng) ? lng : null,
      createdBy: ''
    },
    initialNote: get('note'),
    warnings
  };
}

function normalizeEnum<T extends string>(
  value: string,
  allowed: T[],
  fallback: T,
  fieldName: string,
  warnings: string[]
): T {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  const found = allowed.find((a) => a === normalized);
  if (!found) {
    warnings.push(`Unrecognized ${fieldName} "${value}", defaulted to "${fallback}"`);
    return fallback;
  }
  return found;
}

function renderPreview(container: HTMLElement, rows: ParsedRow[]) {
  const warningCount = rows.reduce((n, r) => n + r.warnings.length, 0);
  container.innerHTML = `
    <div class="card">
      <h3>Preview: ${rows.length} plant${rows.length === 1 ? '' : 's'}</h3>
      ${warningCount ? `<p class="hint">${warningCount} value(s) defaulted — review before confirming.</p>` : ''}
      <table>
        <thead><tr><th>Label</th><th>Row</th><th>Type</th><th>Variety</th><th>Warnings</th></tr></thead>
        <tbody>
          ${rows
            .slice(0, 50)
            .map(
              (r) => `<tr>
                <td>${escapeHtml(r.plant.label || '—')}</td>
                <td>${escapeHtml(r.plant.rowLabel || '—')}</td>
                <td>${r.plant.plantType}</td>
                <td>${escapeHtml(r.plant.variety || '—')}</td>
                <td>${r.warnings.length ? escapeHtml(r.warnings.join('; ')) : ''}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
      ${rows.length > 50 ? `<p class="hint">…and ${rows.length - 50} more</p>` : ''}
      <div class="form-actions">
        <button class="btn btn-primary" data-confirm-import>Import ${rows.length} plant${rows.length === 1 ? '' : 's'}</button>
      </div>
    </div>
  `;

  container.querySelector<HTMLButtonElement>('[data-confirm-import]')!.onclick = async (e) => {
    const btn = e.target as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Importing…';
    const author = getAuthState().user?.email ?? 'unknown';
    const importRows: ImportRow[] = rows.map((r) => ({
      plant: r.plant,
      initialNote: r.initialNote || undefined
    }));
    try {
      await bulkImportPlants(importRows, author);
      navigate('/list');
    } catch (err) {
      alert('Import failed: ' + (err as Error).message);
      btn.disabled = false;
      btn.textContent = `Import ${rows.length} plants`;
    }
  };
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
