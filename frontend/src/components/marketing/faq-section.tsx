import { Plus } from "lucide-react";

import { faqItems } from "@/components/marketing/faq-items";
import {
  marketingContainer,
  SectionHeading,
} from "@/components/marketing/marketing-ui";
import { cn } from "@/lib/utils";

export function FaqSection() {
  return (
    <section
      aria-labelledby="marketing-faq-title"
      className="bg-surface-sunken/50 border-y py-20 sm:py-24 lg:py-28"
      id="faq"
    >
      <div
        className={cn(
          marketingContainer,
          "grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16",
        )}
      >
        <div>
          <SectionHeading
            eyebrow="Questions fréquentes"
            id="marketing-faq-title"
            lead={
              <>
                Une autre question&nbsp;? Écrivez-nous à{" "}
                <a
                  className="text-foreground font-medium underline underline-offset-4"
                  href="mailto:hello@taskminer.app"
                >
                  hello@taskminer.app
                </a>
                .
              </>
            }
            title="Ce qu’il faut savoir avant de commencer."
          />
        </div>
        <div className="bg-card rounded-card divide-y border shadow-xs">
          {faqItems.map((item) => (
            <details className="group" key={item.question}>
              <summary className="hover:bg-accent/60 focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[0.9375rem] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <Plus
                  aria-hidden="true"
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-150 group-open:rotate-45"
                />
              </summary>
              <p className="text-muted-foreground px-5 pb-5 text-sm leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
