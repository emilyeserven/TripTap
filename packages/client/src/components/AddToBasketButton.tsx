import type { BasketItem } from "@/stores/basketStore";

import { Check, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { basketKey, useBasketStore } from "@/stores/basketStore";

/** Short human label for a toast, per kind. */
const KIND_LABEL: Record<BasketItem["kind"], string> = {
  sentence: "Sentence",
  vocab: "Vocab",
  grammar: "Grammar",
};

/**
 * A small ghost icon button that toggles one item's membership in the basket (the bottom-right
 * scratchpad). Reads the store directly, so it can be dropped into any card without prop-drilling.
 * Shows a basket icon when the item is absent and a check when it's in; calls `stopPropagation` so it
 * behaves inside tap-to-flip / accordion cards. Mirrors the app's other `size="icon"` card actions.
 */
export function AddToBasketButton({
  item,
  className,
}: {
  item: BasketItem;
  className?: string;
}) {
  const items = useBasketStore(s => s.items);
  const add = useBasketStore(s => s.add);
  const remove = useBasketStore(s => s.remove);

  const key = basketKey(item.kind, item.id);
  const inBasket = items.some(i => basketKey(i.kind, i.id) === key);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inBasket) {
      remove(key);
      toast(`${KIND_LABEL[item.kind]} removed from basket`);
    }
    else {
      add(item);
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
      onClick={toggle}
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
