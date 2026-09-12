import {
  LegalPlaceholder,
  LegalSection,
  PublicLegalDocument,
} from "@/components/legal/public-legal-document";

export function TermsPage() {
  return (
    <PublicLegalDocument
      description="Ces conditions encadrent l’accès au service TaskMiner, son utilisation et les abonnements proposés."
      eyebrow="Règles du service"
      title="Conditions d’utilisation"
      updatedAt="12 septembre 2026"
    >
      <LegalSection title="1. Objet du service">
        <p>
          TaskMiner est un service en ligne de gestion de projets et de tâches.
          Il propose notamment des workspaces collaboratifs, des projets, des
          tâches, des invitations, des pièces jointes et des fonctions
          d’assistance par intelligence artificielle.
        </p>
        <p>
          Les présentes conditions définissent les règles applicables à l’accès
          et à l’utilisation de TaskMiner. Elles doivent être lues avec la
          Politique de confidentialité et les informations légales du service.
        </p>
      </LegalSection>

      <LegalSection title="2. Création et accès au compte">
        <p>
          L’utilisation des fonctionnalités authentifiées nécessite la création
          d’un compte avec des informations exactes et une adresse e-mail
          valide. Cette adresse doit être vérifiée avant la première connexion
          normale au service.
        </p>
        <p>
          L’utilisateur doit maintenir ses informations à jour et ne pas créer
          de compte au nom d’un tiers sans autorisation.
        </p>
      </LegalSection>

      <LegalSection title="3. Sécurité du compte">
        <p>
          L’utilisateur est responsable de la confidentialité de ses
          identifiants, du choix d’un mot de passe robuste et des actions
          réalisées depuis son compte. Il doit informer TaskMiner rapidement
          s’il suspecte un accès non autorisé ou une compromission.
        </p>
      </LegalSection>

      <LegalSection title="4. Obligations et utilisation acceptable">
        <p>L’utilisateur s’engage notamment à ne pas :</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>utiliser TaskMiner à des fins illicites ou frauduleuses ;</li>
          <li>
            contourner les permissions, quotas, limitations techniques ou
            mesures de sécurité ;
          </li>
          <li>
            tenter d’accéder aux comptes, workspaces, projets, données ou
            fichiers d’autres utilisateurs sans autorisation ;
          </li>
          <li>
            perturber le service, automatiser des requêtes abusives ou
            introduire du contenu malveillant ;
          </li>
          <li>
            transmettre des contenus dont il ne dispose pas des droits ou qui
            portent atteinte aux droits de tiers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Contenus et données de l’utilisateur">
        <p>
          L’utilisateur demeure responsable des informations, projets, tâches,
          commentaires et fichiers qu’il ajoute au service, ainsi que des droits
          nécessaires pour les utiliser et les partager avec les membres de son
          workspace.
        </p>
        <p>
          Il autorise leur traitement dans la mesure nécessaire à la fourniture,
          à la sécurisation et au fonctionnement des fonctionnalités qu’il
          demande. Les modalités relatives aux données personnelles sont
          précisées dans la Politique de confidentialité.
        </p>
      </LegalSection>

      <LegalSection title="6. Fonctions TaskMiner AI">
        <p>
          TaskMiner AI génère des propositions structurées à partir des
          instructions et du contexte autorisé. Ces propositions doivent être
          relues et confirmées par l’utilisateur avant toute application aux
          données du projet. L’utilisateur reste responsable de leur validation
          et de leur utilisation.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilité et évolution du service">
        <p>
          TaskMiner vise à fournir un service disponible et sécurisé, sans
          pouvoir garantir une disponibilité ininterrompue. Des interruptions
          peuvent être nécessaires pour la maintenance, la sécurité, la
          correction d’incidents ou en raison de prestataires externes.
        </p>
        <p>
          Les fonctionnalités peuvent évoluer. Les changements substantiels
          affectant les conditions applicables doivent être communiqués de
          manière appropriée avant leur entrée en vigueur lorsque cela est
          requis.
        </p>
      </LegalSection>

      <LegalSection title="8. Suspension et résiliation">
        <p>
          Un accès peut être suspendu ou résilié en cas de violation de ces
          conditions, de risque pour la sécurité, d’utilisation abusive ou
          lorsque la loi l’impose. La mesure doit rester proportionnée à la
          situation et aux obligations applicables.
        </p>
        <p>
          L’utilisateur peut demander la suppression de son compte depuis les
          paramètres. La suppression d’un workspace reste soumise à la fin
          effective de tout abonnement Stripe qui lui est encore rattaché.
        </p>
      </LegalSection>

      <LegalSection title="9. Offres Free et Pro — conditions commerciales">
        <p>
          L’offre Free comprend jusqu’à 3 membres, 5 projets et 25 requêtes
          TaskMiner AI par mois pour le workspace, selon les limites affichées
          par le service.
        </p>
        <p>
          L’offre Pro est affichée au tarif de 12 € par mois et par workspace.
          Elle comprend jusqu’à 15 membres, 50 projets et 500 requêtes TaskMiner
          AI par mois pour le workspace. L’abonnement est récurrent
          mensuellement et le paiement est traité dans l’interface Stripe.
        </p>
        <p>
          Le propriétaire du workspace peut gérer ou programmer l’annulation de
          l’abonnement depuis le portail client Stripe accessible dans
          TaskMiner. Lorsqu’une annulation est programmée, les capacités Pro
          restent actives jusqu’à la fin de la période payée indiquée, puis les
          limites Free s’appliquent. Les ressources existantes ne sont pas
          supprimées automatiquement lors de ce changement de plan, mais de
          nouvelles créations peuvent être bloquées au-delà des limites Free.
        </p>
        <LegalPlaceholder>
          préciser avant commercialisation si le prix est TTC ou HT, les règles
          de TVA applicables, le public B2B/B2C visé, les modalités légales de
          rétractation et les informations de facturation obligatoires
        </LegalPlaceholder>
      </LegalSection>

      <LegalSection title="10. Responsabilité">
        <p>
          L’utilisateur doit vérifier les informations importantes avant de les
          utiliser, notamment les propositions générées par TaskMiner AI. Chaque
          partie demeure responsable de ses actes dans les limites prévues par
          la réglementation applicable.
        </p>
        <p>
          Les limitations ou exclusions de responsabilité éventuellement
          applicables doivent respecter les droits impératifs attachés à la
          qualité de l’utilisateur et au cadre commercial retenu.
        </p>
      </LegalSection>

      <LegalSection title="11. Modification des conditions">
        <p>
          Ces conditions peuvent être mises à jour pour tenir compte de
          l’évolution du service ou des obligations applicables. La date
          affichée en haut de la page identifie la version publiée. Une
          information complémentaire doit être fournie en cas de modification
          substantielle lorsque la loi ou le contrat l’exige.
        </p>
      </LegalSection>

      <LegalSection title="12. Droit applicable et règlement des différends">
        <LegalPlaceholder>
          droit applicable, juridiction compétente, procédure de réclamation et,
          selon le public B2B/B2C retenu, dispositif de médiation de la
          consommation
        </LegalPlaceholder>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Toute question relative à ces conditions peut être adressée à{" "}
          <a
            className="text-primary font-medium underline underline-offset-4"
            href="mailto:hello@taskminer.app?subject=TaskMiner%20-%20Conditions%20d%27utilisation"
          >
            hello@taskminer.app
          </a>
          .
        </p>
      </LegalSection>
    </PublicLegalDocument>
  );
}
