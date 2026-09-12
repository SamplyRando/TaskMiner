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
        <p>
          TaskMiner est proposé aux particuliers comme aux professionnels. Les
          dispositions impératives applicables à chaque catégorie d’utilisateur
          restent réservées.
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
          L’offre Pro est affichée au tarif de 12 € / mois / workspace. Elle
          comprend jusqu’à 15 membres, 50 projets et 500 requêtes TaskMiner AI
          par mois pour le workspace. L’abonnement est mensuel et récurrent, et
          le paiement est traité dans l’interface Stripe.
        </p>
        <p>
          <span className="text-foreground font-medium">
            TVA non applicable, art. 293 B du CGI.
          </span>{" "}
          Cette mention s’applique tant que le régime applicable reste celui de
          la franchise en base.
        </p>
        <p>
          Les règles de rétractation présentées ci-dessous concernent uniquement
          les consommateurs. Elles ne s’appliquent pas aux clients
          professionnels agissant dans le cadre de leur activité.
        </p>
        <LegalPlaceholder>
          informations précontractuelles et de facturation complémentaires
          requises selon la qualité de particulier ou de professionnel
        </LegalPlaceholder>
      </LegalSection>

      <LegalSection title="10. Droit de rétractation des consommateurs">
        <p>
          Pour les consommateurs uniquement, un contrat de service conclu à
          distance bénéficie en principe d’un délai légal de rétractation de 14
          jours à compter de sa conclusion.
        </p>
        <p>
          TaskMiner Pro est accessible immédiatement après validation du
          paiement. Si le consommateur demande expressément que l’exécution du
          service commence avant la fin du délai de 14 jours puis exerce son
          droit de rétractation, le montant éventuellement conservé par
          TaskMiner est strictement proportionnel au service fourni jusqu’à la
          communication de sa décision.
        </p>
        <p className="text-foreground font-medium">
          Le paiement ou l’accès immédiat au service n’emporte aucune
          renonciation automatique au droit de rétractation.
        </p>
        <p>
          Si l’exécution du service n’a pas commencé, le montant payé est
          remboursé intégralement. Si elle a commencé à la demande expresse du
          consommateur, TaskMiner rembourse le montant payé, déduction faite
          uniquement de la part strictement proportionnelle au service déjà
          fourni jusqu’à la notification de la rétractation. Aucun frais fixe ni
          aucune pénalité de rétractation n’est appliqué.
        </p>
        <p>
          Le remboursement applicable est traité manuellement après réception de
          la demande, sans automatisme de remboursement dans Stripe. La demande
          est traitée sans retard injustifié et au plus tard dans les 14 jours
          suivant la date à laquelle TaskMiner est informé de la décision de
          rétractation.
        </p>
        <p>
          Le consommateur peut notifier sa décision de se rétracter au moyen
          d’une déclaration dénuée d’ambiguïté envoyée à{" "}
          <a
            className="text-primary font-medium underline underline-offset-4"
            href="mailto:hello@taskminer.app?subject=TaskMiner%20-%20R%C3%A9tractation"
          >
            hello@taskminer.app
          </a>
          , en indiquant l’adresse e-mail de son compte et le workspace
          concerné.
        </p>
        <p>
          Avant l’ouverture du paiement de l’offre Pro, TaskMiner recueille une
          demande expresse lorsque l’utilisateur souhaite que l’exécution du
          service commence immédiatement, avant la fin du délai de rétractation
          de 14 jours.
        </p>
      </LegalSection>

      <LegalSection title="11. Formulaire type de rétractation">
        <p>
          Le consommateur peut copier le modèle ci-dessous dans un e-mail ou
          l’imprimer, puis le compléter uniquement s’il souhaite exercer son
          droit de rétractation concernant TaskMiner Pro.
        </p>
        <div
          aria-label="Modèle de formulaire de rétractation"
          className="border-border bg-muted/30 space-y-4 rounded-xl border p-4 select-text sm:p-5"
        >
          <p>
            <span className="text-foreground font-medium">
              À l’attention de :
            </span>
            <br />
            Iskander Hadji
            <br />
            15 rue François de Vaux de Foletier
            <br />
            17000 La Rochelle
            <br />
            France
            <br />
            hello@taskminer.app
          </p>
          <p>
            Je vous informe sans ambiguïté de ma décision d’exercer mon droit de
            rétractation concernant le contrat TaskMiner Pro souscrit pour le
            workspace : [nom du workspace].
          </p>
          <p>Date de souscription : [jour / mois / année]</p>
          <p>Nom du consommateur : [nom et prénom]</p>
          <p>Adresse du consommateur : [adresse postale]</p>
          <p>Date de la demande : [jour / mois / année]</p>
          <p>
            Signature du consommateur : [uniquement en cas d’envoi du formulaire
            sur papier]
          </p>
        </div>
        <p>
          Vous pouvez également exercer votre droit de rétractation en envoyant
          une déclaration non ambiguë à{" "}
          <a
            className="text-primary font-medium underline underline-offset-4"
            href="mailto:hello@taskminer.app?subject=TaskMiner%20-%20R%C3%A9tractation"
          >
            hello@taskminer.app
          </a>
          . L’utilisation de ce formulaire n’est pas obligatoire.
        </p>
      </LegalSection>

      <LegalSection title="12. Résiliation de l’abonnement">
        <p>
          Le propriétaire du workspace peut résilier l’abonnement en ligne
          depuis son espace client TaskMiner. Dans la section du plan du
          workspace, l’action « Gérer l’abonnement » ouvre le Stripe Customer
          Portal, où l’annulation peut être demandée puis confirmée.
        </p>
        <p>
          Sauf obligation légale contraire, la résiliation prend effet à la fin
          de la période déjà payée. Les capacités Pro restent actives jusqu’à
          cette date, puis les limites Free s’appliquent. Les ressources
          existantes ne sont pas supprimées automatiquement, mais de nouvelles
          créations peuvent être bloquées lorsqu’elles dépassent les limites
          Free.
        </p>
      </LegalSection>

      <LegalSection title="13. Responsabilité">
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

      <LegalSection title="14. Modification des conditions">
        <p>
          Ces conditions peuvent être mises à jour pour tenir compte de
          l’évolution du service ou des obligations applicables. La date
          affichée en haut de la page identifie la version publiée. Une
          information complémentaire doit être fournie en cas de modification
          substantielle lorsque la loi ou le contrat l’exige.
        </p>
      </LegalSection>

      <LegalSection title="15. Droit applicable et règlement des différends">
        <LegalPlaceholder>
          droit applicable, juridiction compétente et procédure de réclamation
        </LegalPlaceholder>
      </LegalSection>

      <LegalSection title="16. Médiation de la consommation">
        <p>
          Cette procédure concerne uniquement les consommateurs. Le consommateur
          doit d’abord adresser une réclamation écrite à TaskMiner. Si le litige
          n’est pas résolu à la suite de cette réclamation, il peut saisir
          gratuitement le médiateur de la consommation compétent :
        </p>
        <div
          aria-label="Coordonnées du CM2C"
          className="border-border bg-muted/30 space-y-3 rounded-xl border p-4 sm:p-5"
        >
          <p className="text-foreground font-medium">
            Centre de la Médiation de la Consommation des Conciliateurs de
            Justice (CM2C)
          </p>
          <address className="not-italic">
            CM2C
            <br />
            49 rue de Ponthieu
            <br />
            75008 Paris
            <br />
            France
          </address>
          <p>
            Téléphone :{" "}
            <a
              className="text-primary font-medium underline underline-offset-4"
              href="tel:+33189470014"
            >
              01 89 47 00 14
            </a>
          </p>
          <p>
            Site officiel :{" "}
            <a
              className="text-primary font-medium underline underline-offset-4"
              href="https://www.cm2c.net/"
              rel="noreferrer"
              target="_blank"
            >
              www.cm2c.net
            </a>
          </p>
          <p>
            Pour saisir le médiateur, consultez{" "}
            <a
              className="text-primary font-medium underline underline-offset-4"
              href="https://www.cm2c.net/comment-nous-saisir.php"
              rel="noreferrer"
              target="_blank"
            >
              les modalités de saisine du CM2C
            </a>
            .
          </p>
        </div>
      </LegalSection>

      <LegalSection title="17. Contact">
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
