import type { BasketItem } from "@/stores/basketStore";

import { Check, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBasketToggle } from "@/hooks/useBasket";
import { cn } from "@/lib/utils";

/** Short human label for a toast, per kind. */
const KIND_LABEL: Record<BasketItem["kind"], string> = {
  "sentence": "Sentence",
  "vocab": "Vocab",
  "lesson-vocab": "Vocab",
  "grammar": "Grammar",
  "grammar-note": "Grammar note",
  "resource": "Resource",
};

/**
 * A small ghost icon button that toggles one item's membership in the basket (the bottom-right
 * scratchpad). Reads the basket directly, so it can be dropped into any card without prop-drilling.
 * Shows a basket icon when the item is absent and a check when it's in; calls `stopPropagation` so it
 * behaves inside tap-to-flip / accordion cards. Mirrors the app's other `size="icon"` card actions.
 *
 * This is the app's *only* collect-this affordance — the parallel "favorite"/"star" buttons were folded
 * into it. For the kinds that used to be starred the toggle writes through to the same durable field
 * the star wrote to, so a basketed item still survives a reload and still ranks in Start Something;
 * see `useBasketToggle`.
 */
export function AddToBasketButton({
  item,
  className,
}: {
  item: BasketItem;
  className?: string;
}) {
  const {
    inBasket, toggle, pending,
  } = useBasketToggle(item);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
    if (inBasket) {
      toast(`${KIND_LABEL[item.kind]} removed from basket`);
    }
    else {
      toast.success(`${KIND_LABEL[item.kind]} added to basket`);
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("size-6 shrink-0", inBasket && "text-primary", className)}
      aria-label={inBasket ? "Remove from basket" : "Add to basket"}
      aria-pressed={inBasket}
      title={inBasket ? "Remove from basket" : "Add to basket"}
      disabled={pending}
      onClick={onClick}
    >
      {inBasket
        ? <Check className="size-4" />
        : (
          <ShoppingBasket
            className="size-4"
          />
        )}
    </Button>
  );
}
