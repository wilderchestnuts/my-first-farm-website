import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { subscribePlants } from '../db/plants';
import { subscribeMapConfig, saveMapConfig } from '../db/mapConfig';
import { clearWatch, watchPosition } from '../geo';
import { navigate } from '../router';
import type { Cleanup } from '../router';
import type { MapOverlayConfig, Plant } from '../types';

// Newberg, Oregon — placeholder center until the real farm map is calibrated.
const DEFAULT_CENTER: [number, number] = [45.2975, -122.9734];
const DEFAULT_ZOOM = 18;

export function renderMapView(container: HTMLElement): Cleanup {
  container.innerHTML = `
    <div class="map-toolbar">
      <button class="btn btn-outline" data-locate>📍 Show my position</button>
      <button class="btn btn-outline" data-calibrate>🗺️ Set up field map image</button>
    </div>
    <div id="map-canvas"></div>
    <p id="no-gps-banner" class="hint"></p>
    <div id="calibrate-panel"></div>
  `;

  const map = L.map(container.querySelector('#map-canvas') as HTMLElement).setView(
    DEFAULT_CENTER,
    DEFAULT_ZOOM
  );
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Imagery © Esri', maxZoom: 20 }
  ).addTo(map);

  let overlayLayer: L.ImageOverlay | null = null;
  let markers: L.Marker[] = [];
  let locateWatchId: number | null = null;
  let liveMarker: L.Marker | null = null;
  let hasCenteredOnFarm = false;

  const noGpsBanner = container.querySelector('#no-gps-banner') as HTMLElement;

  const unsubPlants = subscribePlants((plants) => {
    markers.forEach((m) => m.remove());
    markers = [];
    const withGps = plants.filter((p) => p.lat != null && p.lng != null);
    const withoutGps = plants.length - withGps.length;

    for (const p of withGps) {
      const marker = L.marker([p.lat as number, p.lng as number], {
        icon: plantIcon(p)
      }).addTo(map);
      marker.bindPopup(popupHtml(p));
      marker.on('popupopen', () => {
        const link = document.getElementById(`view-plant-${p.id}`);
        if (link) link.onclick = () => navigate(`/plant/${p.id}`);
      });
      markers.push(marker);
    }

    noGpsBanner.textContent = withoutGps
      ? `${withoutGps} plant${withoutGps === 1 ? '' : 's'} don't have GPS recorded yet — stamp their location from the plant's edit page once you've walked to them.`
      : '';

    if (!hasCenteredOnFarm && withGps.length > 0) {
      const bounds = L.latLngBounds(withGps.map((p) => [p.lat as number, p.lng as number]));
      map.fitBounds(bounds.pad(0.3));
      hasCenteredOnFarm = true;
    }
  });

  const unsubConfig = subscribeMapConfig((config) => {
    if (overlayLayer) {
      overlayLayer.remove();
      overlayLayer = null;
    }
    if (config) {
      overlayLayer = L.imageOverlay(
        config.imageUrl,
        [
          [config.south, config.west],
          [config.north, config.east]
        ],
        { opacity: config.opacity }
      ).addTo(map);
      if (!hasCenteredOnFarm) {
        map.fitBounds(overlayLayer.getBounds());
        hasCenteredOnFarm = true;
      }
    }
    renderCalibratePanel(config);
  });

  const locateBtn = container.querySelector<HTMLButtonElement>('[data-locate]')!;
  locateBtn.onclick = () => {
    if (locateWatchId !== null) {
      clearWatch(locateWatchId);
      locateWatchId = null;
      liveMarker?.remove();
      liveMarker = null;
      locateBtn.textContent = '📍 Show my position';
      return;
    }
    locateBtn.textContent = 'Locating…';
    locateWatchId = watchPosition(
      (pos) => {
        locateBtn.textContent = '📍 Stop showing position';
        if (!liveMarker) {
          liveMarker = L.marker([pos.lat, pos.lng], { icon: youAreHereIcon() }).addTo(map);
          map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 18));
        } else {
          liveMarker.setLatLng([pos.lat, pos.lng]);
        }
      },
      (message) => {
        alert('Location error: ' + message);
        locateBtn.textContent = '📍 Show my position';
        locateWatchId = null;
      }
    );
  };

  const calibrateBtn = container.querySelector<HTMLButtonElement>('[data-calibrate]')!;
  const calibratePanel = container.querySelector('#calibrate-panel') as HTMLElement;
  calibrateBtn.onclick = () => {
    calibratePanel.classList.toggle('open');
    calibratePanel.style.display = calibratePanel.style.display === 'block' ? 'none' : 'block';
  };

  let lastConfig: MapOverlayConfig | null = null;
  function renderCalibratePanel(config: MapOverlayConfig | null) {
    lastConfig = config;
    calibratePanel.style.display = calibratePanel.style.display || 'none';
    calibratePanel.innerHTML = `
      <div class="card">
        <h3>Field map image</h3>
        <p class="hint">Paste a URL to your scanned drawing or aerial photo, then set the GPS
        coordinates of its corners (e.g. by right-clicking the corner in Google Maps and
        copying the coordinates). Approximate is fine to start.</p>
        <form class="plant-form" data-calibrate-form>
          <label>Image URL
            <input name="imageUrl" type="text" value="${config?.imageUrl ?? ''}" placeholder="https://… or /farm-map.jpg" />
          </label>
          <div class="row">
            <label>North (top) latitude<input name="north" type="number" step="any" value="${config?.north ?? ''}" /></label>
            <label>South (bottom) latitude<input name="south" type="number" step="any" value="${config?.south ?? ''}" /></label>
          </div>
          <div class="row">
            <label>West (left) longitude<input name="west" type="number" step="any" value="${config?.west ?? ''}" /></label>
            <label>East (right) longitude<input name="east" type="number" step="any" value="${config?.east ?? ''}" /></label>
          </div>
          <label>Opacity
            <input name="opacity" type="range" min="0.1" max="1" step="0.05" value="${config?.opacity ?? 0.85}" />
          </label>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save map image</button>
          </div>
        </form>
      </div>
    `;
    const form = calibratePanel.querySelector<HTMLFormElement>('[data-calibrate-form]')!;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      await saveMapConfig({
        imageUrl: String(fd.get('imageUrl')),
        north: Number(fd.get('north')),
        south: Number(fd.get('south')),
        east: Number(fd.get('east')),
        west: Number(fd.get('west')),
        opacity: Number(fd.get('opacity'))
      });
    });
  }
  renderCalibratePanel(lastConfig);

  return () => {
    unsubPlants();
    unsubConfig();
    clearWatch(locateWatchId);
    map.remove();
  };
}

function plantIcon(p: Plant): L.DivIcon {
  const color = markerColor(p);
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function youAreHereIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid white;box-shadow:0 0 6px rgba(26,115,232,0.8);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

function markerColor(p: Plant): string {
  if (p.status === 'planned') return '#999999';
  switch (p.graftStatus) {
    case 'grafted':
      return '#2f4f2f';
    case 'planned':
      return '#d4ad36';
    case 'failed_regraft_needed':
      return '#a33b2b';
    default:
      return '#4a7a4a';
  }
}

function popupHtml(p: Plant): string {
  const title = escapeHtml(p.label || p.rowLabel || 'Unnamed plant');
  return `<strong>${title}</strong><br/>${escapeHtml(p.variety || '')}<br/><a href="#" id="view-plant-${p.id}">View details</a>`;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
