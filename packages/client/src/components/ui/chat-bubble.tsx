import type { VariantProps } from "class-variance-authority";

import * as React from "react";

import { cva } from "class-variance-authority";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Chat-bubble primitives, in the shape of the `shadcn-chat` registry (`ChatMessageList` /
 * `ChatBubble` / `ChatBubbleAvatar` / `ChatBubbleMessage`) but written against this project's
 * conventions — `cva` variants, `data-slot` attributes, plain function components, no forwardRef.
 *
 * `sent` is the viewer's own side and lays out right-to-left; `received` is everyone else.
 */

const chatBubbleVariants = cva("flex items-end gap-2", {
  variants: {
    variant: {
      received: "flex-row self-start",
      sent: "flex-row-reverse self-end",
    },
  },
  defaultVariants: {
    variant: "received",
  },
});

const chatBubbleMessageVariants = cva(
  `
    max-w-prose rounded-2xl px-3.5 py-2 text-sm wrap-break-word
    whitespace-pre-wrap
  `,
  {
    variants: {
      variant: {
        received: "rounded-bl-sm bg-muted text-foreground",
        sent: "rounded-br-sm bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "received",
    },
  },
);

/** The scrolling column a conversation's bubbles stack in. */
function ChatMessageList({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-message-list"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

/** One message row: avatar plus message, mirrored for the `sent` side. */
function ChatBubble({
  className,
  variant = "received",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof chatBubbleVariants>) {
  return (
    <div
      data-slot="chat-bubble"
      data-variant={variant}
      className={cn(chatBubbleVariants({
        variant,
      }), className)}
      {...props}
    />
  );
}

/** The speaker's avatar. `fallback` is the initial(s) shown when there's no image. */
function ChatBubbleAvatar({
  className,
  fallback,
  fallbackClassName,
  ...props
}: React.ComponentProps<typeof Avatar> & {
  fallback: React.ReactNode;
  fallbackClassName?: string;
}) {
  return (
    <Avatar
      data-slot="chat-bubble-avatar"
      className={cn("size-8 shrink-0", className)}
      {...props}
    >
      <AvatarFallback className={fallbackClassName}>{fallback}</AvatarFallback>
    </Avatar>
  );
}

/** The bubble itself. */
function ChatBubbleMessage({
  className,
  variant = "received",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof chatBubbleMessageVariants>) {
  return (
    <div
      data-slot="chat-bubble-message"
      data-variant={variant}
      className={cn(chatBubbleMessageVariants({
        variant,
      }), className)}
      {...props}
    />
  );
}

/** A small line above/below a bubble — the speaker's name, a timestamp, a translation. */
function ChatBubbleCaption({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="chat-bubble-caption"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleCaption,
  ChatBubbleMessage,
  chatBubbleMessageVariants,
  ChatMessageList,
  chatBubbleVariants,
};
