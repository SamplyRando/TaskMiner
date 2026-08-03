# Journal des modifications

Toutes les évolutions notables de TaskMiner sont consignées dans ce fichier.
La structure s'inspire de Keep a Changelog et les versions suivent autant que
possible les principes du versionnement sémantique.

## [Non publié]

### Ajouté

- Identité TaskMiner complète : logo, favicon, métadonnées sociales, manifest et
  préparation PWA.
- Présentation mobile en cartes pour les tableaux métier.
- Préchargement des routes et persistance de l'état des pages dans la session.
- Tests dédiés aux composants de polish, à la marque et à la persistance.

### Modifié

- États interactifs, focus, skeletons, dialogues, cartes, listes, toasts et
  empty states harmonisés.
- README et documentation d'architecture remis à niveau avec le produit actuel.

### Corrigé

- Navigation de la Sidebar hors écran retirée de l'ordre de tabulation mobile.
- Protection globale contre les débordements horizontaux involontaires.

## [0.1.0] - 2026-07-18

Première fondation fonctionnelle et documentée de TaskMiner.

### Sprint 1 — Fondations du backend

- Création de l'architecture interne FastAPI.
- Configuration Pydantic, SQLAlchemy et logging.
- Ajout des routes `/` et `/health`.
- Préparation d'Alembic et des dépendances Python.

### Sprint 2 — Infrastructure Docker

- Orchestration du backend, de PostgreSQL, du frontend et de nginx.
- Ajout des Dockerfiles, healthchecks, dépendances conditionnelles, réseau
  partagé et volume PostgreSQL persistant.
- Mise en place du placeholder React et du reverse proxy nginx.

### Sprint 3 — Base de données métier

- Ajout des modèles `User`, `Project` et `Task`.
- Ajout des relations, UUID, timestamps, contraintes, cascades et index.
- Ajout des enums `task_status` et `task_priority`.
- Création et validation de la migration Alembic initiale.

### Sprint 4 — Architecture API

- Ajout des schémas Pydantic Create, Update et Read.
- Ajout des contrats de repositories et des classes de services.
- Ajout du router `/api/v1` et des endpoints placeholders pour les utilisateurs,
  projets et tâches.

## Règles de maintenance

À chaque sprint :

1. Ajouter les changements à la section `Non publié` pendant le développement.
2. Classer les entrées sous `Ajouté`, `Modifié`, `Corrigé`, `Déprécié`,
   `Supprimé` ou `Sécurité` selon le besoin.
3. Lors de la validation, déplacer les entrées vers une nouvelle version datée.
4. Mettre à jour simultanément la feuille de route et la documentation concernée.
