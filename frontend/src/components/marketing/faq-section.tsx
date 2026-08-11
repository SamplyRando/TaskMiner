import { Plus } from "lucide-react";
import { useState } from "react";

import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

const questions = [
  {
    answer:
      "TaskMiner is an intelligent workspace that brings projects, tasks, documents, collaboration, and AI-assisted planning into one focused place.",
    question: "What is TaskMiner?",
  },
  {
    answer:
      "Yes. The Starter plan is free and includes the essential tools you need to organize projects, documents, and a small team.",
    question: "Can I use it for free?",
  },
  {
    answer:
      "TaskMiner analyzes the context you provide and proposes structured tasks, priorities, milestones, and next actions. You always remain in control of the final plan.",
    question: "How does AI work?",
  },
  {
    answer:
      "Yes. Invite teammates into a shared workspace, assign work, collaborate through comments, and keep every decision connected to the project.",
    question: "Can I invite my team?",
  },
  {
    answer:
      "TaskMiner supports enterprise needs including SSO, API access, unlimited members, dedicated support, and workspace-level permissions.",
    question: "Do you support enterprises?",
  },
  {
    answer:
      "Absolutely. You can change or cancel your plan at any time. Your workspace remains accessible through the end of the active billing period.",
    question: "Can I cancel anytime?",
  },
  {
    answer:
      "Your workspace is isolated and protected through authenticated access, role-based permissions, and detailed activity and audit records.",
    question: "Is my workspace secure?",
  },
] as const;

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      aria-labelledby="marketing-faq-title"
      className="marketing-section marketing-faq"
      id="faq"
    >
      <div className="marketing-section-shell marketing-faq__layout">
        <SectionHeading
          description="Everything you need to know before bringing your work into TaskMiner."
          eyebrow="Questions, answered"
        >
          <span id="marketing-faq-title">Clarity before</span>
          <span>you get started.</span>
        </SectionHeading>

        <div className="marketing-faq__list">
          {questions.map((item, index) => {
            const isOpen = openIndex === index;
            const buttonId = `marketing-faq-button-${String(index)}`;
            const panelId = `marketing-faq-panel-${String(index)}`;

            return (
              <article
                className={cn("marketing-faq__item", {
                  "marketing-faq__item--open": isOpen,
                })}
                key={item.question}
              >
                <h3>
                  <button
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    id={buttonId}
                    onClick={() => {
                      setOpenIndex(isOpen ? null : index);
                    }}
                    type="button"
                  >
                    <span>{item.question}</span>
                    <Plus aria-hidden="true" />
                  </button>
                </h3>
                <div
                  aria-hidden={!isOpen}
                  aria-labelledby={buttonId}
                  className="marketing-faq__answer"
                  id={panelId}
                  role="region"
                >
                  <div>
                    <p>{item.answer}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
