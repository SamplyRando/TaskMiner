# TaskMiner

[![Backend CI](https://github.com/SamplyRando/TaskMiner/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/SamplyRando/TaskMiner/actions/workflows/backend-ci.yml)

TaskMiner est un SaaS de pilotage collaboratif de projets. Il réunit workspaces,
permissions, invitations, projets, tâches, commentaires, pièces jointes,
activité temps réel, audit et indicateurs décisionnels dans une interface React
responsive.

## Points forts

- Authentification JWT avec hachage Argon2 et isolation stricte des workspaces.
- Rôles `owner`, `admin`, `member` et `viewer` avec permissions centralisées.
- CRUD complet des projets et tâches, assignation, commentaires et pièces jointes.
- Recherche, filtres, tri, pagination, soft delete et journalisation métier.
- Vues Liste et Kanban avec mise à jour optimiste et drag-and-drop accessible.
- Activity Feed et Audit Log temps réel via Server-Sent Events.
- Dashboard analytique, préférences persistées et paramètres de sécurité.
- Interface light/dark, responsive, accessible et préparée à l'installation PWA.
- Suite de tests backend/frontend, lint, typage strict, migrations et CI GitHub.

## Architecture

```text
Navigateur
   │
   ├──► Vercel ── React 19 / Vite
   │                ├─ React Router + React Query
   │                └─ Zustand + Axios
   │
   └──► Railway ─ FastAPI / Uvicorn / SSE
                     │
                     ├─ API → Services → Repositories → SQLAlchemy 2
                     ├─ Domain Events → Activity / Audit
                     └─ Alembic ──► Neon PostgreSQL
```

La description détaillée des couches et des flux se trouve dans
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Swagger est disponible sur
`/docs` lorsque l'environnement est démarré.

## Démarrage rapide avec Docker

Docker reste disponible uniquement pour le développement local. Le déploiement
de production utilise Vercel, Railway et Neon et ne dépend pas de Compose.

Le guide de mise en production en moins de dix minutes est disponible dans
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Prérequis pour l'environnement local : Docker Engine avec Docker Compose v2.

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose ps
```

Remplacez les secrets d'exemple de `.env` avant tout déploiement. Une fois les
healthchecks validés :

| Service | URL |
| --- | --- |
| Application via nginx | <http://localhost> |
| Frontend direct | <http://localhost:3000> |
| Backend direct | <http://localhost:8000> |
| Swagger | <http://localhost/docs> |
| Santé backend | <http://localhost/health> |

Commandes d'exploitation courantes :

```bash
docker compose logs -f
docker compose down
docker compose up -d --build
```

Les volumes PostgreSQL et stockage préservent les données lors d'un
`docker compose down`. L'option `--volumes` les supprime et ne doit être utilisée
que lorsque cette perte de données est volontaire.

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | URL SQLAlchemy PostgreSQL du backend |
| `MIGRATION_DATABASE_URL` | URL Neon directe réservée à Alembic |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Initialisation PostgreSQL |
| `SECRET_KEY` | Signature des JWT, 32 caractères minimum |
| `ALGORITHM` | Algorithme JWT, actuellement `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de validité du token d'accès |
| `STORAGE_PATH` | Répertoire persistant des pièces jointes |
| `TASKMINER_LOG_LEVEL` | Niveau de logs backend |
| `VITE_API_URL` | Base URL de l'API côté frontend |
| `CORS_ORIGINS` | Origines frontend autorisées, séparées par des virgules |
| `CORS_ORIGIN_REGEX` | Expression régulière optionnelle pour les previews Vercel |
| `BACKEND_PORT`, `FRONTEND_PORT`, `NGINX_PORT` | Ports publiés par Compose |

Les fichiers `.env` ne sont jamais versionnés. Les exemples présents à la
racine, dans `backend/` et dans `frontend/` ne contiennent aucun secret réel.

## Développement local

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Node.js 22.12 ou supérieur est requis. En développement Vite, `/api` est
proxifié vers le backend local.

## Qualité et tests

```bash
cd backend
pytest
ruff check .
ruff format --check .
mypy .
alembic check

cd ../frontend
npm run format:check
npm run lint
npm run typecheck
CI=true npm run test -- --run
npm run build
```

Le workflow GitHub Actions reproduit les validations backend sur chaque push
vers `main` ou `develop` et sur chaque pull request.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Base de données](docs/DATABASE.md)
- [Sécurité](docs/SECURITY.md)
- [Contribution](docs/CONTRIBUTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](docs/CHANGELOG.md)
- [Déploiement Vercel, Railway et Neon](docs/DEPLOYMENT.md)
