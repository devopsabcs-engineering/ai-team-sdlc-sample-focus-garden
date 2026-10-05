import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";

import { AppController } from "./app/app-controller";
import { normalizeRoute, watchRoute } from "./app/router";
import { cryptoIdSource, systemClock } from "./app/runtime";
import { cryptoRandomSource, gentleChime, stateLock } from "./app/effects";
import { browserDataExporter } from "./app/data-effects";
import { initialTheme, loaded, now, repository } from "./theme-bootstrap";
import { startPwa } from "./pwa/register";

const root = document.querySelector<HTMLElement>("#app");
if (root === null) throw new Error("App root is missing.");

const controller = new AppController({
  root,
  documentElement: document.documentElement,
  route: normalizeRoute(window.location),
  theme: initialTheme,
  repository,
  loaded,
  now,
  clock: systemClock,
  ids: cryptoIdSource,
  random: cryptoRandomSource,
  lock: stateLock,
  audio: gentleChime,
  exporter: browserDataExporter,
});

watchRoute(window, (route) => {
  controller.navigate(route);
});

startPwa(root);
