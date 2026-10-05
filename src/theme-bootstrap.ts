import { bootstrapTheme } from "./app/theme";
import { createLocalStateRepository } from "./data/local-repository";

export const now = () => new Date().toISOString();
export const repository = createLocalStateRepository(
  () => window.localStorage,
  now,
);
export const loaded = repository.load();
export const initialTheme = bootstrapTheme(
  window,
  document.documentElement,
  loaded,
);
