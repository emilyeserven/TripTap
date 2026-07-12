import { Toaster as SonnerToaster } from "sonner";

/** App toast host. Rendered once near the root; call `toast()` from anywhere. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
    />
  );
}
