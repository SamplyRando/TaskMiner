# Architecture de TaskMiner

## Vue d'ensemble

TaskMiner est une application SaaS conteneurisée, structurée autour d'un
frontend React, d'une API FastAPI et de PostgreSQL. Le backend applique
strictement le flux `API → Service → Repository → SQLAlchemy`. Le frontend
sépare accès API, hooks React Query, features, composants et pages.

```text
                         Client web
                             │
                             ▼
                    ┌─────────────────┐
                    │ nginx / port 80 │
                    └────────┬────────┘
                     SPA     │     API / SSE
              ┌──────────────┴──────────────┐
              ▼                             ▼
     ┌─────────────────┐          ┌─────────────────┐
     │ React 19 + Vite │          │ FastAPI         │
     │ port 3000       │          │ port 8000       │
     └────────┬────────┘          └────────┬────────┘
              │                            │
     Router / Query / Store       API → Service → Repository
                                           │
                                  Domain Events / Listeners
                                           │
                                           ▼
                                  SQLAlchemy 2 + Alembic
                                           │
                                           ▼
                                      PostgreSQL 17
```

## Backend

Le code applicatif réside dans `backend/app/` :

- `api/` expose les dépendances FastAPI et les routes versionnées `/api/v1`.
- `schemas/` définit les contrats Pydantic v2, distincts des modèles persistés.
- `services/` contient les cas d'usage, permissions et règles métier.
- `repositories/` concentre toutes les requêtes SQLAlchemy 2.
- `models/` décrit les entités, relations, contraintes et enums PostgreSQL.
- `database/` configure le moteur, les sessions et la base déclarative.
- `core/` regroupe settings, sécurité JWT/Argon2, permissions, logs et événements.
- `listeners/` consomme les Domain Events pour alimenter Activity et Audit.
- `realtime/` gère les abonnements SSE isolés par workspace.
- `utils/` contient les utilitaires transversaux sans dépendance métier.

Les services publient des événements de domaine après réussite transactionnelle.
Les listeners Activity et Audit les persistent sans coupler les services métier
à ces consommateurs. Les flux SSE diffusent ensuite les nouvelles entrées aux
clients autorisés.

## Frontend

Le code frontend réside dans `frontend/src/` :

- `api/` contient le client Axios typé et les appels HTTP/SSE.
- `features/` regroupe hooks React Query, formulaires et composants métier.
- `components/` contient les primitives UI, tableaux, timelines et widgets.
- `pages/` compose les écrans routés sans dupliquer les accès réseau.
- `routes/` protège, découpe et précharge les pages.
- `store/` contient les états globaux Zustand : auth, workspace et vue tâches.
- `hooks/` regroupe les comportements réutilisables et la persistance de page.
- `layouts/` fournit Sidebar, Topbar, navigation mobile et contenu principal.
- `types/` formalise tous les contrats TypeScript en mode strict.

React Query est la source de vérité des données serveur. Zustand est réservé à
l'état de session et aux préférences de navigation. Les mutations invalident les
clés concernées et utilisent des mises à jour optimistes uniquement lorsqu'un
rollback fiable est possible.

## Données et sécurité

- PostgreSQL stocke les données relationnelles, préférences, événements et logs.
- Alembic est l'unique mécanisme d'évolution du schéma.
- Les UUID identifient les ressources publiques.
- Le soft delete masque les ressources sans perdre leur traçabilité.
- Les mots de passe sont hachés avec Argon2 ; les tokens sont signés en HS256.
- Chaque accès workspace passe par les permissions centralisées.
- Les ressources étrangères restent masquées avec une réponse 404 lorsque requis.

## Infrastructure

`docker-compose.yml` orchestre quatre services sur `taskminer_network` :

- `postgres` avec volume de données persistant et healthcheck `pg_isready` ;
- `backend` construit depuis Python 3.12 et démarré après PostgreSQL ;
- `frontend` construit avec Node 22 puis servi par nginx non privilégié ;
- `nginx` expose l'application, l'API, Swagger et les healthchecks sur le port 80.

Les images statiques frontend sont mises en cache, tandis que les routes SPA
retombent sur `index.html`. Les dépendances Compose utilisent les healthchecks
afin d'éviter un démarrage dans un état partiellement disponible.

## Principes structurants

- Aucun accès SQLAlchemy depuis les endpoints.
- Aucune dépendance HTTP dans les repositories.
- Aucun secret dans le code ou les images Docker.
- Aucun état serveur dupliqué dans Zustand.
- Contrats d'entrée stricts avec champs supplémentaires interdits.
- Pages importantes chargées à la demande, puis préchargées au survol ou focus.
- Composants partagés responsables de l'accessibilité et des micro-interactions.
- Toute évolution métier doit être testée aux niveaux service, API et interface.
