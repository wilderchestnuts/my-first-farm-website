import { subscribePlants } from '../db/plants';
import { PLANT_TYPE_LABELS, STOCK_TYPE_LABELS, GRAFT_STATUS_LABELS } from '../types';
import type { Plant } from '../types';
import type { Cleanup } from '../router';
import { navigate } from '../router';

export function renderListView(container: HTMLElement): Cleanup {
  container.innerHTML = '';

  const searchBar = document.createElement('div');
  searchBar.className = 'search-bar';
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search by label, variety, row, species…';
  searchBar.appendChild(input);
  container.appendChild(searchBar);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'card';
  container.appendChild(tableWrap);

  let allPlants: Plant[] = [];

  function renderTable() {
    const term = input.value.trim().toLowerCase();
    const plants = term
      ? allPlants.filter((p) =>
          [p.label, p.variety, p.species, p.rowLabel]
            .join(' ')
            .toLowerCase()
            .includes(term)
        )
      : allPlants;

    if (plants.length === 0) {
      tableWrap.innerHTML = '<p class="empty-state">No plants yet. Use “Add plant” to get started.</p>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Row / label</th>
          <th>Type</th>
          <th>Variety</th>
          <th>Stock</th>
          <th>Graft status</th>
          <th>Year planted</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    for (const p of plants) {
      const tr = document.createElement('tr');
      tr.className = 'plant-row';
      tr.innerHTML = `
        <td>${escapeHtml(p.rowLabel || p.label || '—')}</td>
        <td>${PLANT_TYPE_LABELS[p.plantType]}</td>
        <td>${escapeHtml(p.variety || '—')}</td>
        <td>${STOCK_TYPE_LABELS[p.stockType]}</td>
        <td>${GRAFT_STATUS_LABELS[p.graftStatus]}</td>
        <td>${p.yearPlanted ?? '—'}</td>
      `;
      tr.onclick = () => navigate(`/plant/${p.id}`);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.innerHTML = '';
    tableWrap.appendChild(table);
  }

  input.addEventListener('input', renderTable);

  const unsubscribe = subscribePlants((plants) => {
    allPlants = plants;
    renderTable();
  });

  return unsubscribe;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
