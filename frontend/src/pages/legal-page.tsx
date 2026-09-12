import { Link } from "react-router-dom";

import {
  LegalPlaceholder,
  LegalSection,
  PublicLegalDocument,
} from "@/components/legal/public-legal-document";

export function LegalPage() {
  return (
    <PublicLegalDocument
      description="Les informations relatives à l’édition, à l’hébergement et à l’utilisation du site et du service TaskMiner."
      eyebrow="Informations légales"
      title="Mentions légales"
      updatedAt="12 septembre 2026"
    >
      <LegalSection title="1. Éditeur du service">
        <p>
          TaskMiner est le nom du service accessible notamment depuis le domaine
          taskminer.app.
        </p>
        <dl className="grid gap-3 sm:grid-cols-[minmax(10rem,auto)_1fr]">
          <dt className="text-foreground font-medium">Éditeur</dt>
          <dd>Iskander Hadji</dd>
          <dt className="text-foreground font-medium">Forme et régime</dt>
          <dd>Entrepreneur individuel — micro-entreprise</dd>
          <dt className="text-foreground font-medium">
            Adresse professionnelle
          </dt>
          <dd>
            15 rue François de Vaux de Foletier, 17000 La Rochelle, France
          </dd>
          <dt className="text-foreground font-medium">SIREN</dt>
          <dd>988 573 580</dd>
          <dt className="text-foreground font-medium">SIRET</dt>
          <dd>988 573 580 00012</dd>
          <dt className="text-foreground font-medium">RCS</dt>
          <dd>988 573 580 R.C.S. La Rochelle</dd>
          <dt className="text-foreground font-medium">RNE</dt>
          <dd>Inscrit au Registre national des entreprises</dd>
          <dt className="text-foreground font-medium">Code APE</dt>
          <dd>47.91B</dd>
          <dt className="text-foreground font-medium">Activité déclarée</dt>
          <dd>
            Vente à distance sur catalogue spécialisé / activité numérique
          </dd>
        </dl>
      </LegalSection>

      <LegalSection title="2. Responsable de la publication">
        <p>Le responsable de la publication est Iskander Hadji.</p>
      </LegalSection>

      <LegalSection title="3. Coordonnées et contact">
        <p>
          Pour toute question générale, demande de support ou signalement
          relatif au service, vous pouvez écrire à{" "}
          <a
            className="text-primary font-medium underline underline-offset-4"
            href="mailto:hello@taskminer.app"
          >
            hello@taskminer.app
          </a>
          .
        </p>
        <p>
          Adresse professionnelle : 15 rue François de Vaux de Foletier, 17000
          La Rochelle, France.
        </p>
        <p>
          Téléphone professionnel :{" "}
          <a
            className="text-primary font-medium underline underline-offset-4"
            href="tel:+33614713020"
          >
            06 14 71 30 20
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Hébergement technique">
        <p>
          Le dépôt et la documentation de déploiement attestent que le frontend
          TaskMiner est servi par Vercel, que le backend et le stockage des
          fichiers sont exploités sur Railway, et que la base PostgreSQL est
          hébergée par Neon.
        </p>
        <p>
          Ces services sont fournis par des prestataires distincts. Leurs
          entités contractantes et régions effectives dépendent des comptes et
          de la configuration de production utilisés par l’éditeur.
        </p>
        <LegalPlaceholder>
          raisons sociales et coordonnées postales des entités d’hébergement
          effectivement contractées, après vérification des comptes de
          production
        </LegalPlaceholder>
      </LegalSection>

      <LegalSection title="5. Propriété intellectuelle">
        <p>
          Les marques, logiciels, textes, éléments graphiques et autres contenus
          accessibles dans TaskMiner peuvent être protégés par les droits de
          leurs titulaires respectifs. Leur mise à disposition ne vaut pas
          transfert de propriété ni autorisation de réutilisation au-delà de ce
          qui est nécessaire à l’utilisation normale du service.
        </p>
        <p>
          Toute reproduction ou exploitation non autorisée doit respecter les
          droits applicables et les éventuelles licences associées aux
          composants concernés.
        </p>
      </LegalSection>

      <LegalSection title="6. Données personnelles et conditions d’utilisation">
        <p>
          Les informations relatives au traitement des données personnelles sont
          présentées dans la{" "}
          <Link
            className="text-primary font-medium underline underline-offset-4"
            to="/privacy"
          >
            Politique de confidentialité
          </Link>
          . Les règles d’utilisation du service et les informations relatives
          aux abonnements figurent dans les{" "}
          <Link
            className="text-primary font-medium underline underline-offset-4"
            to="/terms"
          >
            Conditions d’utilisation
          </Link>
          .
        </p>
      </LegalSection>
    </PublicLegalDocument>
  );
}
