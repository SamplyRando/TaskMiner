import { Plus } from "lucide-react";
import { useState } from "react";

import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

const questions = [
  {
    answer:
      "TaskMiner is an AI-assisted project management workspace. It keeps projects, prioritized tasks, assignments, conversations, files, activity, and audit history connected in one place.",
    question: "What is TaskMiner?",
  },
  {
    answer:
      "TaskMiner is built for product, engineering, operations, design, and client-facing teams that need a shared view of what matters, who owns it, and what happens next.",
    question: "Who is TaskMiner for?",
  },
  {
    answer:
      "Yes. You can create an account and use the Free plan without entering payment details. Workspace owners can upgrade an individual workspace to Pro when the team needs more capacity.",
    question: "Can I use it for free?",
  },
  {
    answer:
      "AI-assisted planning uses the project context you provide to suggest a starting structure of tasks, priorities, milestones, and next actions. You review the plan and remain responsible for what your team adopts.",
    question: "What does the AI actually do?",
  },
  {
    answer:
      "Yes. Workspace owners and admins can invite teammates. Roles control access, while assignments, comments, and attachments keep collaboration connected to each task.",
    question: "Can I invite my team?",
  },
  {
    answer:
      "You can manage workspaces, projects, tasks, assignments, comments, attachments, invitations, permissions, dashboards, activity, and audit history today.",
    question: "What features are available today?",
  },
  {
    answer:
      "No. TaskMiner provides structure and visibility; it does not make accountable decisions for your team. AI suggestions are a starting point for people to review and refine.",
    question: "Does TaskMiner replace a project manager?",
  },
  {
    answer:
      "Workspace access requires authentication and follows role-based permissions. Activity and audit histories make supported changes traceable inside the workspace.",
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
          reveal
        >
          <span id="marketing-faq-title">Clarity before</span>
          <span>you get started.</span>
        </SectionHeading>

        <div className="marketing-faq__list" data-testid="faq-list">
          {questions.map((item, index) => {
            const isOpen = openIndex === index;
            const buttonId = `marketing-faq-button-${String(index)}`;
            const panelId = `marketing-faq-panel-${String(index)}`;

            return (
              <article
                className={cn(
                  "marketing-faq__item",
                  isOpen && "marketing-faq__item--open",
                )}
                data-testid={`faq-item-${String(index)}`}
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
