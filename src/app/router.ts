import type { Route } from "../domain/types";

export function parseRoute(hash: string): Route {
  return hash === "#garden" ? "garden" : "focus";
}

export function normalizeRoute(location: Location): Route {
  const route = parseRoute(location.hash);
  const canonicalHash = `#${route}`;

  if (location.hash !== canonicalHash) {
    location.replace(canonicalHash);
  }

  return route;
}

export function watchRoute(
  windowTarget: Window,
  onRoute: (route: Route) => void,
): () => void {
  const handleRoute = (): void => {
    onRoute(normalizeRoute(windowTarget.location));
  };

  windowTarget.addEventListener("hashchange", handleRoute);
  handleRoute();

  return () => {
    windowTarget.removeEventListener("hashchange", handleRoute);
  };
}
