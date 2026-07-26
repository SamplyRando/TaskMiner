# Architecture de TaskMiner

## Vue d'ensemble

TaskMiner suit une architecture en couches. FastAPI porte l'interface HTTP,
les schémas Pydantic définissent les contrats de données, les services
accueilleront les cas d'usage, les repositories isoleront la persistance et
SQLAlchemy représente le modèle relationnel. Au Sprint 4, les couches sont en
place, mais les opérations métier et les requêtes CRUD ne sont pas encore
implémentées.

L'application s'exécute dans quatre conteneurs reliés à un réseau Docker
unique : nginx, frontend, backend et PostgreSQL.

## Schéma logique

```text
                         Client HTTP
                              |
                              v
                     +-----------------+
                     |      nginx      |
                     | reverse proxy   |
                     +--------+--------+
                              |
                 +------------+------------+
                 |                         |
                 v                         v
        +-----------------+       +-----------------+
        | Frontend React  |       | Backend FastAPI |
        |  placeholder    |       |    /api/v1      |
        +-----------------+       +--------+--------+
                                          |
                   +----------------------v----------------------+
                   | API -> Schemas -> Services -> Repositories  |
                   +----------------------+----------------------+
                                          |
                                          v
                                  +---------------+
                                  |  SQLAlchemy   |
                                  |    Models     |
                                  +-------+-------+
                                          |
                                          v
                                  +---------------+
                                  |  PostgreSQL   |
                                  +---------------+
```

Les flèches entre API, services et repositories décrivent la direction cible
des dépendances. Les endpoints métier sont encore des placeholders et ne
parcourent donc pas cette chaîne actuellement.

## Backend

Le code Python se trouve dans `backend/app/` :

- `main.py` crée l'application FastAPI, conserve les routes système et monte
  le router versionné sous `/api/v1`.
- `api/` contient la couche HTTP.
  - `deps.py` expose la dépendance de session SQLAlchemy typée.
  - `v1/router.py` centralise les routers de la version 1.
  - `v1/endpoints/` contient les modules `users`, `projects` et `tasks`.
- `core/` regroupe la configuration applicative et le logging.
- `database/` configure le moteur SQLAlchemy, la fabrique de sessions, la
  classe déclarative `Base` et la dépendance de session.
- `models/` contient les entités SQLAlchemy, leurs relations et les enums
  persistés.
- `schemas/` contient les modèles Pydantic d'entrée et de sortie. Les contrats
  Create, Update et Read sont séparés.
- `repositories/` définit les signatures des futures opérations de
  persistance. Aucune requête n'y est encore implémentée.
- `services/` est réservé aux cas d'usage. Les classes actuelles reçoivent
  seulement leur repository.
- `utils/` accueillera uniquement de petits utilitaires transversaux lorsqu'ils
  seront nécessaires.

## Migrations

Le dossier `backend/alembic/` contient l'environnement et les versions de
migration. Alembic utilise `Base.metadata` et importe `app.models` pour comparer
le schéma SQLAlchemy au schéma PostgreSQL.

## Frontend

Le dossier `frontend/` contient actuellement un placeholder React servi par
Vite sur le port 3000. Il confirme le fonctionnement de la chaîne Docker, mais
ne constitue pas encore l'interface produit.

## Infrastructure

- `docker-compose.yml` orchestre les quatre services.
- `docker/nginx/nginx.conf` configure le reverse proxy.
- `backend/Dockerfile` construit une image Python 3.12 non-root.
- `frontend/Dockerfile` construit le placeholder React.
- Le réseau `taskminer_network` permet la résolution des services par leur nom.
- Le volume `taskminer_postgres_data` conserve les données PostgreSQL.

## Principes structurants

- Les endpoints délégueront aux services et ne porteront pas de logique métier.
- Les services ne dépendront pas des détails HTTP.
- Les repositories concentreront les accès à SQLAlchemy.
- Les schémas Pydantic resteront distincts des modèles de persistance.
- Toute évolution du schéma sera livrée par une migration Alembic réversible.
