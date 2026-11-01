import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { CONSENT_STORAGE_KEY, useConsentStore } from "@/store/consent-store";

/**
 * Cookie banner, shown until the visitor chooses and reopened from « Gestion
 * des cookies ». It never blocks the page and refusing is as easy as
 * accepting: both buttons have the same weight. Rendered first in the
 * document so that keyboard users reach it right away.
 */
export function ConsentBanner() {
  const decision = useConsentStore((state) => state.decision);
  const isPanelOpen = useConsentStore((state) => state.isPanelOpen);
  const closePanel = useConsentStore((state) => state.closePanel);
  const decide = useConsentStore((state) => state.decide);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // A choice made in another tab applies to this one too.
  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY) {
        void useConsentStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  // Reopened on request: focus the panel, then give focus back on close.
  useEffect(() => {
    if (!isPanelOpen) return;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    titleRef.current?.focus();
  }, [isPanelOpen]);

  const restoreFocus = () => {
    returnFocusRef.current?.focus();
    returnFocusRef.current = null;
  };

  const choose = (advertising: boolean) => {
    decide(advertising);
    setAnnouncement(
      advertising
        ? "Cookies publicitaires acceptés."
        : "Cookies publicitaires refusés.",
    );
    restoreFocus();
  };

  const close = () => {
    closePanel();
    restoreFocus();
  };

  const canClose = decision !== null;

  return (
    <>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {decision === null || isPanelOpen ? (
        <section
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="bg-popover text-popover-foreground rounded-dialog shadow-floating fixed inset-x-3 bottom-3 z-50 border p-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem]"
          onKeyDown={(event) => {
            if (event.key === "Escape" && canClose) {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              className="text-section-title outline-none"
              id={titleId}
              ref={titleRef}
              tabIndex={-1}
            >
              Cookies publicitaires
            </h2>
            {canClose ? (
              <Button
                aria-label="Fermer"
                className="-mt-1.5 -mr-1.5"
                onClick={close}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </div>
          <p
            className="text-muted-foreground mt-2 text-sm leading-relaxed"
            id={descriptionId}
          >
            Avec votre accord, TaskMiner utilise le pixel Meta (Facebook,
            Instagram) pour mesurer l’efficacité de ses publicités&nbsp;: pages
            consultées, création de compte et démarrage d’un abonnement. Meta
            peut aussi utiliser ces données pour ses propres finalités
            publicitaires. Sans votre accord, rien n’est envoyé à Meta.
          </p>
          {decision ? (
            <p className="mt-2 text-sm">
              Choix actuel&nbsp;:{" "}
              <span className="font-medium">
                {decision.advertising ? "accepté" : "refusé"}
              </span>{" "}
              le {formatDate(decision.decidedAt)}.
            </p>
          ) : null}
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Vous pourrez changer d’avis à tout moment depuis la gestion des
            cookies, accessible sur chaque page.{" "}
            <Link
              className="text-primary rounded-sm font-medium underline underline-offset-4"
              to="/privacy#cookies"
            >
              En savoir plus
            </Link>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                choose(false);
              }}
              type="button"
              variant="outline"
            >
              Refuser
            </Button>
            <Button
              onClick={() => {
                choose(true);
              }}
              type="button"
              variant="outline"
            >
              Accepter
            </Button>
          </div>
        </section>
      ) : null}
    </>
  );
}
