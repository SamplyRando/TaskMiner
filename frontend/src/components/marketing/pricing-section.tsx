import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

import {
  marketingContainer,
  marketingPrimaryCta,
  marketingSecondaryCta,
  SectionHeading,
} from "@/components/marketing/marketing-ui";
import {
  planCatalog,
  VAT_NOTICE,
  type PlanCatalogEntry,
} from "@/features/subscriptions/plan-catalog";
import { cn } from "@/lib/utils";

const formatNumber = (value: number) => value.toLocaleString("fr-FR");

const limitLines = (plan: PlanCatalogEntry) => [
  `${formatNumber(plan.limits.members)} membres par workspace`,
  `${formatNumber(plan.limits.projects)} projets par workspace`,
  `${formatNumber(plan.limits.ai_requests_per_month)} requêtes TaskMiner AI par mois`,
];

type PlanCardProps = {
  cta: { label: string; note?: string };
  extras: string[];
  featured?: boolean;
  plan: PlanCatalogEntry;
  priceNote: string;
  tag?: string;
  tagline: string;
};

function PlanCard({
  cta,
  extras,
  featured = false,
  plan,
  priceNote,
  tag,
  tagline,
}: PlanCardProps) {
  const headingId = `marketing-plan-${plan.code}`;

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        "bg-card rounded-card relative flex flex-col border p-6 shadow-xs sm:p-8",
        featured && "border-brand-border ring-brand/15 shadow-floating ring-4",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-tight" id={headingId}>
          {plan.name}
        </h3>
        {tag ? (
          <span className="border-brand-border bg-brand-subtle text-brand rounded-sm border px-2 py-0.5 text-xs font-semibold">
            {tag}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {tagline}
      </p>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="text-[2.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {formatNumber(plan.monthlyPriceEur)}&nbsp;€
        </span>
        <span className="text-muted-foreground text-sm">{priceNote}</span>
      </p>
      <ul className="mt-6 space-y-3 border-t pt-6 text-sm">
        {[...limitLines(plan), ...extras].map((line) => (
          <li className="flex items-start gap-2.5" key={line}>
            <Check
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-4 shrink-0",
                featured ? "text-brand" : "text-success",
              )}
              strokeWidth={2.5}
            />
            {line}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Link
          className={cn(
            featured ? marketingPrimaryCta : marketingSecondaryCta,
            "w-full",
          )}
          to="/register"
        >
          {cta.label}
          {featured ? (
            <ArrowRight aria-hidden="true" className="size-4" />
          ) : null}
        </Link>
        {cta.note ? (
          <p className="text-muted-foreground mt-3 text-center text-xs leading-relaxed">
            {cta.note}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function PricingSection() {
  return (
    <section
      aria-labelledby="marketing-pricing-title"
      className="py-20 sm:py-24 lg:py-28"
      id="tarifs"
    >
      <div className={marketingContainer}>
        <SectionHeading
          align="center"
          eyebrow="Tarifs"
          id="marketing-pricing-title"
          lead="Commencez gratuitement, sans limite de durée. Passez un workspace à Pro quand votre équipe a besoin de plus de capacité."
          title="Des tarifs simples, par workspace."
        />

        <div className="mx-auto mt-12 grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
          <PlanCard
            cta={{
              label: "Commencer gratuitement",
              note: "Sans carte bancaire.",
            }}
            extras={[
              `${formatNumber(planCatalog.free.ownedWorkspaces)} workspace possédé`,
              "Toutes les fonctionnalités, TaskMiner AI compris",
            ]}
            plan={planCatalog.free}
            priceNote="sans limite de durée"
            tagline="Pour démarrer et structurer vos premiers projets, seul ou en petite équipe."
          />
          <PlanCard
            cta={{
              label: "Créer mon espace",
              note: "Le propriétaire du workspace passe ensuite à Pro depuis l’application, quand il le souhaite.",
            }}
            extras={[
              `Jusqu’à ${formatNumber(planCatalog.pro.ownedWorkspaces)} workspaces possédés`,
              "Toutes les fonctionnalités, TaskMiner AI compris",
            ]}
            featured
            plan={planCatalog.pro}
            priceNote="par mois et par workspace"
            tag="Pour les équipes"
            tagline="Pour les équipes qui pilotent davantage de projets et de membres."
          />
        </div>

        <div className="text-muted-foreground mx-auto mt-8 max-w-3xl space-y-1.5 text-center text-xs leading-relaxed">
          <p>
            Les limites de membres et de projets s’appliquent à chaque
            workspace, et le nombre de membres inclut le propriétaire. En Free,
            les requêtes TaskMiner AI sont partagées entre les workspaces Free
            d’un même propriétaire&nbsp;; en Pro, elles sont propres au
            workspace. Chaque workspace a son propre plan&nbsp;: l’abonnement
            Pro concerne le workspace choisi.
          </p>
          <p>
            Abonnement mensuel, paiement géré par Stripe, résiliable depuis
            l’espace de facturation&nbsp;; la résiliation prend effet à la fin
            de la période payée. Prix en euros. {VAT_NOTICE}{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              to="/terms"
            >
              Voir les conditions commerciales
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
