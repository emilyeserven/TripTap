import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

import { usePwaStore } from "@/stores/pwaStore";

const HOUR = 60 * 60 * 1000;
/** Minimum gap between automatic checks triggered by the tab becoming visible. */
const MIN_CHECK_GAP = 5 * 60 * 1000;

/**
 * Registers the service worker and wires update state into {@link usePwaStore}. Called once from
 * `main.tsx`, production builds only — dev has no service worker, so the store keeps its inert
 * defaults there.
 */
export function registerPwa() {
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
      usePwaStore.getState().setNeedRefresh(true);
      // The sidebar is hidden in focus/slide modes, so also surface the update as a toast.
      toast("A new version of TripTap is available", {
        id: "pwa-update",
        duration: Infinity,
        action: {
          label: "Update",
          onClick: applyUpdate,
        },
      });
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
