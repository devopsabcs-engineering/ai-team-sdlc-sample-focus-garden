import { registerSW } from "virtual:pwa-register";

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

interface PwaState {
  offlineReady: boolean;
  online: boolean;
  registrationFailed: boolean;
  updateAvailable: boolean;
  updating: boolean;
}

interface RegisterOptions {
  readonly immediate: boolean;
  readonly onNeedRefresh: () => void;
  readonly onOfflineReady: () => void;
  readonly onRegisterError: (error: unknown) => void;
}

type RegisterServiceWorker = (options: RegisterOptions) => UpdateServiceWorker;

function createButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "button button--primary";
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

export function startPwa(
  root: HTMLElement,
  register: RegisterServiceWorker = registerSW,
): () => void {
  const state: PwaState = {
    offlineReady:
      "serviceWorker" in navigator &&
      navigator.serviceWorker.controller !== undefined &&
      navigator.serviceWorker.controller !== null,
    online: navigator.onLine,
    registrationFailed: false,
    updateAvailable: false,
    updating: false,
  };
  let updateServiceWorker: UpdateServiceWorker | null = null;

  const render = (): void => {
    const region = root.querySelector<HTMLElement>(".pwa-region");
    if (region === null) return;
    region.replaceChildren();

    const content = document.createElement("div");
    content.className = "pwa-region__content";
    const message = document.createElement("span");

    if (state.updateAvailable) {
      message.textContent = state.updating
        ? "Updating Focus Garden…"
        : "Update available";
      content.append(message);
      if (!state.updating) {
        content.append(
          createButton("Update now", () => {
            if (updateServiceWorker === null) return;
            state.updating = true;
            render();
            void updateServiceWorker(true).catch(() => {
              state.updating = false;
              state.registrationFailed = true;
              state.updateAvailable = false;
              console.error("PWA_UPDATE_FAILED");
              render();
            });
          }),
        );
      }
    } else if (!state.online) {
      message.textContent = state.offlineReady
        ? "Offline — Focus Garden is ready to use."
        : "You’re offline. Offline use isn’t ready on this device yet.";
      content.append(message);
    } else if (state.registrationFailed) {
      message.textContent =
        "Offline setup is unavailable. Focus Garden still works while you’re online.";
      content.append(message);
    } else if (state.offlineReady) {
      message.textContent = "Offline ready";
      content.append(message);
    }

    if (content.hasChildNodes()) region.append(content);
  };

  const onOnline = (): void => {
    state.online = true;
    render();
  };
  const onOffline = (): void => {
    state.online = false;
    render();
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  const observer = new MutationObserver(render);
  observer.observe(root, { childList: true });

  if ("serviceWorker" in navigator) {
    try {
      updateServiceWorker = register({
        immediate: true,
        onNeedRefresh: () => {
          state.updateAvailable = true;
          render();
        },
        onOfflineReady: () => {
          state.offlineReady = true;
          render();
        },
        onRegisterError: () => {
          state.registrationFailed = true;
          console.error("PWA_REGISTRATION_FAILED");
          render();
        },
      });
    } catch {
      state.registrationFailed = true;
      console.error("PWA_REGISTRATION_FAILED");
    }
  } else {
    state.registrationFailed = true;
  }
  render();

  return () => {
    observer.disconnect();
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
