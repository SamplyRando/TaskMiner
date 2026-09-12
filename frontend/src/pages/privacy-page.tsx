import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import { useDocumentTitle } from "@/hooks/use-document-title";

type PrivacySectionProps = {
  children: ReactNode;
  title: string;
};

function PrivacySection({ children, title }: PrivacySectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      <div className="text-muted-foreground space-y-3 leading-7">
        {children}
      </div>
    </section>
  );
}

export function PrivacyPage() {
  useDocumentTitle("Politique de confidentialité");

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border/70 bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo to="/" />
          <Link
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md px-2 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            to="/"
          >
            Retour à TaskMiner
          </Link>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
        id="privacy-content"
      >
        <article className="space-y-10 sm:space-y-12">
          <header className="space-y-5 border-b pb-8 sm:pb-10">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              Confidentialité et données personnelles
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Politique de confidentialité
            </h1>
            <p className="text-muted-foreground max-w-3xl text-base leading-7 sm:text-lg">
              Cette notice explique quelles données TaskMiner traite, pourquoi
              elles sont utilisées et comment exercer vos droits.
            </p>
            <p className="text-muted-foreground text-sm">
              Dernière mise à jour : 11 septembre 2026
            </p>
          </header>

          <PrivacySection title="1. Responsable du traitement">
            <p>
              Le responsable du traitement est Iskander Hadji, entrepreneur
              individuel, dont l’adresse professionnelle est 15 rue François de
              Vaux de Foletier, 17000 La Rochelle, France.
            </p>
            <p>
              Pour toute question relative à vos données personnelles, vous
              pouvez écrire à{" "}
              <a
                className="text-primary rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                href="mailto:hello@taskminer.app?subject=TaskMiner%20-%20Données%20personnelles"
              >
                hello@taskminer.app
              </a>
              .
            </p>
          </PrivacySection>

          <PrivacySection title="2. Données personnelles traitées">
            <p>TaskMiner peut traiter les catégories de données suivantes :</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                données de compte : nom complet, adresse e-mail et mot de passe
                conservé sous forme hachée ;
              </li>
              <li>
                données d’utilisation et de sécurité : identifiants techniques,
                informations de connexion, journaux applicatifs et données
                nécessaires à la prévention des abus ;
              </li>
              <li>
                données de collaboration : workspaces, rôles, invitations,
                projets, tâches, commentaires, assignations, activité et audit ;
              </li>
              <li>
                fichiers et métadonnées des pièces jointes que vous choisissez
                de transmettre ;
              </li>
              <li>
                contenus soumis à TaskMiner AI, contexte projet nécessaire à la
                demande et métriques techniques d’usage telles que les volumes
                de tokens, la latence, le coût estimé et les erreurs normalisées
                ;
              </li>
              <li>
                données d’abonnement : plan, statut, périodes et identifiants
                techniques de facturation. Les données de carte sont traitées
                dans l’interface Stripe et ne sont pas enregistrées par
                TaskMiner.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection title="3. Finalités des traitements">
            <p>Ces données sont utilisées pour :</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>créer et sécuriser votre compte ;</li>
              <li>
                fournir les fonctions de gestion de projets et de collaboration
                ;
              </li>
              <li>envoyer et gérer les invitations de workspace ;</li>
              <li>produire les propositions structurées de TaskMiner AI ;</li>
              <li>gérer les plans, quotas, abonnements et paiements ;</li>
              <li>
                prévenir les abus, diagnostiquer les incidents et améliorer la
                fiabilité du service ;
              </li>
              <li>
                répondre aux demandes de support et d’exercice des droits.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection title="4. Bases légales">
            <p>
              Selon le traitement concerné, TaskMiner s’appuie sur l’exécution
              du service demandé ou de mesures précontractuelles, sur l’intérêt
              légitime à sécuriser et exploiter le service, et sur le respect
              d’obligations légales applicables, notamment en matière de
              facturation. Le consentement n’est utilisé que lorsqu’un
              traitement spécifique l’exige et peut alors être retiré à tout
              moment.
            </p>
          </PrivacySection>

          <PrivacySection title="5. Destinataires et prestataires techniques">
            <p>
              Les données sont accessibles aux utilisateurs autorisés de votre
              workspace selon leurs rôles, ainsi qu’aux personnes habilitées à
              exploiter TaskMiner lorsque cela est nécessaire.
            </p>
            <p>
              Le code et la documentation du service attestent l’utilisation de
              Vercel pour le frontend, Railway pour le backend et le stockage de
              fichiers, Neon pour PostgreSQL, OpenAI pour les fonctions d’IA,
              Resend pour les e-mails transactionnels et Stripe pour le paiement
              et la gestion des abonnements.
            </p>
            <p>
              Seules les données nécessaires au service concerné doivent être
              transmises à chaque prestataire. Leurs conditions, rôles exacts et
              garanties applicables dépendent des comptes et contrats configurés
              par le responsable du traitement.
            </p>
          </PrivacySection>

          <PrivacySection title="6. Hébergement et transferts internationaux">
            <p>
              TaskMiner utilise des services d’infrastructure et des
              fournisseurs internationaux. Les zones effectives de traitement et
              les mécanismes encadrant d’éventuels transferts hors de l’Espace
              économique européen doivent être vérifiés à partir de la
              configuration de production et des contrats applicables.
            </p>
            <p className="border-primary/25 bg-primary/5 text-foreground rounded-lg border px-4 py-3 font-medium break-words">
              [À COMPLÉTER AVANT LANCEMENT PUBLIC : régions d’hébergement et
              garanties de transfert applicables à chaque fournisseur]
            </p>
          </PrivacySection>

          <PrivacySection title="7. Durées de conservation">
            <p>
              Les données sont conservées pendant la durée nécessaire à la
              fourniture et à la sécurisation du service, puis supprimées,
              anonymisées ou archivées lorsque des obligations légales le
              requièrent. Les sauvegardes et journaux techniques peuvent suivre
              des cycles de conservation distincts.
            </p>
            <p className="border-primary/25 bg-primary/5 text-foreground rounded-lg border px-4 py-3 font-medium break-words">
              [À COMPLÉTER AVANT LANCEMENT PUBLIC : durées de conservation par
              catégorie de données, y compris journaux, sauvegardes et données
              de facturation]
            </p>
          </PrivacySection>

          <PrivacySection title="8. Sécurité">
            <p>
              TaskMiner met en œuvre des mesures techniques destinées à protéger
              les données, notamment le hachage des mots de passe, le contrôle
              d’accès par rôle, l’isolation des workspaces, la limitation des
              abus, la validation des entrées et la conservation des secrets
              côté serveur. Aucun système ne pouvant garantir une sécurité
              absolue, les mesures sont réévaluées en fonction des risques.
            </p>
          </PrivacySection>

          <PrivacySection title="9. Vos droits">
            <p>
              Selon la réglementation applicable, vous pouvez demander l’accès,
              la rectification, l’effacement, la limitation ou la portabilité de
              vos données, et vous opposer à certains traitements. Lorsque le
              traitement repose sur votre consentement, vous pouvez le retirer à
              tout moment. Vous pouvez également introduire une réclamation
              auprès de la CNIL ou de l’autorité de contrôle compétente.
            </p>
            <p>
              Une preuve d’identité peut être demandée uniquement lorsqu’elle
              est nécessaire pour éviter de communiquer des données à une
              personne non autorisée.
            </p>
          </PrivacySection>

          <PrivacySection title="10. Suppression du compte">
            <p>
              La suppression du compte peut être demandée depuis les paramètres
              TaskMiner. Elle révoque l’accès et déclenche l’anonymisation
              prévue par l’application. Certaines informations peuvent être
              conservées temporairement lorsqu’une obligation légale, un besoin
              de sécurité ou le cycle des sauvegardes le justifie. Vous pouvez
              contacter TaskMiner si vous ne pouvez pas accéder à votre compte.
            </p>
          </PrivacySection>

          <PrivacySection title="11. Contact relatif aux données personnelles">
            <p>
              Pour exercer vos droits ou poser une question sur cette politique,
              écrivez à{" "}
              <a
                className="text-primary rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                href="mailto:hello@taskminer.app?subject=TaskMiner%20-%20Données%20personnelles"
              >
                hello@taskminer.app
              </a>
              . Précisez votre demande et l’adresse e-mail associée à votre
              compte afin de faciliter son traitement.
            </p>
          </PrivacySection>

          <PrivacySection title="12. Mise à jour de la politique">
            <p>
              Cette politique peut évoluer pour refléter les changements du
              service, des fournisseurs ou des obligations applicables. La date
              de dernière mise à jour affichée en haut de cette page permet
              d’identifier la version en vigueur.
            </p>
          </PrivacySection>
        </article>
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© 2026 TaskMiner</span>
          <nav aria-label="Informations légales">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li>
                <Link className="hover:text-foreground hover:underline" to="/">
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-foreground hover:underline"
                  to="/legal"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-foreground hover:underline"
                  to="/terms"
                >
                  Conditions d’utilisation
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
