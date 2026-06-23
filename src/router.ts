export type Cleanup = () => void;
export type RouteHandler = (
  container: HTMLElement,
  params: Record<string, string>
) => Cleanup | void;

interface Route {
  segments: string[];
  handler: RouteHandler;
}

const routes: Route[] = [];
let activeCleanup: Cleanup | void;
let container: HTMLElement;

export function registerRoute(path: string, handler: RouteHandler) {
  routes.push({ segments: path.split('/').filter(Boolean), handler });
}

function matchRoute(path: string): { handler: RouteHandler; params: Record<string, string> } | null {
  const pathSegments = path.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.segments.length !== pathSegments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < route.segments.length; i++) {
      const seg = route.segments[i];
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = decodeURIComponent(pathSegments[i]);
      } else if (seg !== pathSegments[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: route.handler, params };
  }
  return null;
}

function renderCurrentRoute() {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = undefined;
  }
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const match = matchRoute(hash);
  container.innerHTML = '';
  if (!match) {
    container.innerHTML = '<p class="empty-state">Page not found.</p>';
    return;
  }
  activeCleanup = match.handler(container, match.params) ?? undefined;
}

export function startRouter(rootContainer: HTMLElement) {
  container = rootContainer;
  window.addEventListener('hashchange', renderCurrentRoute);
  renderCurrentRoute();
}

export function navigate(path: string) {
  window.location.hash = path;
}
