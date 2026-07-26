# Feuille de route TaskMiner

## Vision du projet

TaskMiner est un SaaS de gestion de projets et de tâches conçu pour aider ses
utilisateurs à organiser, suivre et, à terme, automatiser leur travail. Le
produit repose sur une API FastAPI, une base PostgreSQL et un frontend React.
Son développement est organisé en sprints courts afin de maintenir une base
technique stable avant l'ajout progressif des fonctionnalités métier.

## Légende

- ✅ **Terminé** : livré et validé.
- 🚧 **En cours** : développement actif.
- ⏳ **À faire** : planifié, mais pas encore commencé.

## Sprints terminés

- [x] ✅ **Sprint 1 — Fondations du backend**
  - Architecture FastAPI initiale.
  - Configuration Pydantic et SQLAlchemy 2.
  - Logging, endpoint de santé et préparation d'Alembic.
- [x] ✅ **Sprint 2 — Infrastructure Docker**
  - Services backend, PostgreSQL, frontend React et nginx.
  - Réseau partagé, volume persistant et healthchecks.
  - Reverse proxy et documentation de démarrage.
- [x] ✅ **Sprint 3 — Base de données métier**
  - Modèles `User`, `Project` et `Task`.
  - Relations, contraintes et enums PostgreSQL.
  - Migration Alembic initiale validée.
- [x] ✅ **Sprint 4 — Architecture API**
  - Schémas Pydantic Create, Update et Read.
  - Contrats de repositories et structure des services.
  - Router API v1 et endpoints placeholders.

## Prochains sprints

- [ ] ⏳ **Authentification**
  - Inscription et connexion sécurisées.
  - Hachage des mots de passe et gestion des sessions ou jetons.
  - Autorisation et isolation des ressources par utilisateur.
- [ ] ⏳ **CRUD métier**
  - Implémentation des repositories et services.
  - Opérations CRUD pour les utilisateurs, projets et tâches.
  - Validation, pagination et gestion uniforme des erreurs.
- [ ] ⏳ **Intelligence artificielle**
  - Assistance à la création, à la classification et à la priorisation des
    tâches.
  - Définition de limites d'usage, observabilité et contrôle des coûts.
- [ ] ⏳ **Intégration Telegram**
  - Bot connecté aux cas d'usage TaskMiner.
  - Notifications et commandes de gestion des tâches.
- [ ] ⏳ **Frontend produit**
  - Remplacement du placeholder React par l'interface utilisateur.
  - Authentification, tableaux de bord, projets et tâches.
- [ ] ⏳ **Production**
  - CI/CD, sauvegardes, supervision et alertes.
  - Sécurité, gestion des secrets, HTTPS et stratégie de déploiement.
  - Tests de charge et procédures de reprise.

## État courant

Aucun sprint n'est actuellement marqué comme en cours. La prochaine étape doit
être explicitement cadrée avant toute modification fonctionnelle.
