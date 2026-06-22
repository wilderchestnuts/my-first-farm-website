import './style.css';
import { onAuthChange } from './auth';
import { renderShell } from './views/shell';
import { renderLogin } from './views/login';
import { startRouter, registerRoute } from './router';
import { renderMapView } from './views/MapView';
import { renderListView } from './views/ListView';
import { renderPlantForm } from './views/PlantFormView';
import { renderPlantDetail } from './views/PlantDetailView';
import { renderImportView } from './views/ImportView';

registerRoute('/map', renderMapView);
registerRoute('/list', renderListView);
registerRoute('/add', (container) => renderPlantForm(container, {}));
registerRoute('/plant/:id', renderPlantDetail);
registerRoute('/plant/:id/edit', (container, params) =>
  renderPlantForm(container, { plantId: params.id })
);
registerRoute('/import', renderImportView);

const root = document.getElementById('app')!;
let routerStarted = false;

onAuthChange((state) => {
  if (state.loading) {
    root.innerHTML = 'Loading&hellip;';
    return;
  }
  if (!state.user || !state.authorized) {
    routerStarted = false;
    renderLogin(root, state);
    return;
  }
  if (!routerStarted) {
    const main = renderShell(root, state.user);
    startRouter(main);
    routerStarted = true;
    if (!window.location.hash) window.location.hash = '#/map';
  }
  // Ignore subsequent auth events (e.g. token refresh) while already
  // authorized — re-rendering the shell would detach the router's container.
});
