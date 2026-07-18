import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

import { fetchDeployedEntry, getLoadedEntry } from "@/lib/appVersion";
import { usePwaStore } from "@/stores/pwaStore";

const HOUR = 60 * 60 * 1000;
/** Minimum gap between automatic checks triggered by the tab becoming visible. */
const MIN_CHECK_GAP = 5 * 60 * 1000;

/** Shows the persistent "new version" toast whose action reloads onto the fresh build. */
function announceUpdate(onUpdate: () => void) {
  usePwaStore.getState().setNeedRefresh(true);
  // The sidebar is hidden in focus/slide modes, so also surface the update as a toast.
  toast("A new version of TripTap is available", {
    id: "pwa-update",
    duration: Infinity,
    action: {
      label: "Update",
      onClick: onUpdate,
    },
  });
}

/**
 * Fallback for origins where no service worker can register — plain-HTTP LAN/Tailscale hosts, where
 * `window.isSecureContext` is false. Detects a new deployment by comparing the entry bundle this app
 * booted from against the one the server currently serves, and reloads to pick it up (there is no SW
 * cache to bust). Feeds the same {@link usePwaStore} contract as the service-worker path.
 */
function wireVersionPoll() {
  const loaded = getLoadedEntry();
  let lastCheck = Date.now();

  const detect = async () => {
    const deployed = await fetchDeployedEntry();
    if (deployed && loaded && deployed !== loaded) {
      announceUpdate(() => window.location.reload());
      return true;
    }
    return false;
  };

  setInterval(() => {
    lastCheck = Date.now();
    void detect().catch(() => undefined);
  }, HOUR);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastCheck > MIN_CHECK_GAP) {
      lastCheck = Date.now();
      void detect().catch(() => undefined);
    }
  });

  const {
    setChecking, setCheckForUpdate, setApplyUpdate,
  } = usePwaStore.getState();
  setApplyUpdate(() => window.location.reload());
  setCheckForUpdate(() => {
    if (usePwaStore.getState().checking) {
      return;
    }
    setChecking(true);
    lastCheck = Date.now();
    detect()
      .then((found) => {
        if (!found && !usePwaStore.getState().needRefresh) {
          toast("You're up to date");
        }
      })
      .catch(() => {
        toast.error("Couldn't check for updates");
      })
      .finally(() => {
        setChecking(false);
      });
  });
}

/**
 * Registers the service worker and wires update state into {@link usePwaStore}. Called once from
 * `main.tsx`, production builds only — dev has no service worker, so the store keeps its inert
 * defaults there.
 */
export function registerPwa() {
  // Service workers only register in a secure context (HTTPS or localhost). On the plain-HTTP LAN
  // origins TripTap is self-hosted on there is no SW at all, so fall back to a version poll that
  // reloads onto a new build — no service worker required.
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    wireVersionPoll();
    return;
  }

  // The plugin's prompt-mode register module only reloads when workbox-window flags the incoming
  // worker as its own update — a worker discovered via a manual `registration.update()` counts as
  // "external" and skips that reload, so reload ourselves once the new worker takes control.
  const applyUpdate = () => {
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      {
        once: true,
      },
    );
    void updateServiceWorker(true);
  };
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      announceUpdate(applyUpdate);
    },
    onRegisterError() {
      // Registration failed in a secure context (bad MIME/scope, etc.); degrade to the poll so the
      // button still works instead of leaving the store's inert default in place.
      wireVersionPoll();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) {
        return;
      }
      let lastCheck = Date.now();
      const check = () => {
        lastCheck = Date.now();
        registration.update().catch(() => undefined);
      };
      setInterval(check, HOUR);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - lastCheck > MIN_CHECK_GAP) {
          check();
        }
      });

      const {
        setChecking, setCheckForUpdate,
      } = usePwaStore.getState();
      setCheckForUpdate(() => {
        if (usePwaStore.getState().checking) {
          return;
        }
        setChecking(true);
        lastCheck = Date.now();
        registration
          .update()
          .then(() => {
            // onNeedRefresh fires (possibly slightly later) when a new worker installs; only
            // report "up to date" when nothing new is installing or waiting.
            if (
              !registration.installing
              && !registration.waiting
              && !usePwaStore.getState().needRefresh
            ) {
              toast("You're up to date");
            }
          })
          .catch(() => {
            toast.error("Couldn't check for updates");
          })
          .finally(() => {
            setChecking(false);
          });
      });
    },
  });
  usePwaStore.getState().setApplyUpdate(applyUpdate);
}
