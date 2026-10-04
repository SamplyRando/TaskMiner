import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know the design-system tokens declared in styles.css:
// otherwise `text-page-title` would be read as a text colour and silently
// dropped when merged with `text-muted-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control", "card", "floating", "dialog"],
      shadow: ["control", "floating", "modal"],
      spacing: ["control-sm", "control", "control-lg", "control-touch"],
      text: [
        "display",
        "page-title",
        "section-title",
        "card-title",
        "body",
        "label",
        "meta",
        "caption",
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
