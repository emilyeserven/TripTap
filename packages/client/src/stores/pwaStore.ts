import { toast } from "sonner";
import { create } from "zustand";

/**
 * Service-worker update state feeding the sidebar's "Check for updates" control and the update
 * toast. The action slots are wired by `lib/registerPwa.ts` once the service worker registers —
 * before that (and always in dev, where no service worker exists) they are inert defaults.
 */
interface PwaState {
  /** True when a new service worker is installed and waiting to activate. */
  needRefresh: boolean;
  /** True while a manual update check is in flight. */
  checking: boolean;
  /** Asks the registered service worker to check for a new version. */
  checkForUpdate: () => void;
  /** Activates the waiting service worker and reloads the page. */
  applyUpdate: () => void;
  setNeedRefresh: (needRefresh: boolean) => void;
  setChecking: (checking: boolean) => void;
  setCheckForUpdate: (checkForUpdate: () => void) => void;
  setApplyUpdate: (applyUpdate: () => void) => void;
}

export const usePwaStore = create<PwaState>(set => ({
  needRefresh: false,
  checking: false,
  checkForUpdate: () => {
    toast("Update checks aren't available right now");
  },
  applyUpdate: () => undefined,
  setNeedRefresh: needRefresh => set({
    needRefresh,
  }),
  setChecking: checking => set({
    checking,
  }),
  setCheckForUpdate: checkForUpdate => set({
    checkForUpdate,
  }),
  setApplyUpdate: applyUpdate => set({
    applyUpdate,
  }),
}));
